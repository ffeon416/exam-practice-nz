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
  data: Array<{ label: string; value: number; color?: string }> | number[][] | { headers: string[]; rows: string[][] };
  xValues?: number[];
  yValues?: number[];
  series?: Array<{ name: string; values: number[]; color?: string }>;
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
}

export interface TopicScore {
  topic: string;
  topicLabel: string;
  attempts: number;
  correctRate: number;
  trend: "improving" | "stable" | "declining";
  lastAttempted: string;
  history: number[]; // last N scores as percentages
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
