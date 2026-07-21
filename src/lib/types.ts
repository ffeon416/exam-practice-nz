// ── Exam data types ──

export interface CutScores {
  notAchieved: { min: number; max: number };
  achieved: { min: number; max: number };
  merit: { min: number; max: number };
  excellence: { min: number; max: number };
}

export interface Exam {
  id: string;
  title: string;
  level: 0 | 1 | 2 | 3;
  standard: string;
  year: number;
  subject: "mathematics" | "science" | "biology" | "chemistry" | "physics" | "accounting" | "economics" | "geography" | "english" | "health" | "digital-tech" | "social-studies" | "history" | "te-reo" | "media-studies" | "classical-studies" | "art-history" | "business-studies" | "statistics";
  timeMinutes: number;
  questions: Question[];
  totalMarks?: number;
  cutScores?: CutScores;
}

export interface GraphData {
  type: "bar" | "line" | "pie" | "scatter" | "box-plot" | "histogram" | "table" | "number-line";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  // `data` is used by bar/pie/scatter/table/box-plot charts. Line/histogram
  // charts supply `xValues` + `series` (or `values`) instead, so `data` is
  // optional at the type level and each chart renderer null-checks what it
  // needs before drawing.
  data?: Array<{ label: string; value: number; color?: string }> | number[][] | { headers: string[]; rows: string[][] } | Array<number> | Array<{ x: number; y: number; label?: string }>;
  xValues?: number[];
  yValues?: number[];
  series?: Array<{ name: string; values: number[]; color?: string }>;
  values?: number[]; // used by histogram / box-plot for raw data
}

export interface Question {
  id: string;
  number: string;
  text: string;
  marks: number;
  gradeLevel: "achieved" | "merit" | "excellence";
  topics: string[];
  answerType: "text" | "number" | "multi-choice" | "working";
  options?: string[];
  expectedAnswer?: string;
  markingGuide: string;
  image?: string;
  graph?: GraphData;
}

// ── AI marking response ──

export interface MarkingResult {
  questionId: string;
  marksAwarded: number;
  maxMarks: number;
  // Site-wide marking scheme: 1 mark for correct working + 1 mark for the
  // correct final answer. `workingMark` is null for question types with no
  // working to show (e.g. multi-choice), where only `answerMark` applies.
  workingMark?: number | null;
  answerMark?: number;
  grade: Grade;
  feedback: string;
  correctApproach: string;
  examTip: string;
  topicsToReview: string[];
}

export type Grade = "not-achieved" | "achieved" | "merit" | "excellence";

// ── Student progress (local storage) ──

export interface StudentProgress {
  examAttempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  totalExamsTaken: number;
  streakDays: number;
  lastActiveDate: string;
}

export interface ExamAttempt {
  examId: string;
  date: string;
  answers: Record<string, string>;
  results: MarkingResult[];
  overallGrade: Grade;
  totalMarks: number;
  maxMarks: number;
  mode: "practice" | "mock";
  // Which subject/level this attempt was for. Optional because attempts saved
  // before these were tracked won't have them.
  subject?: string;
  level?: number;
}

export interface TopicScore {
  topic: string;
  topicLabel: string;
  attempts: number;
  correctRate: number;
  trend: "improving" | "stable" | "declining";
  lastAttempted: string;
  history: number[]; // last N scores as percentages
  // The subject/level this topic was last practised under, so the dashboard can
  // send the student straight into a fresh paper on this exact weak topic
  // instead of the generic subject picker. Optional for older stored scores.
  subject?: string;
  level?: number;
}

// ── Practice question generation ──

export interface PracticeQuestion {
  id: string;
  text: string;
  marks: number;
  gradeLevel: "achieved" | "merit" | "excellence";
  topic: string;
  markingGuide: string;
}
