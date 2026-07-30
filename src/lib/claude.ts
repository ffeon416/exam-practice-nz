import type { GraphData } from "./types";

// Three ways to call Claude:
// 1. ANTHROPIC_API_KEY set → use the real Anthropic API (production w/ API key)
// 2. CLAUDE_PROXY_URL set → use a custom OpenAI-compatible proxy (e.g. ngrok tunnel
//    to your local machine, lets production use your Claude subscription)
// 3. Neither set → fall back to http://localhost:3456 (local development)
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_PROXY_URL = "http://localhost:3456/v1/chat/completions";

// Model selection — use cheaper Haiku for simple marking, Sonnet for complex tasks
// When calling the local proxy, simple names work. When calling the real Anthropic
// API directly, dated names are needed.
const isProxy = !process.env.ANTHROPIC_API_KEY;
const MODEL_FAST = isProxy ? "claude-haiku-4" : "claude-haiku-4-5-20251001";
const MODEL_SMART = isProxy ? "claude-sonnet-4" : "claude-sonnet-4-5-20250929";

// Per-million-token prices in USD (Anthropic public list, Apr 2026).
// Keep these in sync with https://www.anthropic.com/pricing
const MODEL_PRICING: Record<string, { inPerM: number; outPerM: number }> = {
  "claude-haiku-4-5-20251001": { inPerM: 0.8, outPerM: 4 },
  "claude-haiku-4": { inPerM: 0.8, outPerM: 4 },
  "claude-sonnet-4-5-20250929": { inPerM: 3, outPerM: 15 },
  "claude-sonnet-4": { inPerM: 3, outPerM: 15 },
};

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function zeroUsage(model: string = MODEL_FAST): Usage {
  return { model, inputTokens: 0, outputTokens: 0, costUsd: 0 };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    // Prefer the non-empty model id; callers aggregate across the same call path
    model: a.model || b.model,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costUsd: a.costUsd + b.costUsd,
  };
}

function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[MODEL_FAST];
  return (inputTokens * p.inPerM + outputTokens * p.outPerM) / 1_000_000;
}

// Prompt-caching-aware cost. Cache writes bill at 1.25× input, cache reads at
// 0.1× input (Anthropic ephemeral cache pricing). `inputTokens` here is the
// uncached remainder only.
function computeCostCached(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number
): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[MODEL_FAST];
  return (
    (inputTokens * p.inPerM +
      cacheWriteTokens * p.inPerM * 1.25 +
      cacheReadTokens * p.inPerM * 0.1 +
      outputTokens * p.outPerM) /
    1_000_000
  );
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff retry wrapper — retries on network errors, timeouts,
// and 5xx server errors. Won't retry on 4xx client errors.
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; initialDelayMs?: number; label?: string } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const initialDelay = options.initialDelayMs ?? 1500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      // Don't retry on permanent errors
      if (/error 4\d\d/.test(message) && !/error 408/.test(message) && !/error 429/.test(message)) {
        throw err;
      }
      if (attempt === maxAttempts) break;
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`[${options.label ?? "request"}] attempt ${attempt} failed (${message.slice(0, 100)}), retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

interface ChatResult {
  text: string;
  usage: Usage;
}

async function chatCompletionOnce(prompt: string, options: { smart?: boolean; maxTokens?: number; system?: string } = {}): Promise<ChatResult> {
  const model = options.smart ? MODEL_SMART : MODEL_FAST;
  const maxTokens = options.maxTokens ?? 1024;
  const system = options.system;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const proxyUrl = process.env.CLAUDE_PROXY_URL || DEFAULT_PROXY_URL;

  // 1. Real Anthropic API
  if (apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          // A cacheable system prompt: identical across calls, so repeated
          // requests within the cache TTL read it at ~0.1× instead of re-paying.
          ...(system
            ? { system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] }
            : {}),
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "Unknown error");
        throw new Error(`Anthropic API error ${res.status}: ${err}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      if (!text) throw new Error("Empty response from Anthropic API");
      const inputTokens = Number(data.usage?.input_tokens ?? 0);
      const cacheWriteTokens = Number(data.usage?.cache_creation_input_tokens ?? 0);
      const cacheReadTokens = Number(data.usage?.cache_read_input_tokens ?? 0);
      const outputTokens = Number(data.usage?.output_tokens ?? 0);
      if (process.env.LOG_CACHE === "1") {
        console.log(`[cache] model=${model} input=${inputTokens} cacheWrite=${cacheWriteTokens} cacheRead=${cacheReadTokens} output=${outputTokens}`);
      }
      return {
        text,
        usage: {
          model,
          // Total input volume for reporting; cost below applies cache discounts.
          inputTokens: inputTokens + cacheWriteTokens + cacheReadTokens,
          outputTokens,
          costUsd: computeCostCached(model, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens),
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2 & 3. OpenAI-compatible proxy (custom URL or local default)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
  try {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-needed-proxy-auth",
      },
      body: JSON.stringify({
        model,
        // OpenAI-compatible proxies don't support Anthropic prompt caching;
        // pass the system prompt as a system-role message instead.
        messages: system
          ? [{ role: "system", content: system }, { role: "user", content: prompt }]
          : [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      throw new Error(`Proxy error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Empty response from proxy");
    // OpenAI-compat proxies return usage as prompt_tokens / completion_tokens
    const inputTokens = Number(data.usage?.prompt_tokens ?? 0);
    const outputTokens = Number(data.usage?.completion_tokens ?? 0);
    return {
      text,
      usage: { model, inputTokens, outputTokens, costUsd: computeCost(model, inputTokens, outputTokens) },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function chatCompletion(prompt: string, options: { smart?: boolean; maxTokens?: number; system?: string } = {}): Promise<ChatResult> {
  return withRetry(() => chatCompletionOnce(prompt, options), { label: options.smart ? "smart" : "fast" });
}

// Exported so other API routes (e.g. practice-tutor) get the same env-aware
// API/proxy fallback chain instead of hardcoding localhost.
export { chatCompletion };

// ── Deterministic hedge guard ──
// "Hedge answers always score 0" is a hard product rule. The marking prompt
// states it, but prompts are not guarantees — this code-level backstop is.
// Deliberately conservative: it only matches when the ENTIRE answer is a
// hedge/non-answer, never when hedge words appear inside a substantive answer
// (an English response may legitimately contain "probably"). Hedged guesses
// with content ("probably 18") remain the prompt's job.
const HEDGE_FULL_PATTERNS: RegExp[] = [
  /^$/,                                     // blank / whitespace-only (after trim)
  /^idk$/, /^idek$/, /^dunno$/, /^dk$/,
  /^(i\s*)?don'?t\s*know$/,
  /^(i'?m\s*)?not\s*(really\s*)?(sure|certain)$/,
  /^no\s*(idea|clue)$/,
  /^(maybe|perhaps|probably)$/,
  /^(i\s*)?(guess|guessing)$/,
  /^\?+$/, /^-+$/, /^n\/?a$/,
];

export function isHedgeAnswer(raw: string): boolean {
  const normalized = raw
    .replace(/[‘’]/g, "'") // curly → straight apostrophes
    .toLowerCase()
    .trim()
    .replace(/[.!…\s]+$/g, "")       // trailing punctuation/whitespace
    .trim();
  return HEDGE_FULL_PATTERNS.some((re) => re.test(normalized));
}

// Site-wide marking scheme: 1 mark for correct working + 1 mark for the correct
// final answer (max 2). Multiple-choice has no working, so it is marked out of 1
// (the answer mark only). Working and answer marks are awarded independently.
export async function markAnswer(args: {
  questionText: string;
  markingGuide: string;
  answerType?: string;
  studentWorking?: string;
  studentAnswer: string;
}): Promise<{
  workingMark: number | null;
  answerMark: number;
  marksAwarded: number;
  maxMarks: number;
  grade: string;
  feedback: string;
  correctApproach: string;
  examTip: string;
  topicsToReview: string[];
  usage: Usage;
}> {
  const {
    questionText,
    markingGuide,
    answerType,
    studentWorking = "",
    studentAnswer,
  } = args;

  const isMultiChoice = answerType === "multi-choice";
  const maxMarks = isMultiChoice ? 1 : 2;

  // Hard backstop: a pure hedge/blank NEVER earns marks, regardless of what a
  // model might decide — and we don't spend an API call to find that out.
  if (isHedgeAnswer(studentAnswer)) {
    return {
      workingMark: isMultiChoice ? null : 0,
      answerMark: 0,
      marksAwarded: 0,
      maxMarks,
      grade: "not-achieved",
      feedback:
        "No real answer was given — “idk”, “maybe” or a blank always scores 0. In the exam, an honest attempt can still earn the working mark, so always try.",
      correctApproach: markingGuide,
      examTip: "Never leave a question blank — attempt the method even if you're unsure of the final answer.",
      topicsToReview: [],
      usage: zeroUsage(MODEL_FAST),
    };
  }

  const prompt = isMultiChoice
    ? `You are an NCEA examiner marking ONE multiple-choice question. There is no working to show, so award a single mark:

ANSWER MARK (1 mark): award 1 if the student selected the correct option, 0 otherwise. A hedge, guess phrased as uncertain, or blank scores 0.

QUESTION: ${questionText}
CORRECT OPTION / MARKING GUIDE: ${markingGuide}
STUDENT'S SELECTION: ${studentAnswer || "(No answer provided)"}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "answerMark": <0 or 1>,
  "feedback": "<one line: confirm correct, or state the right option and why it's right>",
  "correctApproach": "<the correct option with a one-line reason>",
  "examTip": "<one practical exam tip>",
  "topicsToReview": [<topic slugs only if the student got it wrong>]
}`
    : `You are an NCEA examiner marking ONE exam question. Award TWO independent marks — 1 for working, 1 for the final answer.

WORKING MARK (1 mark): award 1 if the student's working shows a valid method that genuinely leads to the correct answer. Any valid method counts — a bare calculation like "3×6=18" is enough; no explanation sentences required, one line is fine if one step solves it. If the question needs no working (simple recall/definition), award this mark when the answer itself demonstrates correct understanding. Award 0 if the working is absent, irrelevant, or uses a wrong method.

ANSWER MARK (1 mark): award 1 if the final answer is correct in ANY equivalent form ("18", "18 chicks", "eighteen", "≈18" all count). Award 0 if it is wrong, missing, or a hedge.

HONESTY RULES — do not break these:
- Wrong is wrong. Never award a mark for an incorrect answer or invalid working, however confident or effortful it looks. No "close enough", no sympathy marks.
- Hedge / non-answers ("idk", "idek", "dunno", "not sure", "don't know", "no idea", "maybe", "perhaps", "probably", "guess", a lone "?", a lone "-", "n/a", blank) score 0 working AND 0 answer.
- Mark ONLY on correctness — spelling, grammar, punctuation, capitalisation, wording, length and notation NEVER affect either mark (unless the question is specifically about spelling).
- The two marks are independent: valid working + wrong final answer = working mark only; correct answer with no/invalid working = answer mark only.

QUESTION: ${questionText}
MARKING GUIDE (reference — the student may phrase the answer differently): ${markingGuide}
STUDENT'S WORKING: ${studentWorking || "(none provided)"}
STUDENT'S FINAL ANSWER: ${studentAnswer || "(No answer provided)"}

For "correctApproach": give the clean, verified step-by-step solution ending in the correct final answer. Verify every arithmetic step. If the marking guide itself is wrong, silently fix it — never propagate an error to the student.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "workingMark": <0 or 1>,
  "answerMark": <0 or 1>,
  "feedback": "<encouraging in tone but honest in content. If correct, say so and note the good method. If wrong, name the actual mistake and how to fix it — never validate a wrong answer.>",
  "correctApproach": "<verified step-by-step solution ending in the correct final answer>",
  "examTip": "<one practical exam technique tip>",
  "topicsToReview": [<topic slugs only if the student lost a mark>]
}`;

  // 0/1 coercion — accept number, numeric string, or boolean; anything else → 0.
  const bit = (v: unknown): number =>
    v === 1 || v === "1" || v === true ? 1 : 0;

  // Use fast model for marking — it's basically checking, not generating.
  // chatCompletion has built-in retry, so this rarely fails.
  let usage: Usage = zeroUsage(MODEL_FAST);
  try {
    const { text, usage: u } = await chatCompletion(prompt, { smart: false });
    usage = u;
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const answerMark = bit(parsed.answerMark);
    const workingMark = isMultiChoice ? null : bit(parsed.workingMark);
    const marksAwarded = answerMark + (workingMark ?? 0);
    const grade =
      marksAwarded >= maxMarks
        ? "excellence"
        : marksAwarded > 0
        ? "achieved"
        : "not-achieved";

    return {
      workingMark,
      answerMark,
      marksAwarded,
      maxMarks,
      grade,
      feedback: parsed.feedback || "Your answer has been recorded.",
      correctApproach: parsed.correctApproach || markingGuide,
      examTip: parsed.examTip || "Always show your working clearly.",
      topicsToReview: Array.isArray(parsed.topicsToReview) ? parsed.topicsToReview : [],
      usage,
    };
  } catch (err) {
    // Parse failure → 0 marks (never partial credit on a fallback) + self-mark.
    console.error("Marking fallback triggered:", err);
    return {
      workingMark: isMultiChoice ? null : 0,
      answerMark: 0,
      marksAwarded: 0,
      maxMarks,
      grade: "not-achieved" as const,
      feedback: "We had trouble auto-marking this one. Compare your answer with the marking guide below — if you got it right, mark it yourself.",
      correctApproach: markingGuide,
      examTip: "Always show your working clearly.",
      topicsToReview: [],
      usage,
    };
  }
}

// ── Multi-pass English essay marking ──
// Evaluates an essay across thesis/structure, evidence, and language/style in
// three parallel smart-model passes, then synthesises overall feedback in a
// fourth pass. Each dimension is scored 0–2; the three are summed (max 6) and
// then rescaled to the question's actual marks total.

type EssayDimensionResult = { score: number; feedback: string };

function safeParseJson<T>(raw: string, fallback: T): T {
  // Strip markdown code fences if the model wrapped the response despite
  // being told not to, then attempt to parse. Return fallback on failure so
  // one bad pass doesn't take down the whole request.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function markEssayDimension(
  dimension: "thesis" | "evidence" | "language",
  questionText: string,
  markingGuide: string,
  studentEssay: string
): Promise<EssayDimensionResult & { usage: Usage }> {
  const dimensionPrompts: Record<typeof dimension, { title: string; rubric: string }> = {
    thesis: {
      title: "THESIS AND STRUCTURE",
      rubric: `Evaluate the essay's argument and organisation:
- Is there a clear, defensible thesis that responds directly to the question?
- Is the argument developed logically across the essay?
- Do paragraphs have topic sentences, coherent structure, and clear transitions?
- Is there a sense of introduction, body, and conclusion (even if brief)?

Scoring:
- 2 = Clear thesis, tightly structured argument, logical development throughout
- 1 = Thesis present but underdeveloped OR structure uneven / some paragraphs off-topic
- 0 = No clear thesis, disorganised, or doesn't address the question`,
    },
    evidence: {
      title: "USE OF EVIDENCE AND QUOTATIONS",
      rubric: `Evaluate how the student supports their argument:
- Are specific quotations or textual references used?
- Are they integrated smoothly into sentences (not just dropped in)?
- Are they clearly linked back to the thesis / point being made?
- Is the evidence accurate and relevant to the question?

Scoring:
- 2 = Well-chosen, accurate quotes/references, smoothly integrated, clearly linked to argument
- 1 = Some evidence used but unevenly — may be dropped in, partial, or loosely connected
- 0 = Little or no textual evidence, or evidence is inaccurate / irrelevant`,
    },
    language: {
      title: "LANGUAGE ANALYSIS AND STYLE",
      rubric: `Evaluate the student's analytical and stylistic skill:
- Does the student analyse HOW language/techniques create meaning (not just identify them)?
- Is literary/technical vocabulary used accurately (metaphor, symbolism, tone, etc.)?
- Is the student's own prose clear, controlled, and appropriate for an essay?
- Does the analysis go beyond surface-level observations?

Scoring:
- 2 = Insightful analysis of HOW techniques work, accurate terminology, polished prose
- 1 = Identifies techniques but analysis is shallow OR prose is uneven
- 0 = Only describes/retells, misuses terminology, or prose obscures meaning`,
    },
  };

  const { title, rubric } = dimensionPrompts[dimension];

  const prompt = `You are an experienced NCEA English examiner marking ONE dimension of a student essay. Be fair but rigorous — like a teacher who wants the student to grow.

DIMENSION: ${title}

${rubric}

ESSAY QUESTION:
${questionText}

MARKING GUIDE (reference — the essay need not match it word-for-word):
${markingGuide}

STUDENT ESSAY:
${studentEssay || "(No essay submitted)"}

Focus ONLY on the dimension above. Ignore the other dimensions for now — they are marked separately.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "score": <integer 0, 1, or 2>,
  "feedback": "<2-3 sentence specific, actionable feedback on THIS dimension only. Quote briefly from the essay if useful.>"
}`;

  const { text, usage } = await chatCompletion(prompt, { smart: true, maxTokens: 600 });
  const parsed = safeParseJson<EssayDimensionResult>(text, {
    score: 0,
    feedback: "Unable to evaluate this dimension — please try again.",
  });
  // Clamp score to 0..2 in case the model returns something odd
  const score = Math.max(0, Math.min(2, Math.round(Number(parsed.score) || 0)));
  return { score, feedback: String(parsed.feedback ?? ""), usage };
}

export async function markEnglishEssay(
  questionText: string,
  markingGuide: string,
  marks: number,
  studentEssay: string
): Promise<{
  marksAwarded: number;
  grade: "not-achieved" | "achieved" | "merit" | "excellence";
  overallFeedback: string;
  thesisAndStructure: { score: number; feedback: string };
  evidenceUse: { score: number; feedback: string };
  languageAndStyle: { score: number; feedback: string };
  improvements: string[];
  usage: Usage;
}> {
  // Run the three dimension passes in parallel — they are independent.
  const [thesisAndStructure, evidenceUse, languageAndStyle] = await Promise.all([
    markEssayDimension("thesis", questionText, markingGuide, studentEssay),
    markEssayDimension("evidence", questionText, markingGuide, studentEssay),
    markEssayDimension("language", questionText, markingGuide, studentEssay),
  ]);

  // Pass 4: synthesise — give the model the three per-dimension results and
  // ask for overall feedback + three concrete improvements.
  const synthesisPrompt = `You are an experienced NCEA English examiner writing the overall report on a student essay. Three dimensions have already been marked separately — your job is to synthesise them into encouraging, actionable overall feedback and three specific improvements.

ESSAY QUESTION:
${questionText}

STUDENT ESSAY:
${studentEssay || "(No essay submitted)"}

DIMENSION RESULTS:
1. Thesis & Structure — ${thesisAndStructure.score}/2
   ${thesisAndStructure.feedback}
2. Use of Evidence — ${evidenceUse.score}/2
   ${evidenceUse.feedback}
3. Language & Style — ${languageAndStyle.score}/2
   ${languageAndStyle.feedback}

Write:
- An "overallFeedback" paragraph (3–5 sentences): warm but honest summary of what the student did well and where the essay sits overall. Reference the dimension scores naturally.
- Exactly THREE "improvements": specific, concrete things the student should do NEXT TIME. Each one should be actionable (not "write better"). Aim improvements at the weakest dimensions first.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "overallFeedback": "<3-5 sentences>",
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}`;

  const { text: synthesisText, usage: synthesisUsage } = await chatCompletion(
    synthesisPrompt,
    { smart: true, maxTokens: 600 }
  );
  const synthesis = safeParseJson<{ overallFeedback: string; improvements: string[] }>(
    synthesisText,
    {
      overallFeedback:
        "Your essay has been marked across three dimensions. See the per-dimension feedback above for specific comments.",
      improvements: [
        "Develop a clearer thesis that directly answers the question.",
        "Support each point with a specific quotation from the text.",
        "Analyse HOW language techniques create meaning, not just that they are used.",
      ],
    }
  );

  // Aggregate token usage across the 4 passes (3 dimensions + synthesis)
  const totalUsage: Usage = [
    thesisAndStructure.usage,
    evidenceUse.usage,
    languageAndStyle.usage,
    synthesisUsage,
  ].reduce(addUsage, zeroUsage(MODEL_SMART));

  // Total raw score out of 6, rescaled to the question's mark total.
  const rawTotal = thesisAndStructure.score + evidenceUse.score + languageAndStyle.score;
  const marksAwarded = Math.round((rawTotal / 6) * marks);

  // Grade based on proportion of raw total (0–6).
  let grade: "not-achieved" | "achieved" | "merit" | "excellence";
  if (rawTotal <= 1) grade = "not-achieved";
  else if (rawTotal <= 3) grade = "achieved";
  else if (rawTotal <= 4) grade = "merit";
  else grade = "excellence";

  // Clamp improvements to exactly three entries (pad or trim).
  const improvements = Array.isArray(synthesis.improvements)
    ? synthesis.improvements.slice(0, 3)
    : [];
  while (improvements.length < 3) {
    improvements.push("Keep practising — review the dimension feedback above.");
  }

  return {
    marksAwarded,
    grade,
    overallFeedback: String(synthesis.overallFeedback ?? ""),
    thesisAndStructure: { score: thesisAndStructure.score, feedback: thesisAndStructure.feedback },
    evidenceUse: { score: evidenceUse.score, feedback: evidenceUse.feedback },
    languageAndStyle: { score: languageAndStyle.score, feedback: languageAndStyle.feedback },
    improvements,
    usage: totalUsage,
  };
}

// ── Shared rules for AI generation about graphs/charts/tables/diagrams ──
// Students sit the exam on a screen with a keyboard — they can SEE embedded
// graphs but CANNOT draw or upload. Every visual a question refers to must be
// included in the question itself as a `graph` JSON object. Injected verbatim
// into the prompts for generatePracticeQuestion and generatePracticePaper.
const GRAPH_RULES = `═══════════════════════════════════════════════════════════
GRAPHS, CHARTS, TABLES, AND DIAGRAMS — STRICT RULES
═══════════════════════════════════════════════════════════
Students take this exam on a screen with a keyboard. They can SEE graphs you embed in a question, but they CANNOT draw or upload anything. Every visual a question refers to MUST be embedded in the question itself, in the optional \`graph\` field, with data that EXACTLY matches what the question is asking about.

ABSOLUTE RULES:
1. If a question would benefit from OR requires a graph/chart/table/diagram to be answered or interpreted, INCLUDE the \`graph\` field. Never reference a visual ("the graph above", "the chart", "the table", "the diagram", "the figure", "as shown", "from the graph", "use the graph", "interpret the chart", "in the diagram") without ALSO providing it as a \`graph\` object.
2. Never instruct the student to draw, sketch, plot, or construct anything (graph, chart, diagram, curve, line of best fit, parabola, points, histogram, axes, number line). Students cannot draw. Reframe the task as "identify", "calculate", "describe", "determine", "compare", or "interpret" — using a graph YOU provide.
3. The graph you provide must be EXACTLY what the question needs:
   - Numeric values on the graph match numeric values in the question (e.g. if the question says "the supply curve passes through (2, 4) and (8, 16)", those exact points must lie on your series)
   - Labels (axis labels, units, series names, titles) match what the question discusses
   - For "shift" / "before vs after" questions: include BOTH curves as separate series (e.g. "Demand 2023" and "Demand 2024", or "Supply" and "New Supply")
   - For equilibrium / intersection questions: the two curves must actually cross at the stated equilibrium point
   - For function graphs (parabolas, exponentials, trig): use ≥15 xValues across the domain so the curve looks smooth
   - For data interpretation: every figure the question asks the student to read off must be present on the graph
4. Choose the right \`type\` for the data:
   - line — continuous data, functions, time-series, supply/demand, motion graphs, titration curves
   - bar — categorical comparisons, climate (monthly rainfall), population pyramids
   - pie — parts of a whole (only with ≥2 slices summing to a meaningful whole)
   - scatter — independent (x,y) pairs for correlation/regression
   - box-plot — five-number summaries (min, Q1, median, Q3, max — EXACTLY 5 entries in that order)
   - histogram — binned frequencies (labels are bin ranges)
   - table — structured rows / multi-column data (financial statements, dates, raw frequencies)
   - number-line — intervals, inequalities, single points on a 1D line

WHEN A GRAPH IS LIKELY NEEDED (by subject):
- Economics: supply & demand, market equilibrium, shifts in S/D, PPF, AD/AS, cost curves (MC, AVC, ATC), Lorenz curves, GDP/CPI/inflation time-series.
- Statistics: descriptive distributions (histogram, box-plot), bivariate (scatter + regression), two-way frequency (table), time-series (line).
- Mathematics / calculus: function graphs (parabola, cubic, exponential, log, trig), inequalities on a number line, vector/coordinate diagrams.
- Physics: motion (d–t, v–t, a–t), force–extension, wave displacement–time, current–voltage, projectile trajectories.
- Chemistry: titration curves, reaction rate vs time, energy profile diagrams, concentration vs time.
- Biology: population growth, enzyme rate vs temperature/pH, predator–prey curves, allele frequency over generations.
- Geography: climographs (monthly rainfall bar chart), population pyramids (bar), demographic tables.
- Accounting / business: income statements, balance-sheet extracts, ratios, year-over-year comparisons → table.
- Health / social-studies / media-studies / classical-studies / art-history / business-studies: survey results, frequency tables → bar or table.
- English / history / te-reo: usually no graph; a table of dates, events, characters, or short text extracts can occasionally help.
NEVER attempt maps — there is no map renderer. Reframe map questions as data tables or text descriptions.

GRAPH DATA SCHEMA — copy these shapes exactly. Property names use double quotes. Numbers must be numbers, not strings.

bar:
{"type":"bar","title":"...","xLabel":"...","data":[{"label":"A","value":12},{"label":"B","value":18}]}

line (functions / time-series / multi-series like supply+demand):
{"type":"line","title":"...","xLabel":"Quantity","yLabel":"Price ($)","xValues":[0,2,4,6,8,10],"series":[{"name":"Demand","values":[10,8,6,4,2,0]},{"name":"Supply","values":[0,2,4,6,8,10]}]}
For smooth function curves (parabolas, exponentials), use 15–30 xValues across the relevant domain.

pie:
{"type":"pie","title":"...","data":[{"label":"A","value":40},{"label":"B","value":60}]}

scatter:
{"type":"scatter","title":"...","xLabel":"x","yLabel":"y","data":[[1,2.3],[2,4.1],[3,5.8],[4,7.9]]}

box-plot (EXACTLY 5 entries in order: min, Q1, median, Q3, max):
{"type":"box-plot","title":"...","xLabel":"...","data":[{"label":"min","value":4},{"label":"Q1","value":7},{"label":"median","value":10},{"label":"Q3","value":13},{"label":"max","value":18}]}

histogram (labels are bin ranges):
{"type":"histogram","title":"...","xLabel":"Score","yLabel":"Frequency","data":[{"label":"0–10","value":3},{"label":"10–20","value":7},{"label":"20–30","value":12}]}

table:
{"type":"table","title":"...","data":{"headers":["Year","Revenue","Profit"],"rows":[["2023","$12,000","$3,000"],["2024","$15,000","$4,200"]]}}

number-line (xValues = [leftEnd, rightEnd] of the visible line; data = marked points):
{"type":"number-line","title":"...","xValues":[-5,5],"data":[{"label":"x","value":2}]}

VERIFICATION CHECKLIST — run mentally before submitting each question:
[ ] Does my question text mention a graph/chart/table/diagram/figure/curve? → graph field MUST be present.
[ ] Does the graph data match what the question references? (numbers, labels, scales, direction of shift)
[ ] Did I write "draw", "sketch", "plot", or "construct" anywhere? → rewrite as identify/calculate/describe/interpret.
[ ] For multi-curve scenarios (supply/demand shifts, before/after) — are ALL referenced curves included as separate series?
[ ] Is the \`type\` correct for the data?
[ ] Are the numbers in the graph EXACTLY consistent with the working in markingGuide?`;

// Static system prompt for paper generation. It is byte-identical on EVERY
// generation call (all subjects, levels, batches, and top-ups), so Anthropic
// prompt caching serves it at ~0.1× after the first request within the cache
// TTL. Everything that varies per call (level, subject, topic, count, seed,
// existing-question anchors) lives in the user message — keep it OUT of here,
// or the prefix changes and the cache misses.
const GENERATION_SYSTEM = `You are an expert NZQA / NCEA exam author. You write original practice exam questions and return them as a JSON array — nothing else.

For the set of questions you are asked to write:
- Spread Achievement, Merit, and Excellence difficulty across them.
- Include a mix of multi-choice, calculation, and extended-response styles.
- Use NZ contexts where natural (NZ places, NZD currency, native species, etc.)

CRITICAL — ACCURACY CHECKS (students will memorise these answers):
- For EVERY calculation: show the full working step-by-step in markingGuide, then double-check each arithmetic step is correct before moving on. Verify the final numeric answer matches the working.
- For multi-choice: verify the correct option is genuinely correct and all distractors are plausible but definitively wrong. The expectedAnswer MUST be one of the strings in the options array.
- For science/chemistry/biology: ensure all facts, formulas, and units are scientifically accurate. Check chemical equations are balanced.
- For statistics: verify all statistical calculations (means, standard deviations, confidence intervals, test statistics, p-values) by computing them step by step. Use the correct formula — population SD uses n, sample SD uses n-1. State which you are using.
- For regression: slope b = r × (sy/sx), intercept a = ȳ - b×x̄. Verify by substituting back.
- The expectedAnswer field MUST exactly match the final answer derived in the markingGuide working. If they differ, fix one of them.
- MARKS: every question is worth exactly 2 marks — 1 for correct working and 1 for the correct final answer. The ONLY exception is multi-choice questions, which are worth 1 mark (the answer only — there is no working). So set "marks" to 2 for text/number/working questions and 1 for multi-choice.
- Every question must have non-empty text, expectedAnswer, and markingGuide.
- Question setups must be internally consistent — do not state a result that contradicts the given data.

${GRAPH_RULES}

Respond ONLY with a JSON array (no wrapper object, no markdown, no code fences). Each element is a question object of this shape:
{
  "number": "1",
  "text": "<question text>",
  "marks": <2 for text/number/working questions, 1 for multi-choice>,
  "gradeLevel": "achieved" | "merit" | "excellence",
  "answerType": "text" | "number" | "multi-choice" | "working",
  "options": ["opt1","opt2","opt3","opt4"],
  "expectedAnswer": "<answer — must match the final result of the markingGuide working>",
  "markingGuide": "<step-by-step solution with all working shown>",
  "graph": { /* optional GraphData — INCLUDE whenever the question references a graph/chart/table/diagram. OMIT otherwise. See GRAPH SCHEMA above. */ }
}
Your array MUST contain EXACTLY the number of questions requested in the user message — neither more nor fewer. If you run out of room, prefer shorter markingGuides over fewer questions. Never omit a question.`;

// Detects question text that refers to a visual that wasn't provided, or that
// instructs the student to draw/sketch/plot something they can't actually draw.
function validateGraphReferences(q: { text?: string; graph?: unknown; image?: string }): string[] {
  const issues: string[] = [];
  const text = String(q.text ?? "");
  const visualReferences: RegExp[] = [
    /\bthe\s+(graph|chart|diagram|figure|table|histogram|scatter\s*plot|box[-\s]?plot|number\s*line|pie\s*chart)\b/i,
    /\b(graph|chart|diagram|table|figure)\s+(above|below|to\s+the\s+(right|left)|shown)\b/i,
    /\b(above|below)\s+(shows|illustrates|displays|depicts|gives)\b/i,
    /\bas\s+shown\b/i,
    /\bshown\s+(above|below|in\s+the)\b/i,
    /\bfrom\s+the\s+(graph|chart|table|figure|diagram|histogram|scatter)\b/i,
    /\buse\s+the\s+(graph|chart|table|figure|diagram)\b/i,
    /\binterpret\s+the\s+(graph|chart|table|figure|diagram)\b/i,
    /\bin\s+the\s+(graph|chart|table|figure|diagram)\b/i,
    /\busing\s+the\s+(graph|chart|table|figure|diagram)\b/i,
    /\bcomplete\s+the\s+table\b/i,
  ];
  const references = visualReferences.some((rx) => rx.test(text));
  if (references && !q.graph && !q.image) {
    issues.push("question references a graph/chart/table/diagram but no graph or image is provided");
  }
  const askToDrawPattern =
    /\b(draw|sketch|plot|construct)\s+(?:a\s+|an\s+|the\s+|its\s+|their\s+|your\s+|on\s+(?:the\s+)?)?(?:\w+\s+)?(graph|chart|diagram|curve|histogram|box[-\s]?plot|scatter\s*plot|number\s*line|parabola|hyperbola|function|axes|line\s+of\s+best\s+fit|points?)\b/i;
  if (askToDrawPattern.test(text)) {
    issues.push("question asks the student to draw/sketch/plot — students cannot draw");
  }
  return issues;
}

// Validates that a `graph` object actually matches the shape its `type` expects.
// Returns a list of problems, or an empty array if the graph is well-formed.
function validateGraphShape(graph: unknown): string[] {
  if (!graph || typeof graph !== "object") return ["graph must be an object"];
  const g = graph as Record<string, unknown>;
  const type = g.type;
  const validTypes = ["bar", "line", "pie", "scatter", "box-plot", "histogram", "table", "number-line"];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    return [`graph.type "${String(type)}" is not one of: ${validTypes.join(", ")}`];
  }
  const issues: string[] = [];
  const data = g.data;
  switch (type) {
    case "bar":
    case "pie":
    case "histogram":
    case "number-line": {
      if (!Array.isArray(data) || data.length === 0) {
        issues.push(`${type} graph: data must be a non-empty array of {label,value}`);
        break;
      }
      const okShape = (data as unknown[]).every(
        (d) =>
          d &&
          typeof d === "object" &&
          typeof (d as Record<string, unknown>).label === "string" &&
          typeof (d as Record<string, unknown>).value === "number"
      );
      if (!okShape) issues.push(`${type} graph: every data item must have a string label and numeric value`);
      break;
    }
    case "line": {
      const xValues = g.xValues;
      const series = g.series;
      if (!Array.isArray(xValues) || xValues.length === 0) {
        issues.push("line graph: xValues must be a non-empty array of numbers");
      } else if (!(xValues as unknown[]).every((v) => typeof v === "number")) {
        issues.push("line graph: xValues must all be numbers");
      }
      if (!Array.isArray(series) || series.length === 0) {
        issues.push("line graph: series must be a non-empty array of {name, values}");
      } else {
        const xLen = Array.isArray(xValues) ? xValues.length : 0;
        for (let i = 0; i < (series as unknown[]).length; i++) {
          const s = (series as unknown[])[i] as Record<string, unknown> | null;
          if (!s || typeof s !== "object") {
            issues.push(`line graph: series[${i}] must be an object`);
            continue;
          }
          if (typeof s.name !== "string") issues.push(`line graph: series[${i}].name must be a string`);
          const vals = s.values as unknown;
          if (!Array.isArray(vals) || !(vals as unknown[]).every((v) => typeof v === "number")) {
            issues.push(`line graph: series[${i}].values must be an array of numbers`);
          } else if (xLen && (vals as unknown[]).length !== xLen) {
            issues.push(
              `line graph: series[${i}].values length (${(vals as unknown[]).length}) must equal xValues length (${xLen})`
            );
          }
        }
      }
      break;
    }
    case "scatter": {
      if (!Array.isArray(data) || data.length === 0) {
        issues.push("scatter graph: data must be a non-empty array of [x,y] number pairs");
        break;
      }
      const okPairs = (data as unknown[]).every(
        (p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number"
      );
      if (!okPairs) issues.push("scatter graph: every data entry must be a [x,y] number pair");
      break;
    }
    case "box-plot": {
      if (!Array.isArray(data) || data.length < 5) {
        issues.push("box-plot graph: data must have at least 5 entries (min, Q1, median, Q3, max)");
        break;
      }
      const values = (data as unknown[])
        .slice(0, 5)
        .map((d) => (d && typeof d === "object" ? (d as Record<string, unknown>).value : undefined));
      if (!values.every((v) => typeof v === "number")) {
        issues.push("box-plot graph: every data.value must be a number");
      } else {
        const nums = values as number[];
        for (let i = 1; i < 5; i++) {
          if (nums[i] < nums[i - 1]) {
            issues.push("box-plot graph: values must be non-decreasing (min ≤ Q1 ≤ median ≤ Q3 ≤ max)");
            break;
          }
        }
      }
      break;
    }
    case "table": {
      const t = data as { headers?: unknown; rows?: unknown } | null;
      if (!t || typeof t !== "object") {
        issues.push("table graph: data must be an object with headers and rows");
        break;
      }
      if (!Array.isArray(t.headers) || (t.headers as unknown[]).some((h) => typeof h !== "string")) {
        issues.push("table graph: data.headers must be an array of strings");
      }
      if (
        !Array.isArray(t.rows) ||
        (t.rows as unknown[]).some(
          (r) => !Array.isArray(r) || (r as unknown[]).some((c) => typeof c !== "string")
        )
      ) {
        issues.push("table graph: data.rows must be an array of string arrays");
      }
      break;
    }
  }
  return issues;
}

export async function generatePracticeQuestion(
  topic: string,
  level: number,
  gradeLevel: string
): Promise<{
  text: string;
  marks: number;
  markingGuide: string;
  graph?: GraphData;
  usage: Usage;
}> {
  const prompt = `Generate a single NCEA Level ${level} exam question on the topic "${topic}".

Difficulty level: ${gradeLevel}
Style it exactly like a real NZQA exam question — clear, concise, with context where appropriate.

CRITICAL — ACCURACY CHECKS (students study from this; wrong answers cause real harm):
- Work the question yourself, step by step, before writing the markingGuide
- Show every arithmetic step in markingGuide and verify each one is correct
- The final numeric/text answer derived in markingGuide MUST be reproducible by following its own steps
- For multi-choice, verify the correct option is genuinely correct and distractors are plausible but wrong
- For science/maths: verify formulas, units, balanced equations, valid identities
- For statistics: state n vs n-1 explicitly; verify slope b = r × (sy/sx), intercept a = ȳ - b×x̄ if regression
- Question setups must be internally consistent — never state a number that contradicts the given data
- If your worked example produces a weird/negative/contradictory result, the question is broken — pick different numbers
- Pick numbers that produce clean answers (whole numbers when possible) for clarity

${GRAPH_RULES}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "text": "<the question text>",
  "marks": 2,
  "markingGuide": "<step-by-step worked solution with all arithmetic verified — this is the source of truth>",
  "graph": { /* optional GraphData — INCLUDE whenever the question text references or relies on a graph/chart/table/diagram. OMIT only when no visual is needed. See GRAPH SCHEMA above. */ }
}`;

  // Try up to 2 times. If validation fails on the first attempt we ask again
  // (the second prompt is identical — the model's stochasticity does the work).
  let totalUsage: Usage = zeroUsage(MODEL_SMART);
  let lastIssues: string[] = [];
  let lastParsed: { text?: string; marks?: number; markingGuide?: string; graph?: GraphData } | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { text, usage } = await chatCompletion(prompt, { smart: true });
    totalUsage = addUsage(totalUsage, usage);
    let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(cleaned) as { text?: string; marks?: number; markingGuide?: string; graph?: GraphData };
    lastParsed = parsed;
    const refIssues = validateGraphReferences(parsed);
    const shapeIssues = parsed.graph ? validateGraphShape(parsed.graph) : [];
    lastIssues = [...refIssues, ...shapeIssues];
    if (lastIssues.length === 0) {
      // Same enrichment pass as the full-paper path: add a graph if useful,
      // and recompute line-type values mathematically. See graphEnricher.ts.
      const { enrichQuestionGraphs } = await import("./graphEnricher");
      const stubQuestion = {
        id: "practice-single",
        number: "1",
        text: parsed.text ?? "",
        marks: 2,
        gradeLevel: gradeLevel as "achieved" | "merit" | "excellence",
        topics: [topic],
        answerType: "working" as const,
        markingGuide: parsed.markingGuide ?? "",
        graph: parsed.graph,
      };
      const enriched = await enrichQuestionGraphs(stubQuestion, { subject: topic, level });
      if (enriched.usage) totalUsage = addUsage(totalUsage, enriched.usage);
      const finalParsed = { ...parsed, graph: enriched.question.graph };
      return { ...finalParsed, usage: totalUsage } as { text: string; marks: number; markingGuide: string; graph?: GraphData; usage: Usage };
    }
    console.warn(`[generatePracticeQuestion] attempt ${attempt} graph validation failed:`, lastIssues.join("; "));
  }
  // Final attempt: salvage what we can rather than 500. If the only issue was
  // a malformed `graph` shape, strip it. If the question references a missing
  // visual we still bail — that one's not safe to ship to students.
  if (lastParsed && lastIssues.every((i) => i.startsWith("scatter graph") || i.includes("graph:"))) {
    delete lastParsed.graph;
    return { ...lastParsed, usage: totalUsage } as { text: string; marks: number; markingGuide: string; graph?: GraphData; usage: Usage };
  }
  throw new Error(`Practice question failed graph validation: ${lastIssues.join("; ")}`);
}

// ── AI Tutor Chat ──
// Lets students ask questions and get Socratic-style help
export async function tutorChat(
  question: { text: string; markingGuide: string; expectedAnswer?: string },
  studentMessages: { role: "user" | "assistant"; content: string }[],
  studentAnswerSoFar?: string
): Promise<{ reply: string; usage: Usage }> {
  const history = studentMessages
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are a friendly NCEA tutor helping a student with a practice question. Your goal is to GUIDE them to the answer, not just give it away.

CRITICAL RULES:
1. Never just give the answer — use leading questions and hints
2. Keep responses short (2-4 sentences max)
3. Be encouraging and warm, like a helpful older sibling
4. If they're stuck, give a small hint, then ask what they think
5. If they get something right, celebrate it briefly then move on
6. Use simple language, not jargon
7. If they explicitly give up and ask for the answer after trying, give a step-by-step walkthrough
8. Never lecture — keep it conversational

ACCURACY (do not skip):
- Every formula, calculation, fact, or hint you give MUST be correct
- Mentally verify any arithmetic before sending it
- If the marking guide and your own working disagree, recheck both — never pass on a wrong hint
- Better to say "let me think about that" than guess; never make up a fact
- If asked for the final answer, base it on the marking guide, but verify the steps yourself first

QUESTION THEY'RE WORKING ON:
${question.text}

MARKING GUIDE (for your reference — don't quote directly):
${question.markingGuide}

${studentAnswerSoFar ? `WHAT THEY'VE WRITTEN SO FAR:\n${studentAnswerSoFar}\n` : ""}
CONVERSATION HISTORY:
${history}

Respond as the tutor with just your next message. Keep it short and helpful.`;

  // Haiku 4.5 is fast + cheap and works great for conversational tutoring.
  // chatCompletion has built-in retry. If even that fails, return a friendly message
  // rather than throwing — students should never see a hard error from the tutor.
  try {
    const { text, usage } = await chatCompletion(prompt, { smart: false, maxTokens: 300 });
    if (!text || text.trim().length === 0) {
      return { reply: "Sorry, I lost my train of thought! Can you try asking that again?", usage };
    }
    return { reply: text, usage };
  } catch {
    return {
      reply: "Sorry, I'm having trouble connecting right now. Try asking again in a moment, or check the marking guide below the question.",
      usage: zeroUsage(MODEL_FAST),
    };
  }
}

// ── AI Paper Generation ──
// Generates a full practice paper for a given subject/topic/level
export async function generatePracticePaper(
  subject: string,
  level: number,
  topic: string | null,
  questionCount: number = 8
): Promise<{
  title: string;
  questions: Array<{
    number: string;
    text: string;
    marks: number;
    gradeLevel: "achieved" | "merit" | "excellence";
    answerType: "text" | "number" | "multi-choice" | "working";
    options?: string[];
    expectedAnswer?: string;
    markingGuide: string;
    graph?: GraphData;
  }>;
  usage: Usage;
}> {
  const topicLine = topic ? `Focus on the topic: ${topic}` : `Cover a range of core topics for this subject/level.`;

  // Random seed forces fresh content even if same inputs are given twice
  const seed = Math.random().toString(36).slice(2, 10);

  // Year 10 is pre-NCEA (NZ curriculum / CAA Numeracy foundation work).
  // Levels 1-3 are NCEA proper.
  const levelLabel =
    level === 0
      ? `Year 10 ${subject} (pre-NCEA foundation, aligned with the NZ Curriculum Level 5 and CAA Numeracy standards)`
      : `NCEA ${subject} Level ${level}`;
  const styleLabel =
    level === 0
      ? `Match the style, difficulty, and question types of NZ Year 10 end-of-year assessments and CAA Numeracy papers (NOT NCEA — Year 10 students do not sit NCEA).`
      : `Match the style, difficulty, and question types of real NZQA ${subject} exams.`;
  // The title is deterministic, so we build it in code rather than asking the
  // model for it — this lets every generation call return a bare JSON array of
  // questions (faster to stream/parse) instead of a wrapper object.
  const subjectLabel = subject[0].toUpperCase() + subject.slice(1);
  const title =
    level === 0
      ? `Year 10 ${subjectLabel} Practice Paper`
      : `NCEA ${subjectLabel} Level ${level} Practice Paper`;

  // Per-question validation, used both on initial generation and on top-ups.
  // Returns a list of human-readable issues; empty list means the question is good.
  // NOTE: may mutate `q` by stripping a malformed graph when the text doesn't
  // require one (same behaviour as the original inline logic).
  const validateQuestion = (q: {
    number?: string;
    text?: string;
    marks?: number;
    gradeLevel?: string;
    answerType?: string;
    options?: string[];
    expectedAnswer?: string;
    markingGuide?: string;
    graph?: unknown;
    image?: string;
  }): string[] => {
    const issues: string[] = [];

    if (!q.text || typeof q.text !== "string" || q.text.trim().length === 0) {
      issues.push("missing or empty question text");
    }
    if (!q.markingGuide || typeof q.markingGuide !== "string" || q.markingGuide.trim().length === 0) {
      issues.push("missing or empty markingGuide");
    }
    if (!q.expectedAnswer || typeof q.expectedAnswer !== "string" || q.expectedAnswer.trim().length === 0) {
      issues.push("missing or empty expectedAnswer");
    }
    // Uniform marking scheme: 2 marks (1 working + 1 answer), 1 for multi-choice.
    // Coerce rather than reject so a stray `marks` value never fails validation
    // and shrinks the paper (see the exact-count guarantee).
    q.marks = q.answerType === "multi-choice" ? 1 : 2;
    if (!["achieved", "merit", "excellence"].includes(q.gradeLevel ?? "")) {
      issues.push(`invalid gradeLevel: ${q.gradeLevel}`);
    }
    if (!["text", "number", "multi-choice", "working"].includes(q.answerType ?? "")) {
      issues.push(`invalid answerType: ${q.answerType}`);
    }
    if (q.answerType === "multi-choice") {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        issues.push(`multi-choice must have exactly 4 options, got ${Array.isArray(q.options) ? q.options.length : 0}`);
      } else {
        const answer = (q.expectedAnswer ?? "").trim();
        const isOptionText = q.options.some(
          (opt: string) => opt.trim().toLowerCase() === answer.toLowerCase()
        );
        const isLetter = /^[A-Da-d]\.?$/.test(answer);
        if (!isOptionText && !isLetter) {
          issues.push(`expectedAnswer "${answer.slice(0, 50)}" does not match any option or A-D letter`);
        }
      }
    }
    if (q.answerType === "number") {
      const numVal = Number(q.expectedAnswer?.replace(/[^0-9.\-]/g, ""));
      if (isNaN(numVal)) {
        issues.push(`numeric answer is not parseable: "${q.expectedAnswer}"`);
      }
    }
    issues.push(...validateGraphReferences(q as { text?: string; graph?: unknown; image?: string }));
    if (q.graph) {
      const shapeIssues = validateGraphShape(q.graph);
      if (shapeIssues.length > 0) {
        const refIssues = validateGraphReferences({ text: q.text, image: q.image });
        const textNeedsGraph = refIssues.some((m) => m.includes("references a graph"));
        if (textNeedsGraph) {
          issues.push(...shapeIssues);
        } else {
          console.warn(
            `[generatePracticePaper] Stripping malformed graph from Q${q.number}:`,
            shapeIssues.join("; ")
          );
          delete q.graph;
        }
      }
    }
    return issues;
  };

  type GenQuestion = {
    number: string;
    text: string;
    marks: number;
    gradeLevel: string;
    answerType: string;
    options?: string[];
    expectedAnswer?: string;
    markingGuide: string;
    graph?: unknown;
    image?: string;
  };

  // ── Shared batch prompt ──
  // Every parallel batch AND every top-up call gets the SAME accuracy / marks /
  // graph rules, so output quality is identical no matter how the paper is
  // sliced up. `want` = how many questions this call returns; `existingSummary`
  // lists questions already in the paper so the model won't duplicate them
  // (empty for the first parallel wave); `batchSeed` forces fresh content;
  // `roleNote` says whether this is one slice of a parallel paper or a top-up.
  // Dynamic per-call USER message only. All the fixed rules + JSON schema live
  // in the cached `GENERATION_SYSTEM`; keep them out of here so the cached
  // prefix stays byte-identical and every call after the first reads it cheaply.
  const buildBatchPrompt = (
    want: number,
    existingSummary: string,
    batchSeed: string,
    roleNote: string
  ): string => `Write ${want} practice exam question${want === 1 ? "" : "s"} for ${levelLabel}.
${topicLine}
${styleLabel}
${roleNote}
Variation seed: ${batchSeed} — generate completely original questions.
${existingSummary ? `\nDo NOT duplicate, paraphrase, or closely mirror any of these questions already in the paper — pick different sub-topics, scenarios, and numeric values:\n${existingSummary}\n` : ""}
Return a JSON array of EXACTLY ${want} question object${want === 1 ? "" : "s"}, following the schema and rules in the system prompt.`;

  // Extract a JSON array of questions from a model response (tolerates code
  // fences / surrounding prose). Throws if no array is present.
  //
  // LLM JSON for maths/science breaks JSON.parse most often via (a) LaTeX
  // backslashes (`\frac`, `\(`, `\times`) that aren't valid JSON escapes, and
  // (b) trailing commas. So if a strict parse fails we apply a targeted repair
  // and try once more before giving up — far cheaper than re-calling the model.
  const parseQuestionArray = (text: string): unknown[] => {
    let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart < 0 || arrEnd <= arrStart) throw new Error("response missing JSON array");
    cleaned = cleaned.slice(arrStart, arrEnd + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const repaired = cleaned
        // Escape lone backslashes that aren't a valid JSON escape (LaTeX, etc.)
        .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
        // Drop trailing commas before a closing ] or }
        .replace(/,(\s*[}\]])/g, "$1");
      parsed = JSON.parse(repaired);
    }
    if (!Array.isArray(parsed)) throw new Error("response did not parse to an array");
    return parsed;
  };

  // Normalised signature for cross-batch duplicate detection. Parallel batches
  // can't see each other's output, so two could independently land on a
  // near-identical question — compare the first chunk of stripped text.
  const sigOf = (q: { text?: string }): string =>
    (q.text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);

  // Scale output tokens with the questions THIS call asks for (~1700 each, with
  // headroom), capped well under the model's output limit.
  const tokensFor = (want: number) => Math.min(32768, Math.max(4096, want * 1700));

  // Generate one batch of `want` validated questions. A single attempt keeps
  // each batch to roughly one generation's wall-clock (the point of running
  // them in parallel). chatCompletion already retries transient network errors,
  // parseQuestionArray repairs malformed JSON, and any shortfall is the top-up
  // loop's job — so there is no need to retry the whole batch here.
  const runBatch = async (
    want: number,
    roleNote: string,
    batchSeed: string,
    existingSummary: string
  ): Promise<{ questions: GenQuestion[]; usage: Usage }> => {
    try {
      const { text, usage } = await chatCompletion(
        buildBatchPrompt(want, existingSummary, batchSeed, roleNote),
        { smart: true, maxTokens: tokensFor(want), system: GENERATION_SYSTEM }
      );
      const valid = parseQuestionArray(text).filter(
        (q) => validateQuestion(q as GenQuestion).length === 0
      ) as GenQuestion[];
      return { questions: valid, usage };
    } catch (err) {
      console.warn(
        `[generatePracticePaper] batch failed (${roleNote.slice(0, 32)}):`,
        err instanceof Error ? err.message : String(err)
      );
      return { questions: [], usage: zeroUsage(MODEL_SMART) };
    }
  };

  // ── Batch split ──
  // The wait is dominated by serial output-token generation within one call, so
  // we split the paper into ≤5-question batches generated CONCURRENTLY. Wall
  // clock drops to roughly the slowest single batch instead of the whole paper;
  // total tokens (and cost) are essentially unchanged.
  const BATCH_SIZE = 5;
  const batchCount = Math.max(1, Math.ceil(questionCount / BATCH_SIZE));
  const batchWants: number[] = [];
  for (let i = 0; i < batchCount; i++) {
    batchWants.push(Math.floor(questionCount / batchCount) + (i < questionCount % batchCount ? 1 : 0));
  }

  let lastErr: unknown;
  let totalUsage: Usage = zeroUsage(MODEL_SMART);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      totalUsage = zeroUsage(MODEL_SMART);

      // Fire every batch in parallel.
      const roleFor = (i: number) =>
        batchCount > 1
          ? `This is part ${i + 1} of ${batchCount} of one paper being assembled in parallel. Cover DISTINCT sub-topics and scenarios from the other parts so the finished paper has no repeats.`
          : `Write a complete, well-rounded paper.`;
      const batchResults = await Promise.all(
        batchWants.map((want, i) => runBatch(want, roleFor(i), `${seed}-b${i}-try${attempt}`, ""))
      );
      for (const r of batchResults) totalUsage = addUsage(totalUsage, r.usage);

      // Merge + de-duplicate across batches (they're blind to each other). Any
      // shortfall from a failed batch or dropped duplicate is filled by the
      // exact-count top-up loop below.
      const validQuestions: GenQuestion[] = [];
      const seen = new Set<string>();
      for (const r of batchResults) {
        for (const q of r.questions) {
          if (validQuestions.length >= questionCount) break;
          const sig = sigOf(q);
          if (sig && seen.has(sig)) {
            console.warn(`[generatePracticePaper] dropped a cross-batch duplicate question`);
            continue;
          }
          if (sig) seen.add(sig);
          validQuestions.push(q);
        }
      }

      if (validQuestions.length === 0) {
        throw new Error("All generated questions failed validation");
      }

      // ── Top-up loop ──
      // If we have fewer questions than requested (because the model produced
      // fewer, or because validation dropped some), ask Claude for just the
      // missing ones rather than regenerating the entire paper. This is the
      // mechanism that guarantees the user gets the count they asked for.
      const MAX_TOP_UPS = 3;
      for (let topUp = 1; topUp <= MAX_TOP_UPS && validQuestions.length < questionCount; topUp++) {
        const missing = questionCount - validQuestions.length;
        const existingSummary = validQuestions
          .map((q, i) => `${i + 1}. ${String((q as { text?: string }).text ?? "").slice(0, 160).replace(/\s+/g, " ")}`)
          .join("\n");
        // Same path (and same cached system prompt) as the parallel batches —
        // just asks for the missing count with the existing questions as
        // anti-duplication anchors.
        const { questions: topUpQs, usage: topUpUsage } = await runBatch(
          missing,
          `You are filling the last ${missing} question${missing === 1 ? "" : "s"} of an in-progress paper.`,
          `${seed}-topup${topUp}`,
          existingSummary
        );
        totalUsage = addUsage(totalUsage, topUpUsage);
        let added = 0;
        for (const q of topUpQs) {
          if (validQuestions.length >= questionCount) break;
          const sig = sigOf(q);
          if (sig && seen.has(sig)) continue;
          if (sig) seen.add(sig);
          validQuestions.push(q);
          added++;
        }
        console.log(
          `[generatePracticePaper] top-up ${topUp}: requested ${missing}, accepted ${added}; ${validQuestions.length}/${questionCount} total`
        );
      }

      // Belt and braces — if the model overshot during top-up, trim back to N.
      if (validQuestions.length > questionCount) {
        validQuestions.length = questionCount;
      }

      // Hard guarantee — if we still don't have N questions after the
      // top-up loop, throw so the outer attempt loop retries the whole paper.
      // If the outer loop also exhausts, the route returns a 500 so the UI
      // shows a real error rather than silently delivering fewer questions.
      if (validQuestions.length < questionCount) {
        throw new Error(
          `Could not generate ${questionCount} questions after ${MAX_TOP_UPS} top-ups (got ${validQuestions.length})`
        );
      }

      // Renumber sequentially — original numbers may be wrong after drops + top-ups.
      validQuestions.forEach((q: { number: string }, i: number) => {
        q.number = String(i + 1);
      });

      // Post-validation enrichment — runs IN PARALLEL across all questions:
      //   (1) Adds a graph to any Q where one would meaningfully help.
      //   (2) For every line-type graph, replaces the LLM's y-values with
      //       Node-computed values from a JS function expression. This is the
      //       only way to guarantee math correctness on function curves —
      //       LLM arithmetic on cubics / exponentials / trig is unreliable.
      // If enrichment fails for a Q, the original Q is kept (never breaks).
      const { enrichPaperGraphs } = await import("./graphEnricher");
      const enriched = await enrichPaperGraphs(
        validQuestions as Parameters<typeof enrichPaperGraphs>[0],
        { subject, level }
      );
      for (const u of enriched.usages) totalUsage = addUsage(totalUsage, u);
      return { title, questions: enriched.questions, usage: totalUsage };
    } catch (err) {
      lastErr = err;
      console.log(`[generatePracticePaper] attempt ${attempt} failed:`, err instanceof Error ? err.message : String(err));
      if (attempt < 3) await sleep(2000);
    }
  }
  throw lastErr;
}
