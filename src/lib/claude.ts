// Uses the local claude-max-api proxy (OpenAI-compatible on port 3456)
// which routes through to Claude via OpenClaw/Ace

const PROXY_URL = "http://localhost:3456/v1/chat/completions";

// Model selection — use cheaper Haiku for simple marking, Sonnet for complex tasks
const MODEL_FAST = "claude-haiku-4-5"; // 6x cheaper — for marking, simple checks
const MODEL_SMART = "claude-sonnet-4"; // smarter — for generation, tutor chat, essays

async function chatCompletion(prompt: string, options: { smart?: boolean; maxTokens?: number } = {}): Promise<string> {
  const model = options.smart ? MODEL_SMART : MODEL_FAST;
  const maxTokens = options.maxTokens ?? 1024;
  const res = await fetch(PROXY_URL, {
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
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Proxy error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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
  const text = await chatCompletion(prompt, { smart: false });

  try {
    return JSON.parse(text);
  } catch {
    return {
      marksAwarded: 0,
      grade: "not-achieved",
      feedback: "Unable to parse AI response. Please try again.",
      correctApproach: markingGuide,
      examTip: "Always show your working clearly.",
      topicsToReview: [],
    };
  }
}

export async function generatePracticeQuestion(
  topic: string,
  level: number,
  gradeLevel: string
): Promise<{
  text: string;
  marks: number;
  markingGuide: string;
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
  const text = await chatCompletion(prompt, { smart: true });
  return JSON.parse(text);
}

// ── AI Tutor Chat ──
// Lets students ask questions and get Socratic-style help
export async function tutorChat(
  question: { text: string; markingGuide: string; expectedAnswer?: string },
  studentMessages: { role: "user" | "assistant"; content: string }[],
  studentAnswerSoFar?: string
): Promise<string> {
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

  return chatCompletion(prompt, { smart: true, maxTokens: 300 });
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
}> {
  const topicLine = topic ? `Focus on the topic: ${topic}` : `Cover a range of core topics for this subject/level.`;

  const prompt = `Generate a practice exam paper for NCEA ${subject} Level ${level}.

${topicLine}
Number of questions: ${questionCount}
Match the style, difficulty, and question types of real NZQA ${subject} exams.

Requirements:
- Mix of Achievement, Merit, and Excellence level questions
- Include multi-choice, calculation, and extended-response questions
- Use NZ contexts where natural (NZ places, NZD currency, native species, etc.)
- All calculations must be mathematically/scientifically correct
- Verify expectedAnswer matches the working in markingGuide

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
      "options": ["opt1","opt2","opt3","opt4"],  // only for multi-choice
      "expectedAnswer": "<answer>",
      "markingGuide": "<step-by-step solution>"
    }
  ]
}`;

  const text = await chatCompletion(prompt, { smart: true, maxTokens: 4096 });
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}
