// Uses the local claude-max-api proxy (OpenAI-compatible on port 3456)
// which routes through to Claude via OpenClaw/Ace

const PROXY_URL = "http://localhost:3456/v1/chat/completions";
const MODEL = "claude-sonnet-4";

async function chatCompletion(prompt: string): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer not-needed-proxy-auth",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
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
  const prompt = `You are a friendly NCEA examiner marking a student's exam answer. Be GENEROUS and FAIR — students explain things differently from textbooks but their answers can still be 100% correct.

CRITICAL MARKING RULES:
1. If the student arrives at the correct answer using valid working, give FULL marks — even if their wording, format, or steps are completely different from the marking guide.
2. Accept abbreviated working (e.g. "3x6=18" is just as valid as "1 nest × 3 chicks × 6 years = 18").
3. Accept any answer within an acceptable range for estimation questions.
4. Accept correct answers stated in any order or format.
5. Spelling, grammar, and punctuation don't affect marks unless the question is specifically about language.
6. If the final answer is correct AND there's any sign of valid working, award full marks.
7. Only deduct marks if the working is genuinely wrong, missing, or the final answer is wrong.
8. When in doubt, give the student the benefit of the doubt — if you can see they understood, mark it correct.

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

  const text = await chatCompletion(prompt);

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
  const prompt = `Generate a single NCEA Level ${level} Mathematics exam question on the topic "${topic}".

Difficulty level: ${gradeLevel}
Style it exactly like a real NZQA exam question — clear, concise, with context where appropriate.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "text": "<the question text>",
  "marks": <number of marks, typically 2-5>,
  "markingGuide": "<detailed marking schedule showing how marks are allocated>"
}`;

  const text = await chatCompletion(prompt);
  return JSON.parse(text);
}
