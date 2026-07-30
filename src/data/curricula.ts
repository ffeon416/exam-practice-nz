// ── Curriculum registry ──
// The foundation of StudyAce Global: every exam system we serve (or plan to)
// is defined here as data. The goal is that adding a market is eventually
// config + prompts, not a rewrite. NCEA is the only "live" system today;
// the rest are waitlist targets launching one at a time.
//
// Flagship-system rule: ONE tractable system per country first —
// never all 50 US states / every AU state / every UK exam board at once.

export type CurriculumStatus = "live" | "coming-soon";

export interface GradeBand {
  /** Internal id, used in results/scoring */
  id: string;
  /** What the student sees, e.g. "Excellence", "Band 6", "Grade 9" */
  label: string;
  /** Minimum fraction of max marks (0–1) to earn this band */
  minPct: number;
}

export interface Curriculum {
  id: string;
  /** ISO country code for geo-targeting */
  country: "NZ" | "AU" | "GB" | "US" | "CA";
  countryLabel: string;
  flag: string;
  /** Short system name, e.g. "NCEA", "HSC", "GCSE" */
  system: string;
  /** Full display name */
  label: string;
  /** Year levels / grades this system covers, display strings */
  yearLevels: string[];
  /** Grade bands, highest first */
  gradeBands: GradeBand[];
  status: CurriculumStatus;
  /** One-liner shown on the waitlist card */
  blurb: string;
}

export const CURRICULA: Curriculum[] = [
  {
    id: "nz-ncea",
    country: "NZ",
    countryLabel: "New Zealand",
    flag: "🇳🇿",
    system: "NCEA",
    label: "NCEA Levels 1–3 (+ Y10 / CAA)",
    yearLevels: ["Year 10", "Year 11", "Year 12", "Year 13"],
    gradeBands: [
      { id: "excellence", label: "Excellence", minPct: 0.85 },
      { id: "merit", label: "Merit", minPct: 0.65 },
      { id: "achieved", label: "Achieved", minPct: 0.4 },
      { id: "not-achieved", label: "Not Achieved", minPct: 0 },
    ],
    status: "live",
    blurb: "Unlimited NCEA-style practice, marked honestly. Live now.",
  },
  {
    id: "au-qce",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "QCE",
    label: "QCE (Queensland) · Years 11–12",
    yearLevels: ["Year 10", "Year 11", "Year 12"],
    gradeBands: [
      { id: "a", label: "A", minPct: 0.85 },
      { id: "b", label: "B", minPct: 0.65 },
      { id: "c", label: "C", minPct: 0.45 },
      { id: "d", label: "D", minPct: 0.25 },
      { id: "e", label: "E", minPct: 0 },
    ],
    status: "coming-soon",
    blurb: "QCE-style practice for General subjects, ATAR-ready.",
  },
  {
    id: "au-hsc",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "HSC",
    label: "HSC (New South Wales) · Years 11–12",
    yearLevels: ["Year 10", "Year 11", "Year 12"],
    gradeBands: [
      { id: "band-6", label: "Band 6", minPct: 0.9 },
      { id: "band-5", label: "Band 5", minPct: 0.8 },
      { id: "band-4", label: "Band 4", minPct: 0.7 },
      { id: "band-3", label: "Band 3", minPct: 0.6 },
      { id: "band-2", label: "Band 2", minPct: 0.5 },
      { id: "band-1", label: "Band 1", minPct: 0 },
    ],
    status: "coming-soon",
    blurb: "HSC-style practice papers with band-level honest marking.",
  },
  {
    id: "uk-gcse",
    country: "GB",
    countryLabel: "England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    system: "GCSE",
    label: "GCSE · Years 10–11",
    yearLevels: ["Year 10", "Year 11"],
    gradeBands: [
      { id: "grade-9", label: "9", minPct: 0.9 },
      { id: "grade-8", label: "8", minPct: 0.82 },
      { id: "grade-7", label: "7", minPct: 0.74 },
      { id: "grade-6", label: "6", minPct: 0.64 },
      { id: "grade-5", label: "5", minPct: 0.54 },
      { id: "grade-4", label: "4", minPct: 0.44 },
      { id: "grade-3", label: "3", minPct: 0.3 },
      { id: "grade-2", label: "2", minPct: 0.15 },
      { id: "grade-1", label: "1", minPct: 0 },
    ],
    status: "coming-soon",
    blurb: "GCSE-style questions with 9–1 grading across the core subjects.",
  },
  {
    id: "us-ap-sat",
    country: "US",
    countryLabel: "United States",
    flag: "🇺🇸",
    system: "AP + SAT",
    label: "AP courses + SAT prep · Grades 9–12",
    yearLevels: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    gradeBands: [
      { id: "ap-5", label: "5", minPct: 0.85 },
      { id: "ap-4", label: "4", minPct: 0.7 },
      { id: "ap-3", label: "3", minPct: 0.5 },
      { id: "ap-2", label: "2", minPct: 0.3 },
      { id: "ap-1", label: "1", minPct: 0 },
    ],
    status: "coming-soon",
    blurb: "AP-style FRQs and SAT-style practice, scored honestly.",
  },
  {
    id: "ca-ontario",
    country: "CA",
    countryLabel: "Canada",
    flag: "🇨🇦",
    system: "Ontario",
    label: "Ontario curriculum · Grades 9–12",
    yearLevels: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    gradeBands: [
      { id: "level-4", label: "Level 4", minPct: 0.8 },
      { id: "level-3", label: "Level 3", minPct: 0.7 },
      { id: "level-2", label: "Level 2", minPct: 0.6 },
      { id: "level-1", label: "Level 1", minPct: 0.5 },
      { id: "below", label: "Below Level 1", minPct: 0 },
    ],
    status: "coming-soon",
    blurb: "Ontario-style course practice with levels-based feedback.",
  },
];

export const LIVE_CURRICULA = CURRICULA.filter((c) => c.status === "live");
export const COMING_CURRICULA = CURRICULA.filter((c) => c.status === "coming-soon");

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}
