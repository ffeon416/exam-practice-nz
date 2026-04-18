import type { Question, Exam, MarkingResult } from "@/lib/types";

// Pre-written "AI marking" results — no API call needed.
// These look identical to real AI output but cost nothing to serve.
export const demoResults: MarkingResult[] = [
  {
    questionId: "demo-1",
    marksAwarded: 3,
    maxMarks: 3,
    grade: "achieved",
    feedback:
      "Great answer! You've correctly described photosynthesis as the process where plants use sunlight to convert CO₂ and water into glucose and oxygen. You've also explained why it matters — providing oxygen and energy for living things. Full marks.",
    correctApproach:
      "Photosynthesis converts carbon dioxide and water into glucose and oxygen using sunlight energy. The word equation is: carbon dioxide + water → glucose + oxygen. The balanced symbol equation is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. It is essential for life because it produces the oxygen animals breathe and the glucose that enters food chains.",
    examTip:
      "In NCEA Science, always include the equation (word or symbol) when explaining photosynthesis — it's an easy mark that students often forget.",
    topicsToReview: [],
  },
  {
    questionId: "demo-2",
    marksAwarded: 2,
    maxMarks: 2,
    grade: "achieved",
    feedback:
      "Well done! You've correctly identified the pattern (each row adds 3 seats) and applied it to find row 12 = 53 seats. Your working is clear and the final answer is correct.",
    correctApproach:
      "This is an arithmetic sequence. Row 1 = 20, common difference = 3. The formula for the nth term is: a_n = a₁ + (n-1)d. Row 12 = 20 + (12-1) × 3 = 20 + 33 = 53 seats.",
    examTip:
      "Always write the formula first, then substitute your values. Even if your final answer is wrong, you'll pick up a method mark for showing the correct formula.",
    topicsToReview: [],
  },
  {
    questionId: "demo-3",
    marksAwarded: 3,
    maxMarks: 3,
    grade: "merit",
    feedback:
      "Excellent analysis! You've identified multiple language techniques with specific evidence from the text and explained how each creates a sense of loss. Your use of quotations is well-integrated and your explanations show genuine understanding of the writer's craft. This is a strong Merit-level response.",
    correctApproach:
      "The writer creates loss through several techniques: 1) \"one last time\" signals finality — this is his final visit, creating immediate sadness. 2) The contrast between human (\"weathered hands\") and machine (\"automated light hummed\") shows a lifetime of care being replaced by technology. 3) \"progress they called it\" uses an ironic, bitter tone — the keeper clearly disagrees. 4) \"earned the view\" implies that his decades of experience and dedication are being discarded, and no one else will appreciate what he saw.",
    examTip:
      "For unfamiliar text questions, always use the PEE structure: Point (identify the technique), Evidence (quote from the text), Explain (say HOW it creates the effect the question asks about).",
    topicsToReview: [],
  },
];

export const demoQuestions: Question[] = [
  {
    id: "demo-1",
    number: "1",
    text: "Describe what happens during photosynthesis and explain why it is important for life on Earth.",
    marks: 3,
    gradeLevel: "achieved",
    topics: ["photosynthesis"],
    answerType: "working",
    expectedAnswer:
      "Plants use sunlight to convert CO\u2082 and water into glucose and oxygen. This is important because it provides oxygen for animals and food/energy for all living things.",
    markingGuide:
      "Photosynthesis converts carbon dioxide and water into glucose and oxygen using sunlight. The equation is: 6CO\u2082 + 6H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + 6O\u2082. It is important because it produces oxygen for animals to breathe and glucose (food/energy) for plants and the food chain. Award 1 mark for describing the process, 1 mark for the equation or reactants/products, 1 mark for explaining importance.",
  },
  {
    id: "demo-2",
    number: "2",
    text: "A concert venue has 12 rows of seats. The first row has 20 seats, and each row after that has 3 more seats than the row before. How many seats are in the 12th row?",
    marks: 2,
    gradeLevel: "achieved",
    topics: ["algebra"],
    answerType: "working",
    expectedAnswer: "53",
    markingGuide:
      "Row 1 = 20, each subsequent row adds 3. Row n = 20 + 3(n-1). Row 12 = 20 + 3(11) = 20 + 33 = 53 seats. Award 1 mark for correct method/formula, 1 mark for correct answer of 53.",
  },
  {
    id: "demo-3",
    number: "3",
    text: 'Read the following passage and answer the question below.\n\n"The old lighthouse keeper climbed the spiral stairs one last time, his weathered hands tracing the cold stone wall as they had done for forty years. Below, the automated light hummed to life without him \u2014 a machine replacing a man, progress they called it. He paused at the top and looked out at the dark sea, knowing it would never look quite the same to anyone who hadn\u2019t earned the view."\n\nExplain how the writer creates a sense of loss in this passage. Support your answer with evidence from the text.',
    marks: 3,
    gradeLevel: "merit",
    topics: ["unfamiliar-text"],
    answerType: "text",
    expectedAnswer:
      'The writer uses "one last time" to signal this is the end, creating an immediate sense of finality. The contrast between the keeper\'s "weathered hands" and the "automated light" that works "without him" highlights how a lifetime of dedication is being replaced by a machine. The phrase "progress they called it" has a bitter, ironic tone suggesting the keeper doesn\'t see his replacement as progress at all.',
    markingGuide:
      "The writer creates loss through: 1) 'one last time' signals finality; 2) contrast between human ('weathered hands') and machine ('automated light hummed'); 3) 'progress they called it' shows ironic/bitter tone about being replaced; 4) 'earned the view' implies his experience/dedication is being discarded. Merit requires identifying at least two techniques with evidence AND explaining their effect. Award 1 mark per technique identified with evidence and explained effect, up to 3.",
  },
];

export const demoExam: Exam = {
  id: "demo",
  title: "StudyAce Demo",
  subject: "science",
  level: 1,
  standard: "Demo",
  year: 2026,
  timeMinutes: 10,
  questions: demoQuestions,
  totalMarks: 8,
};
