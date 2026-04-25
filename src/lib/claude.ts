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

async function chatCompletionOnce(prompt: string, options: { smart?: boolean; maxTokens?: number } = {}): Promise<ChatResult> {
  const model = options.smart ? MODEL_SMART : MODEL_FAST;
  const maxTokens = options.maxTokens ?? 1024;
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
      const outputTokens = Number(data.usage?.output_tokens ?? 0);
      return {
        text,
        usage: { model, inputTokens, outputTokens, costUsd: computeCost(model, inputTokens, outputTokens) },
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
        messages: [{ role: "user", content: prompt }],
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

async function chatCompletion(prompt: string, options: { smart?: boolean; maxTokens?: number } = {}): Promise<ChatResult> {
  return withRetry(() => chatCompletionOnce(prompt, options), { label: options.smart ? "smart" : "fast" });
}

export async function markAnswer(
  questionText: string,
  marks: number,
  gradeLevel: string,
  markingGuide: string,
  studentAnswer: string
): Promise<{
  marksAwarded: number;
  grade: string;
  feedback: string;
  correctApproach: string;
  examTip: string;
  topicsToReview: string[];
  usage: Usage;
}> {
  const prompt = `You are a friendly NCEA examiner. You mark like a real exam — passable working gets full marks. Don't be picky.

The student's response may have TWO parts:
- WORKING: how they solved the problem (worth 1 mark)
- FINAL ANSWER: their final answer (worth 1 mark)

CRITICAL MARKING RULES — BE VERY LENIENT:
1. **Working out is JUST about showing the method.** Any valid calculation that leads to the right answer = FULL marks for working. Examples that all get full marks:
   - "3x6=18"
   - "3 × 6 = 18"
   - "3*6=18"
   - "1 nest × 3 chicks × 6 years = 18"
   - "3 chicks per year times 6 years equals 18"
   They are ALL correct working — they all show the method.
2. **Don't require explanation sentences.** A bare calculation like "3x6=18" is enough. The student doesn't need to write "I multiplied 3 by 6 because there are 3 chicks per year and 6 years".
3. **Don't require multiple steps if one calculation is enough.** If the answer comes from one multiplication, one line of working is enough.
4. **Spelling, grammar, punctuation, capitalisation NEVER affect marks** — even on text/written answers (unless the question is specifically about spelling).
5. **Word count NEVER matters.** Short = fine if it's correct.
6. **Final answer marks**: If the answer is right (in any form/wording), FULL marks. "18", "18 chicks", "eighteen", "≈18" all get full marks.
7. **If both working leads to correct answer AND final answer is correct → FULL MARKS, no questions asked.**
8. **For estimation questions**: any answer within the reasonable range is correct.
9. **For essays**: pass if they hit the main points, even briefly. Don't penalise for being concise.
10. **When in doubt, mark it CORRECT.** Students get penalised enough in real exams — this is practice.

QUESTION: ${questionText}

MARKS AVAILABLE: ${marks}
GRADE LEVEL: ${gradeLevel}
MARKING GUIDE (for reference — students may express the answer differently): ${markingGuide}

STUDENT'S ANSWER: ${studentAnswer || "(No answer provided)"}

Mark this answer generously. Focus on whether the student got the right answer with valid reasoning, not on whether their wording matches the guide exactly.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "marksAwarded": <number 0 to ${marks} — be generous, full marks if answer is correct>,
  "grade": "<not-achieved|achieved|merit|excellence>",
  "feedback": "<encouraging feedback. If correct, say so clearly and praise their working. If wrong, explain what went wrong gently>",
  "correctApproach": "<step-by-step correct solution>",
  "examTip": "<one practical exam technique tip>",
  "topicsToReview": [<topic slugs only if the student got the question wrong>]
}`;

  // Use fast model for marking — it's basically checking, not generating
  // chatCompletion has built-in retry, so this rarely fails
  let usage: Usage = zeroUsage(MODEL_FAST);
  try {
    const { text, usage: u } = await chatCompletion(prompt, { smart: false });
    usage = u;
    // Strip markdown fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    // Sanity-check the result
    if (typeof parsed.marksAwarded !== "number") parsed.marksAwarded = 0;
    if (!parsed.grade) parsed.grade = "not-achieved";
    if (!parsed.feedback) parsed.feedback = "Your answer has been recorded.";
    if (!parsed.correctApproach) parsed.correctApproach = markingGuide;
    if (!parsed.examTip) parsed.examTip = "Always show your working clearly.";
    if (!Array.isArray(parsed.topicsToReview)) parsed.topicsToReview = [];
    return { ...parsed, usage };
  } catch (err) {
    // Last-resort fallback — give them benefit of the doubt rather than 0
    console.error("Marking fallback triggered:", err);
    return {
      marksAwarded: Math.floor(marks / 2), // partial marks rather than zero
      grade: "achieved" as const,
      feedback: "We had trouble auto-marking this one. Compare your answer with the marking guide below.",
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

export async function generatePracticeQuestion(
  topic: string,
  level: number,
  gradeLevel: string
): Promise<{
  text: string;
  marks: number;
  markingGuide: string;
  usage: Usage;
}> {
  const prompt = `Generate a single NCEA Level ${level} exam question on the topic "${topic}".

Difficulty level: ${gradeLevel}
Style it exactly like a real NZQA exam question — clear, concise, with context where appropriate.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "text": "<the question text>",
  "marks": <number of marks, typically 2-5>,
  "markingGuide": "<detailed marking schedule showing how marks are allocated>"
}`;

  // Use smart model for generation — quality matters
  const { text, usage } = await chatCompletion(prompt, { smart: true });
  return { ...JSON.parse(text), usage };
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
  }>;
  usage: Usage;
}> {
  const topicLine = topic ? `Focus on the topic: ${topic}` : `Cover a range of core topics for this subject/level.`;

  // Random seed forces fresh content even if same inputs are given twice
  const seed = Math.random().toString(36).slice(2, 10);
  const variantNote = `Variation seed: ${seed} — generate completely original questions, do not reuse questions from previous generations.`;

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
  const titleInstruction =
    level === 0
      ? `The "title" field should start with "Year 10" — e.g. "Year 10 Mathematics Practice Paper". Do NOT include "NCEA" or "Level 1" in the title.`
      : `The "title" field should follow the pattern "NCEA ${subject[0].toUpperCase() + subject.slice(1)} Level ${level} Practice Paper".`;

  const prompt = `Generate a practice exam paper for ${levelLabel}.

${topicLine}
Number of questions: ${questionCount}
${styleLabel}
${titleInstruction}
${variantNote}

Requirements:
- Mix of Achievement, Merit, and Excellence level questions
- Include multi-choice, calculation, and extended-response questions
- Use NZ contexts where natural (NZ places, NZD currency, native species, etc.)

CRITICAL — ACCURACY CHECKS (students will memorise these answers):
- For EVERY calculation: show the full working step-by-step in markingGuide, then double-check each arithmetic step is correct before moving on. Verify the final numeric answer matches the working.
- For multi-choice: verify the correct option is genuinely correct and all distractors are plausible but definitively wrong. The expectedAnswer MUST be one of the strings in the options array.
- For science/chemistry/biology: ensure all facts, formulas, and units are scientifically accurate. Check chemical equations are balanced.
- For statistics: verify all statistical calculations (means, standard deviations, confidence intervals, test statistics, p-values) by computing them step by step. Use the correct formula — population SD uses n, sample SD uses n-1. State which you are using.
- For regression: slope b = r × (sy/sx), intercept a = ȳ - b×x̄. Verify by substituting back.
- The expectedAnswer field MUST exactly match the final answer derived in the markingGuide working. If they differ, fix one of them.
- Marks must be between 1 and 8 inclusive.
- Every question must have non-empty text, expectedAnswer, and markingGuide.
- Question setups must be internally consistent — do not state a result that contradicts the given data.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "title": "<paper title>",
  "questions": [
    {
      "number": "1",
      "text": "<question text>",
      "marks": <1-8>,
      "gradeLevel": "achieved" | "merit" | "excellence",
      "answerType": "text" | "number" | "multi-choice" | "working",
      "options": ["opt1","opt2","opt3","opt4"],  // only for multi-choice, exactly 4 options
      "expectedAnswer": "<answer — must match the final result of the markingGuide working>",
      "markingGuide": "<step-by-step solution with all working shown>"
    }
  ]
}`;

  // chatCompletion has built-in retry. We add an additional layer here for
  // JSON parse errors specifically — if the model returns malformed JSON,
  // we ask it to regenerate up to 3 times.
  let lastErr: unknown;
  let totalUsage: Usage = zeroUsage(MODEL_SMART);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { text, usage } = await chatCompletion(prompt, { smart: true, maxTokens: 8192 });
      totalUsage = addUsage(totalUsage, usage);
      // Strip markdown code fences if present, and any leading/trailing prose
      let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      // Try to extract JSON object if the model wrapped it in prose
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart > 0 && jsonEnd > jsonStart) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      }
      const parsed = JSON.parse(cleaned);
      // Validate structure
      if (!parsed.title || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("Generated paper has invalid structure");
      }

      // ── Post-generation validation ──
      // Remove questions that fail quality checks rather than serving bad content
      const validQuestions: typeof parsed.questions = [];
      for (const q of parsed.questions) {
        const issues: string[] = [];

        // Required fields
        if (!q.text || typeof q.text !== "string" || q.text.trim().length === 0) {
          issues.push("missing or empty question text");
        }
        if (!q.markingGuide || typeof q.markingGuide !== "string" || q.markingGuide.trim().length === 0) {
          issues.push("missing or empty markingGuide");
        }
        if (!q.expectedAnswer || typeof q.expectedAnswer !== "string" || q.expectedAnswer.trim().length === 0) {
          issues.push("missing or empty expectedAnswer");
        }

        // Marks range
        if (typeof q.marks !== "number" || q.marks < 1 || q.marks > 8) {
          issues.push(`marks out of range: ${q.marks}`);
        }

        // Valid gradeLevel
        if (!["achieved", "merit", "excellence"].includes(q.gradeLevel)) {
          issues.push(`invalid gradeLevel: ${q.gradeLevel}`);
        }

        // Valid answerType
        if (!["text", "number", "multi-choice", "working"].includes(q.answerType)) {
          issues.push(`invalid answerType: ${q.answerType}`);
        }

        // Multi-choice specific validation
        if (q.answerType === "multi-choice") {
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            issues.push(`multi-choice must have exactly 4 options, got ${Array.isArray(q.options) ? q.options.length : 0}`);
          } else {
            // Check that expectedAnswer is one of the options (or a letter A-D referencing them)
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

        // Numeric answer sanity check — if answerType is "number", expectedAnswer should be parseable
        if (q.answerType === "number") {
          const numVal = Number(q.expectedAnswer?.replace(/[^0-9.\-]/g, ""));
          if (isNaN(numVal)) {
            issues.push(`numeric answer is not parseable: "${q.expectedAnswer}"`);
          }
        }

        if (issues.length > 0) {
          console.warn(`[generatePracticePaper] Dropping Q${q.number} — validation failed:`, issues.join("; "));
        } else {
          validQuestions.push(q);
        }
      }

      if (validQuestions.length === 0) {
        throw new Error("All generated questions failed validation");
      }

      if (validQuestions.length < parsed.questions.length) {
        console.warn(
          `[generatePracticePaper] ${parsed.questions.length - validQuestions.length} question(s) removed by validation, ${validQuestions.length} remaining`
        );
      }

      parsed.questions = validQuestions;
      return { ...parsed, usage: totalUsage };
    } catch (err) {
      lastErr = err;
      console.log(`[generatePracticePaper] attempt ${attempt} failed:`, err instanceof Error ? err.message : String(err));
      if (attempt < 3) await sleep(2000);
    }
  }
  throw lastErr;
}
