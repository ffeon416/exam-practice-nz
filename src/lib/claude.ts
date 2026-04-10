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
