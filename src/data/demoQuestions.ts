import type { Question, Exam } from "@/lib/types";

// The 3 no-login demo questions. They are marked LIVE by the real honest
// `markAnswer` pipeline via /api/demo-mark — there are deliberately no
// pre-baked "results" here, so the demo can never fake a pass on a wrong answer.
export const demoQuestions: Question[] = [
  {
    id: "demo-1",
    number: "1",
    text: "Describe what happens during photosynthesis and explain why it is important for life on Earth.",
    marks: 2,
    gradeLevel: "achieved",
    topics: ["photosynthesis"],
    answerType: "working",
    expectedAnswer:
      "Plants use sunlight to convert CO\u2082 and water into glucose and oxygen. This is important because it provides oxygen for animals and food/energy for all living things.",
    markingGuide:
      "Photosynthesis converts carbon dioxide and water into glucose and oxygen using sunlight. The equation is: 6CO\u2082 + 6H\u2082O \u2192 C\u2086H\u2081\u2082O\u2086 + 6O\u2082. It is important because it produces oxygen for animals to breathe and glucose (food/energy) for plants and the food chain. Award 1 working mark for correctly describing the process (with the equation or reactants/products), and 1 answer mark for explaining why it is important for life.",
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
      "Row 1 = 20, each subsequent row adds 3. Row n = 20 + 3(n-1). Row 12 = 20 + 3(11) = 20 + 33 = 53 seats. Award 1 working mark for the correct method/formula, and 1 answer mark for the correct answer of 53.",
  },
  {
    id: "demo-3",
    number: "3",
    text: 'Read the following passage and answer the question below.\n\n"The old lighthouse keeper climbed the spiral stairs one last time, his weathered hands tracing the cold stone wall as they had done for forty years. Below, the automated light hummed to life without him \u2014 a machine replacing a man, progress they called it. He paused at the top and looked out at the dark sea, knowing it would never look quite the same to anyone who hadn\u2019t earned the view."\n\nExplain how the writer creates a sense of loss in this passage. Support your answer with evidence from the text.',
    marks: 2,
    gradeLevel: "merit",
    topics: ["unfamiliar-text"],
    answerType: "text",
    expectedAnswer:
      'The writer uses "one last time" to signal this is the end, creating an immediate sense of finality. The contrast between the keeper\'s "weathered hands" and the "automated light" that works "without him" highlights how a lifetime of dedication is being replaced by a machine. The phrase "progress they called it" has a bitter, ironic tone suggesting the keeper doesn\'t see his replacement as progress at all.',
    markingGuide:
      "The writer creates loss through: 1) 'one last time' signals finality; 2) contrast between human ('weathered hands') and machine ('automated light hummed'); 3) 'progress they called it' shows ironic/bitter tone about being replaced; 4) 'earned the view' implies his experience/dedication is being discarded. Merit requires identifying at least two techniques with evidence AND explaining their effect. Award 1 working mark for identifying techniques with supporting evidence, and 1 answer mark for clearly explaining how they create a sense of loss.",
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
  totalMarks: 6,
};
