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
  const prompt = `You are an experienced NCEA Mathematics examiner. Mark the following student answer against the official NZQA marking schedule. Be fair but rigorous — award marks only when the criteria are clearly met.

QUESTION: ${questionText}

MARKS AVAILABLE: ${marks}
GRADE LEVEL: ${gradeLevel}
OFFICIAL MARKING GUIDE: ${markingGuide}

STUDENT'S ANSWER: ${studentAnswer || "(No answer provided)"}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "marksAwarded": <number 0 to ${marks}>,
  "grade": "<not-achieved|achieved|merit|excellence>",
  "feedback": "<specific feedback on what was correct and what was missing — refer to specific parts of the student's answer>",
  "correctApproach": "<step-by-step correct solution showing full working>",
  "examTip": "<one practical exam technique tip for this type of question>",
  "topicsToReview": [<array of topic slugs the student should review, e.g. "linear-equations", "trigonometry">]
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
