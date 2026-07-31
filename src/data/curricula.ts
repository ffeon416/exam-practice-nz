// ── Curriculum registry ──
// The foundation of StudyAce Global: every exam system we serve (or plan to)
// is defined here as data — subjects, year levels, grade bands, and the
// prompt fragments that teach the AI each system's style. Adding a market is
// config + prompts, not a rewrite.
//
// Flagship-system rule: ONE tractable system per country first —
// never all 50 US states / every AU state / every UK exam board at once.
//
// ⚠️ PROMPT-CACHE INVARIANT: promptConfig feeds module-level constant system
// prompts in claude.ts (one per curriculum, computed once at load). Nothing
// per-call may leak into these strings.

export type CurriculumStatus = "live" | "early-access" | "coming-soon";

export interface GradeBand {
  /** Internal id, used in results/scoring */
  id: string;
  /** What the student sees, e.g. "Excellence", "Band 6", "Grade 9" */
  label: string;
  /** Minimum fraction of max marks (0–1) to earn this band */
  minPct: number;
  /** Display tone for UI colouring: top | high | pass | fail */
  tone: "top" | "high" | "pass" | "fail";
}

export interface CurriculumLevel {
  /** Picker value — the year/grade number students recognise */
  value: number;
  /** Button label, e.g. "Year 12", "Grade 11" */
  label: string;
  /** How the generation prompt names this level's course/qualification */
  promptDescriptor: string;
  /** Style guidance for this level (exam style to imitate) */
  styleNote: string;
  /** Paper title prefix, e.g. "HSC Year 12" */
  titlePrefix: string;
}

export interface CurriculumSubject {
  value: string;
  label: string;
  /** Which level values (years/grades) offer this subject */
  years: number[];
}

export interface CurriculumPromptConfig {
  /** Generation persona, e.g. "an expert NZQA / NCEA exam author" */
  authorPersona: string;
  /** Marking persona, e.g. "an NCEA examiner" */
  examinerPersona: string;
  /** Difficulty-spread instruction for a generated set */
  difficultySpread: string;
  /** Local flavour instruction (currency, places, context) */
  localContext: string;
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
  levels: CurriculumLevel[];
  subjects: CurriculumSubject[];
  /** Subject values available on the free tier */
  freeSubjects: string[];
  /** Grade bands, highest first */
  gradeBands: GradeBand[];
  /** Display labels for the internal question-difficulty enum */
  difficultyLabels: { achieved: string; merit: string; excellence: string };
  promptConfig: CurriculumPromptConfig;
  status: CurriculumStatus;
  /** One-liner shown on the waitlist / global card */
  blurb: string;
}

// Shared subject shorthand
const S = (value: string, label: string, years: number[]): CurriculumSubject => ({ value, label, years });

export const CURRICULA: Curriculum[] = [
  // ─────────────────────────────────────────────── NZ · NCEA (live)
  {
    id: "nz-ncea",
    country: "NZ",
    countryLabel: "New Zealand",
    flag: "🇳🇿",
    system: "NCEA",
    label: "NCEA Levels 1–3 (+ Y10 / CAA)",
    levels: [
      {
        value: 10,
        label: "Year 10",
        promptDescriptor: "Year 10 (pre-NCEA foundation, aligned with the NZ Curriculum Level 5 and CAA Numeracy standards)",
        styleNote: "Match the style, difficulty, and question types of NZ Year 10 end-of-year assessments and CAA Numeracy papers (NOT NCEA — Year 10 students do not sit NCEA).",
        titlePrefix: "Year 10",
      },
      { value: 11, label: "Year 11", promptDescriptor: "NCEA Level 1", styleNote: "Match the style, difficulty, and question types of real NZQA exams.", titlePrefix: "NCEA Level 1" },
      { value: 12, label: "Year 12", promptDescriptor: "NCEA Level 2", styleNote: "Match the style, difficulty, and question types of real NZQA exams.", titlePrefix: "NCEA Level 2" },
      { value: 13, label: "Year 13", promptDescriptor: "NCEA Level 3", styleNote: "Match the style, difficulty, and question types of real NZQA exams.", titlePrefix: "NCEA Level 3" },
    ],
    subjects: [
      S("mathematics", "Mathematics", [10, 11, 12, 13]),
      S("science", "Science", [10, 11]),
      S("statistics", "Statistics", [11, 12, 13]),
      S("english", "English", [10, 11, 12, 13]),
      S("biology", "Biology", [11, 12, 13]),
      S("chemistry", "Chemistry", [12, 13]),
      S("physics", "Physics", [12, 13]),
      S("history", "History", [11, 13]),
      S("geography", "Geography", [11, 12, 13]),
      S("te-reo", "Te Reo Māori", [11, 12, 13]),
      S("economics", "Economics", [11, 12, 13]),
      S("accounting", "Accounting", [11, 12, 13]),
      S("health", "Health", [10, 11]),
      S("digital-tech", "Digital Technologies", [10]),
      S("social-studies", "Social Studies", [10]),
      S("media-studies", "Media Studies", [12, 13]),
      S("classical-studies", "Classical Studies", [12, 13]),
      S("art-history", "Art History", [12, 13]),
      S("business-studies", "Business Studies", [13]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "excellence", label: "Excellence", minPct: 0.85, tone: "top" },
      { id: "merit", label: "Merit", minPct: 0.65, tone: "high" },
      { id: "achieved", label: "Achieved", minPct: 0.4, tone: "pass" },
      { id: "not-achieved", label: "Not Achieved", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Achieved", merit: "Merit", excellence: "Excellence" },
    promptConfig: {
      authorPersona: "an expert NZQA / NCEA exam author",
      examinerPersona: "an NCEA examiner",
      difficultySpread: "Spread Achievement, Merit, and Excellence difficulty across them.",
      localContext: "Use NZ contexts where natural (NZ places, NZD currency, native species, etc.)",
    },
    status: "live",
    blurb: "Unlimited NCEA-style practice, marked honestly. Live now.",
  },

  // ─────────────────────────────────────────────── AU · QCE (early access)
  {
    id: "au-qce",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "QCE",
    label: "QCE (Queensland) · Years 11–12",
    levels: [
      {
        value: 10,
        label: "Year 10",
        promptDescriptor: "Year 10 (Australian Curriculum, pre-senior foundation for QCE pathways)",
        styleNote: "Match the style and difficulty of Queensland Year 10 end-of-year assessments preparing students for QCE General subjects.",
        titlePrefix: "Year 10 (QLD)",
      },
      {
        value: 11,
        label: "Year 11",
        promptDescriptor: "QCE Units 1–2 (Queensland, Year 11 General subject)",
        styleNote: "Match the style and question types of QCAA General subject internal assessments (short response and problem-solving tasks).",
        titlePrefix: "QCE Year 11",
      },
      {
        value: 12,
        label: "Year 12",
        promptDescriptor: "QCE Units 3–4 (Queensland, Year 12 General subject)",
        styleNote: "Match the style and question types of QCAA external examinations for General subjects — paper 1 style short response and multiple choice.",
        titlePrefix: "QCE Year 12",
      },
    ],
    subjects: [
      S("mathematics", "General Mathematics", [10, 11, 12]),
      S("maths-methods", "Mathematical Methods", [11, 12]),
      S("english", "English", [10, 11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("psychology", "Psychology", [11, 12]),
      S("economics", "Economics", [11, 12]),
      S("business-studies", "Business", [11, 12]),
      S("modern-history", "Modern History", [11, 12]),
      S("geography", "Geography", [11, 12]),
      S("science", "Science", [10]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a", label: "A", minPct: 0.85, tone: "top" },
      { id: "b", label: "B", minPct: 0.65, tone: "high" },
      { id: "c", label: "C", minPct: 0.45, tone: "pass" },
      { id: "d", label: "D", minPct: 0.25, tone: "fail" },
      { id: "e", label: "E", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Standard", merit: "Complex", excellence: "Challenging" },
    promptConfig: {
      authorPersona: "an expert QCAA exam author for Queensland QCE General subjects",
      examinerPersona: "a QCE examiner (QCAA, Queensland)",
      difficultySpread: "Spread the difficulty from simple familiar questions through complex unfamiliar ones, as QCAA external exams do.",
      localContext: "Use Australian contexts where natural (Australian places, AUD currency, Australian species and industries, etc.)",
    },
    status: "early-access",
    blurb: "QCE-style practice for General subjects, ATAR-ready.",
  },

  // ─────────────────────────────────────────────── AU · HSC (early access)
  {
    id: "au-hsc",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "HSC",
    label: "HSC (New South Wales) · Years 11–12",
    levels: [
      {
        value: 10,
        label: "Year 10",
        promptDescriptor: "Year 10 (NSW Stage 5, pre-senior foundation for HSC pathways)",
        styleNote: "Match the style and difficulty of NSW Stage 5 (Year 10) yearly examinations.",
        titlePrefix: "Year 10 (NSW)",
      },
      {
        value: 11,
        label: "Year 11",
        promptDescriptor: "HSC Preliminary course (NSW Year 11)",
        styleNote: "Match the style and question types of NSW Preliminary course examinations.",
        titlePrefix: "HSC Year 11",
      },
      {
        value: 12,
        label: "Year 12",
        promptDescriptor: "HSC course (NSW Year 12)",
        styleNote: "Match the style, difficulty, and question types of real NESA HSC examinations — objective-response and short-answer sections.",
        titlePrefix: "HSC",
      },
    ],
    subjects: [
      S("maths-standard", "Mathematics Standard", [11, 12]),
      S("mathematics", "Mathematics Advanced", [10, 11, 12]),
      S("english", "English (Standard & Advanced)", [10, 11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("business-studies", "Business Studies", [11, 12]),
      S("economics", "Economics", [11, 12]),
      S("modern-history", "Modern History", [11, 12]),
      S("ancient-history", "Ancient History", [11, 12]),
      S("geography", "Geography", [11, 12]),
      S("pdhpe", "PDHPE", [11, 12]),
      S("science", "Science", [10]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "band-6", label: "Band 6", minPct: 0.9, tone: "top" },
      { id: "band-5", label: "Band 5", minPct: 0.8, tone: "high" },
      { id: "band-4", label: "Band 4", minPct: 0.7, tone: "pass" },
      { id: "band-3", label: "Band 3", minPct: 0.6, tone: "pass" },
      { id: "band-2", label: "Band 2", minPct: 0.5, tone: "fail" },
      { id: "band-1", label: "Band 1", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Band 4", merit: "Band 5", excellence: "Band 6" },
    promptConfig: {
      authorPersona: "an expert NESA exam author for NSW HSC courses",
      examinerPersona: "an HSC examiner (NESA, New South Wales)",
      difficultySpread: "Spread the difficulty from Band 4 through Band 6 level, as real HSC papers do.",
      localContext: "Use Australian contexts where natural (Australian places, AUD currency, Australian species and industries, etc.)",
    },
    status: "early-access",
    blurb: "HSC-style practice papers with band-level honest marking.",
  },

  // ─────────────────────────────────────────────── AU · VCE (waitlist)
  {
    id: "au-vce",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "VCE",
    label: "VCE (Victoria) · Years 11–12",
    levels: [
      { value: 10, label: "Year 10", promptDescriptor: "Year 10 (Victorian Curriculum, pre-VCE)", styleNote: "Match Victorian Year 10 assessment style.", titlePrefix: "Year 10 (VIC)" },
      { value: 11, label: "Year 11", promptDescriptor: "VCE Units 1–2 (Victoria, Year 11)", styleNote: "Match VCAA Units 1–2 assessment style.", titlePrefix: "VCE Year 11" },
      { value: 12, label: "Year 12", promptDescriptor: "VCE Units 3–4 (Victoria, Year 12)", styleNote: "Match the style and question types of real VCAA external examinations.", titlePrefix: "VCE" },
    ],
    subjects: [
      S("mathematics", "General Mathematics", [10, 11, 12]),
      S("maths-methods", "Mathematical Methods", [11, 12]),
      S("english", "English", [10, 11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("psychology", "Psychology", [11, 12]),
      S("economics", "Economics", [11, 12]),
      S("business-studies", "Business Management", [11, 12]),
      S("modern-history", "History", [11, 12]),
      S("geography", "Geography", [11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a-plus", label: "A+", minPct: 0.9, tone: "top" },
      { id: "a", label: "A", minPct: 0.8, tone: "high" },
      { id: "b", label: "B", minPct: 0.7, tone: "high" },
      { id: "c", label: "C", minPct: 0.55, tone: "pass" },
      { id: "d", label: "D", minPct: 0.4, tone: "fail" },
      { id: "e", label: "E", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Standard", merit: "Complex", excellence: "Challenging" },
    promptConfig: {
      authorPersona: "an expert VCAA exam author for Victorian VCE studies",
      examinerPersona: "a VCE examiner (VCAA, Victoria)",
      difficultySpread: "Spread the difficulty from accessible questions through the demanding multi-step questions VCAA exams end with.",
      localContext: "Use Australian contexts where natural (Australian places, AUD currency, Australian species and industries, etc.)",
    },
    status: "early-access",
    blurb: "VCE-style practice with graded feedback, ATAR-ready.",
  },

  // ─────────────────────────────────────────────── AU · WACE (waitlist)
  {
    id: "au-wace",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "WACE",
    label: "WACE (Western Australia) · Years 11–12",
    levels: [
      { value: 11, label: "Year 11", promptDescriptor: "WACE Year 11 ATAR course (Western Australia)", styleNote: "Match SCSA ATAR course assessment style.", titlePrefix: "WACE Year 11" },
      { value: 12, label: "Year 12", promptDescriptor: "WACE Year 12 ATAR course (Western Australia)", styleNote: "Match the style of real SCSA ATAR examinations.", titlePrefix: "WACE" },
    ],
    subjects: [
      S("mathematics", "Mathematics Applications", [11, 12]),
      S("maths-methods", "Mathematics Methods", [11, 12]),
      S("english", "English", [11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("economics", "Economics", [11, 12]),
      S("geography", "Geography", [11, 12]),
      S("modern-history", "Modern History", [11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a", label: "A", minPct: 0.85, tone: "top" },
      { id: "b", label: "B", minPct: 0.65, tone: "high" },
      { id: "c", label: "C", minPct: 0.45, tone: "pass" },
      { id: "d", label: "D", minPct: 0.25, tone: "fail" },
      { id: "e", label: "E", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Standard", merit: "Complex", excellence: "Challenging" },
    promptConfig: {
      authorPersona: "an expert SCSA exam author for WACE ATAR courses",
      examinerPersona: "a WACE examiner (SCSA, Western Australia)",
      difficultySpread: "Spread the difficulty from straightforward through the demanding synthesis questions ATAR exams include.",
      localContext: "Use Australian contexts where natural (Australian places, AUD currency, Australian species and industries, etc.)",
    },
    status: "early-access",
    blurb: "WACE-style practice for ATAR-pathway courses.",
  },

  // ─────────────────────────────────────────────── AU · SACE (waitlist)
  {
    id: "au-sace",
    country: "AU",
    countryLabel: "Australia",
    flag: "🇦🇺",
    system: "SACE",
    label: "SACE (South Australia & NT) · Years 11–12",
    levels: [
      { value: 11, label: "Year 11", promptDescriptor: "SACE Stage 1 (South Australia, Year 11)", styleNote: "Match SACE Stage 1 assessment style.", titlePrefix: "SACE Stage 1" },
      { value: 12, label: "Year 12", promptDescriptor: "SACE Stage 2 (South Australia, Year 12)", styleNote: "Match the style of real SACE Stage 2 external examinations.", titlePrefix: "SACE Stage 2" },
    ],
    subjects: [
      S("mathematics", "General Mathematics", [11, 12]),
      S("maths-methods", "Mathematical Methods", [11, 12]),
      S("english", "English", [11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("psychology", "Psychology", [11, 12]),
      S("economics", "Economics", [11, 12]),
      S("modern-history", "Modern History", [11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a", label: "A", minPct: 0.85, tone: "top" },
      { id: "b", label: "B", minPct: 0.65, tone: "high" },
      { id: "c", label: "C", minPct: 0.45, tone: "pass" },
      { id: "d", label: "D", minPct: 0.25, tone: "fail" },
      { id: "e", label: "E", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Standard", merit: "Complex", excellence: "Challenging" },
    promptConfig: {
      authorPersona: "an expert SACE Board exam author for South Australian subjects",
      examinerPersona: "a SACE examiner (SACE Board, South Australia)",
      difficultySpread: "Spread the difficulty from application questions through demanding analysis, as SACE external exams do.",
      localContext: "Use Australian contexts where natural (Australian places, AUD currency, Australian species and industries, etc.)",
    },
    status: "early-access",
    blurb: "SACE-style practice for Stage 1 & 2 subjects.",
  },

  // ─────────────────────────────────────────────── UK · GCSE (early access)
  {
    id: "uk-gcse",
    country: "GB",
    countryLabel: "England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    system: "GCSE",
    label: "GCSE · Years 10–11",
    levels: [
      {
        value: 10,
        label: "Year 10",
        promptDescriptor: "GCSE Year 10 (first year of the GCSE course, England)",
        styleNote: "Match GCSE exam-question style at the difficulty of end-of-Year-10 mocks (Foundation/Higher crossover content).",
        titlePrefix: "GCSE Year 10",
      },
      {
        value: 11,
        label: "Year 11",
        promptDescriptor: "GCSE Year 11 (final year, England)",
        styleNote: "Match the style, difficulty, and question types of real GCSE examination papers (drawing on the common content across AQA, Edexcel and OCR specifications; Higher-tier oriented).",
        titlePrefix: "GCSE",
      },
    ],
    subjects: [
      S("mathematics", "Mathematics", [10, 11]),
      S("english", "English Language", [10, 11]),
      S("english-literature", "English Literature", [10, 11]),
      S("combined-science", "Combined Science", [10, 11]),
      S("biology", "Biology", [10, 11]),
      S("chemistry", "Chemistry", [10, 11]),
      S("physics", "Physics", [10, 11]),
      S("history", "History", [10, 11]),
      S("geography", "Geography", [10, 11]),
      S("business-studies", "Business", [10, 11]),
      S("computer-science", "Computer Science", [10, 11]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "grade-9", label: "9", minPct: 0.9, tone: "top" },
      { id: "grade-8", label: "8", minPct: 0.82, tone: "top" },
      { id: "grade-7", label: "7", minPct: 0.74, tone: "high" },
      { id: "grade-6", label: "6", minPct: 0.64, tone: "high" },
      { id: "grade-5", label: "5", minPct: 0.54, tone: "pass" },
      { id: "grade-4", label: "4", minPct: 0.44, tone: "pass" },
      { id: "grade-3", label: "3", minPct: 0.3, tone: "fail" },
      { id: "grade-2", label: "2", minPct: 0.15, tone: "fail" },
      { id: "grade-1", label: "1", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Grade 4–5", merit: "Grade 6–7", excellence: "Grade 8–9" },
    promptConfig: {
      authorPersona: "an expert GCSE exam author (familiar with AQA, Edexcel and OCR specifications for England)",
      examinerPersona: "a GCSE examiner (England)",
      difficultySpread: "Spread the difficulty from Grade 4–5 level through Grade 8–9 level, as real GCSE papers ramp.",
      localContext: "Use British contexts where natural (UK places, GBP currency £, British institutions, etc.)",
    },
    status: "early-access",
    blurb: "GCSE-style questions with 9–1 grading across the core subjects.",
  },

  // ─────────────────────────────────────────────── UK · A-Levels (early access)
  // Sixth form (Years 12–13) — the qualification university offers hang on.
  // Board-agnostic like GCSE (AQA/Edexcel/OCR content overlap is heavy in
  // maths/sciences). Wales (WJEC) and NI (CCEA) use the same qualification.
  {
    id: "uk-alevel",
    country: "GB",
    countryLabel: "England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    system: "A-Level",
    label: "A-Levels · Years 12–13",
    levels: [
      {
        value: 12,
        label: "Year 12",
        promptDescriptor: "A-Level course, first year (Year 12 / AS-Level standard, England)",
        styleNote: "Match the style and question types of AS-Level and first-year A-Level examination papers (drawing on common content across AQA, Edexcel and OCR).",
        titlePrefix: "AS / A-Level Year 12",
      },
      {
        value: 13,
        label: "Year 13",
        promptDescriptor: "A-Level course, final year (Year 13, England)",
        styleNote: "Match the style, difficulty, and question types of real A-Level examination papers, including multi-step synoptic questions (drawing on common content across AQA, Edexcel and OCR).",
        titlePrefix: "A-Level",
      },
    ],
    subjects: [
      S("mathematics", "Mathematics", [12, 13]),
      S("further-maths", "Further Mathematics", [12, 13]),
      S("english", "English Literature", [12, 13]),
      S("biology", "Biology", [12, 13]),
      S("chemistry", "Chemistry", [12, 13]),
      S("physics", "Physics", [12, 13]),
      S("psychology", "Psychology", [12, 13]),
      S("economics", "Economics", [12, 13]),
      S("business-studies", "Business", [12, 13]),
      S("history", "History", [12, 13]),
      S("geography", "Geography", [12, 13]),
      S("sociology", "Sociology", [12, 13]),
      S("computer-science", "Computer Science", [12, 13]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a-star", label: "A*", minPct: 0.9, tone: "top" },
      { id: "a", label: "A", minPct: 0.8, tone: "high" },
      { id: "b", label: "B", minPct: 0.7, tone: "high" },
      { id: "c", label: "C", minPct: 0.6, tone: "pass" },
      { id: "d", label: "D", minPct: 0.5, tone: "pass" },
      { id: "e", label: "E", minPct: 0.4, tone: "pass" },
      { id: "u", label: "U", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Grade C–D", merit: "Grade B", excellence: "Grade A/A*" },
    promptConfig: {
      authorPersona: "an expert A-Level exam author (familiar with AQA, Edexcel and OCR specifications for England)",
      examinerPersona: "an A-Level examiner (England)",
      difficultySpread: "Spread the difficulty from routine AS-style questions through the demanding synoptic questions A-Level papers end with.",
      localContext: "Use British contexts where natural (UK places, GBP currency £, British institutions, etc.)",
    },
    status: "early-access",
    blurb: "A-Level-style practice with A*–E grading — built for sixth form.",
  },

  // ─────────────────────────────────────────────── UK · Scotland SQA (early access)
  // Scotland runs its own national system — National 5 (S4), Highers (S5, the
  // university-entrance qualification), Advanced Highers (S6).
  {
    id: "uk-sqa",
    country: "GB",
    countryLabel: "Scotland",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    system: "SQA",
    label: "National 5 & Highers (Scotland) · S4–S6",
    levels: [
      {
        value: 10,
        label: "S4 · Nat 5",
        promptDescriptor: "SQA National 5 course (Scotland, S4)",
        styleNote: "Match the style and question types of real SQA National 5 examination papers.",
        titlePrefix: "National 5",
      },
      {
        value: 11,
        label: "S5 · Higher",
        promptDescriptor: "SQA Higher course (Scotland, S5)",
        styleNote: "Match the style and question types of real SQA Higher examination papers.",
        titlePrefix: "Higher",
      },
      {
        value: 12,
        label: "S6 · Adv Higher",
        promptDescriptor: "SQA Advanced Higher course (Scotland, S6)",
        styleNote: "Match the style and question types of real SQA Advanced Higher examination papers.",
        titlePrefix: "Advanced Higher",
      },
    ],
    subjects: [
      S("mathematics", "Mathematics", [10, 11, 12]),
      S("english", "English", [10, 11, 12]),
      S("biology", "Biology", [10, 11, 12]),
      S("chemistry", "Chemistry", [10, 11, 12]),
      S("physics", "Physics", [10, 11, 12]),
      S("history", "History", [10, 11, 12]),
      S("geography", "Geography", [10, 11]),
      S("modern-studies", "Modern Studies", [10, 11]),
      S("business-studies", "Business Management", [10, 11, 12]),
      S("computer-science", "Computing Science", [10, 11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "a", label: "A", minPct: 0.7, tone: "top" },
      { id: "b", label: "B", minPct: 0.6, tone: "high" },
      { id: "c", label: "C", minPct: 0.5, tone: "pass" },
      { id: "d", label: "D", minPct: 0.4, tone: "pass" },
      { id: "no-award", label: "No Award", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Grade C", merit: "Grade B", excellence: "Grade A" },
    promptConfig: {
      authorPersona: "an expert SQA exam author (Scottish Qualifications Authority)",
      examinerPersona: "an SQA marker (Scotland)",
      difficultySpread: "Spread the difficulty across the range SQA papers cover, from C-grade demand through A-grade demand.",
      localContext: "Use Scottish and British contexts where natural (Scottish places, GBP currency £, Scottish institutions, etc.)",
    },
    status: "early-access",
    blurb: "Nat 5, Higher and Advanced Higher practice, SQA-style.",
  },

  // ─────────────────────────────────────────────── US · AP + SAT (early access)
  {
    id: "us-ap-sat",
    country: "US",
    countryLabel: "United States",
    flag: "🇺🇸",
    system: "AP · SAT · ACT",
    label: "AP courses + SAT/ACT prep · Grades 9–12",
    levels: [
      {
        value: 11,
        label: "Grade 11",
        promptDescriptor: "AP course / SAT preparation (US, Grade 11)",
        styleNote: "Match College Board question style — AP multiple-choice and free-response, or SAT-style questions for SAT subjects.",
        titlePrefix: "AP/SAT",
      },
      {
        value: 12,
        label: "Grade 12",
        promptDescriptor: "AP course (US, Grade 12)",
        styleNote: "Match College Board AP examination style — multiple-choice and free-response questions.",
        titlePrefix: "AP",
      },
    ],
    subjects: [
      S("mathematics", "AP Calculus AB", [11, 12]),
      S("statistics", "AP Statistics", [11, 12]),
      S("biology", "AP Biology", [11, 12]),
      S("chemistry", "AP Chemistry", [11, 12]),
      S("physics", "AP Physics 1", [11, 12]),
      S("psychology", "AP Psychology", [11, 12]),
      S("english", "AP English Language", [11, 12]),
      S("modern-history", "AP US History", [11, 12]),
      S("economics", "AP Economics (Micro)", [11, 12]),
      S("sat-math", "SAT Math", [11]),
      S("sat-english", "SAT Reading & Writing", [11]),
      S("act-math", "ACT Math", [11]),
      S("act-english", "ACT English", [11]),
      S("act-reading", "ACT Reading", [11]),
      S("act-science", "ACT Science", [11]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "ap-5", label: "5", minPct: 0.85, tone: "top" },
      { id: "ap-4", label: "4", minPct: 0.7, tone: "high" },
      { id: "ap-3", label: "3", minPct: 0.5, tone: "pass" },
      { id: "ap-2", label: "2", minPct: 0.3, tone: "fail" },
      { id: "ap-1", label: "1", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Foundational", merit: "Proficient", excellence: "Advanced" },
    promptConfig: {
      authorPersona: "an expert College Board-style question author for AP courses and the SAT",
      examinerPersona: "an AP reader / SAT scorer (College Board style)",
      difficultySpread: "Spread the difficulty across the range a real AP exam covers, from accessible to discriminating questions.",
      localContext: "Use American contexts where natural (US places, USD currency $, US institutions, etc.)",
    },
    status: "early-access",
    blurb: "AP-style FRQs and SAT-style practice, scored honestly.",
  },

  // ─────────────────────────────────────────────── US · NY Regents (early access)
  // The one US state with a true exam system — course-based Regents exams.
  {
    id: "us-ny-regents",
    country: "US",
    countryLabel: "United States",
    flag: "🇺🇸",
    system: "Regents",
    label: "Regents Exams (New York) · Grades 9–12",
    levels: [
      { value: 9, label: "Grade 9", promptDescriptor: "New York Regents course, Grade 9 (e.g. Algebra I, Living Environment)", styleNote: "Match the style and question types of real New York State Regents Examinations — Part I multiple choice plus constructed-response parts.", titlePrefix: "Regents" },
      { value: 10, label: "Grade 10", promptDescriptor: "New York Regents course, Grade 10 (e.g. Geometry, Global History)", styleNote: "Match the style and question types of real New York State Regents Examinations — Part I multiple choice plus constructed-response parts.", titlePrefix: "Regents" },
      { value: 11, label: "Grade 11", promptDescriptor: "New York Regents course, Grade 11 (e.g. Algebra II, English, US History)", styleNote: "Match the style and question types of real New York State Regents Examinations — Part I multiple choice plus constructed-response parts.", titlePrefix: "Regents" },
      { value: 12, label: "Grade 12", promptDescriptor: "New York Regents course, Grade 12 (e.g. Physics)", styleNote: "Match the style and question types of real New York State Regents Examinations — Part I multiple choice plus constructed-response parts.", titlePrefix: "Regents" },
    ],
    subjects: [
      S("mathematics", "Algebra I", [9]),
      S("geometry", "Geometry", [10]),
      S("algebra-2", "Algebra II", [11]),
      S("english", "English Language Arts", [11]),
      S("biology", "Living Environment", [9, 10]),
      S("earth-science", "Earth Science", [9, 10]),
      S("chemistry", "Chemistry", [11]),
      S("physics", "Physics", [12]),
      S("us-history", "US History & Government", [11]),
      S("global-history", "Global History & Geography II", [10]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "mastery", label: "Mastery (85+)", minPct: 0.85, tone: "top" },
      { id: "proficient", label: "Proficient", minPct: 0.75, tone: "high" },
      { id: "passing", label: "Passing (65+)", minPct: 0.65, tone: "pass" },
      { id: "not-passing", label: "Not Passing", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Passing", merit: "Proficient", excellence: "Mastery" },
    promptConfig: {
      authorPersona: "an expert New York State Regents examination author (NYSED style)",
      examinerPersona: "a New York State Regents exam scorer",
      difficultySpread: "Spread the difficulty from routine Part I-style questions through the demanding constructed-response items Regents exams end with.",
      localContext: "Use American contexts where natural (US places, USD currency $, US institutions, etc.)",
    },
    status: "early-access",
    blurb: "Regents-style practice with the 65-pass / 85-mastery scale.",
  },

  // ─────────────────────────────────────────────── US · Texas STAAR EOC (early access)
  {
    id: "us-tx-staar",
    country: "US",
    countryLabel: "United States",
    flag: "🇺🇸",
    system: "STAAR",
    label: "STAAR EOC (Texas) · Grades 9–11",
    levels: [
      { value: 9, label: "Grade 9", promptDescriptor: "Texas STAAR End-of-Course assessment, Grade 9 course (e.g. Algebra I, English I, Biology)", styleNote: "Match the style of STAAR EOC assessments — multiple choice with occasional griddable and short constructed-response items.", titlePrefix: "STAAR EOC" },
      { value: 10, label: "Grade 10", promptDescriptor: "Texas STAAR End-of-Course assessment, Grade 10 course (e.g. English II)", styleNote: "Match the style of STAAR EOC assessments — multiple choice with occasional griddable and short constructed-response items.", titlePrefix: "STAAR EOC" },
      { value: 11, label: "Grade 11", promptDescriptor: "Texas STAAR End-of-Course assessment, Grade 11 course (e.g. US History)", styleNote: "Match the style of STAAR EOC assessments — multiple choice with occasional griddable and short constructed-response items.", titlePrefix: "STAAR EOC" },
    ],
    subjects: [
      S("mathematics", "Algebra I", [9]),
      S("english", "English I & II", [9, 10]),
      S("biology", "Biology", [9, 10]),
      S("us-history", "US History", [11]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "masters", label: "Masters Grade Level", minPct: 0.83, tone: "top" },
      { id: "meets", label: "Meets Grade Level", minPct: 0.62, tone: "high" },
      { id: "approaches", label: "Approaches Grade Level", minPct: 0.42, tone: "pass" },
      { id: "did-not-meet", label: "Did Not Meet", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Approaches", merit: "Meets", excellence: "Masters" },
    promptConfig: {
      authorPersona: "an expert Texas STAAR End-of-Course item writer (TEA style)",
      examinerPersona: "a Texas STAAR EOC scorer",
      difficultySpread: "Spread the difficulty across the range STAAR EOC assessments cover, from Approaches through Masters grade level.",
      localContext: "Use American contexts where natural (US places, USD currency $, US institutions, etc.)",
    },
    status: "early-access",
    blurb: "STAAR EOC-style practice for the five graduation-required exams.",
  },

  // ─────────────────────────────────────────────── US · Florida EOC (early access)
  {
    id: "us-fl-eoc",
    country: "US",
    countryLabel: "United States",
    flag: "🇺🇸",
    system: "FL EOC",
    label: "Florida B.E.S.T. EOC · Grades 9–11",
    levels: [
      { value: 9, label: "Grade 9", promptDescriptor: "Florida B.E.S.T. End-of-Course assessment, Grade 9 course (e.g. Algebra 1, Biology)", styleNote: "Match the style of Florida statewide EOC assessments — multiple choice and technology-enhanced style items.", titlePrefix: "Florida EOC" },
      { value: 10, label: "Grade 10", promptDescriptor: "Florida B.E.S.T. End-of-Course assessment, Grade 10 course (e.g. Geometry)", styleNote: "Match the style of Florida statewide EOC assessments — multiple choice and technology-enhanced style items.", titlePrefix: "Florida EOC" },
      { value: 11, label: "Grade 11", promptDescriptor: "Florida B.E.S.T. End-of-Course assessment, Grade 11 course (e.g. US History)", styleNote: "Match the style of Florida statewide EOC assessments — multiple choice and technology-enhanced style items.", titlePrefix: "Florida EOC" },
    ],
    subjects: [
      S("mathematics", "Algebra 1", [9]),
      S("geometry", "Geometry", [10]),
      S("english", "B.E.S.T. ELA", [9, 10]),
      S("biology", "Biology 1", [9, 10]),
      S("us-history", "US History", [11]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "level-5", label: "Level 5", minPct: 0.84, tone: "top" },
      { id: "level-4", label: "Level 4", minPct: 0.7, tone: "high" },
      { id: "level-3", label: "Level 3 (Passing)", minPct: 0.55, tone: "pass" },
      { id: "level-2", label: "Level 2", minPct: 0.3, tone: "fail" },
      { id: "level-1", label: "Level 1", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Level 3", merit: "Level 4", excellence: "Level 5" },
    promptConfig: {
      authorPersona: "an expert Florida B.E.S.T. End-of-Course item writer",
      examinerPersona: "a Florida statewide EOC scorer",
      difficultySpread: "Spread the difficulty across achievement Levels 3 to 5, as Florida EOC assessments do.",
      localContext: "Use American contexts where natural (US places, USD currency $, US institutions, etc.)",
    },
    status: "early-access",
    blurb: "Florida EOC-style practice for Algebra 1, Geometry, Biology and more.",
  },

  // ─────────────────────────────────────────────── CA · Ontario (early access)
  {
    id: "ca-ontario",
    country: "CA",
    countryLabel: "Canada",
    flag: "🇨🇦",
    system: "Ontario",
    label: "Ontario curriculum · Grades 9–12",
    levels: [
      { value: 9, label: "Grade 9", promptDescriptor: "Ontario Grade 9 (de-streamed curriculum)", styleNote: "Match Ontario Grade 9 assessment style (including EQAO-style items for math).", titlePrefix: "Grade 9 (Ontario)" },
      { value: 10, label: "Grade 10", promptDescriptor: "Ontario Grade 10 (academic)", styleNote: "Match Ontario Grade 10 course assessment style.", titlePrefix: "Grade 10 (Ontario)" },
      { value: 11, label: "Grade 11", promptDescriptor: "Ontario Grade 11 (university preparation, U-level)", styleNote: "Match Ontario Grade 11 U-level course assessment style.", titlePrefix: "Grade 11 (Ontario)" },
      { value: 12, label: "Grade 12", promptDescriptor: "Ontario Grade 12 (university preparation, U-level)", styleNote: "Match Ontario Grade 12 U-level final examination style.", titlePrefix: "Grade 12 (Ontario)" },
    ],
    subjects: [
      S("mathematics", "Mathematics", [9, 10, 11, 12]),
      S("english", "English", [9, 10, 11, 12]),
      S("science", "Science", [9, 10]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("history", "Canadian History", [10]),
      S("geography", "Geography", [9]),
      S("business-studies", "Business", [11, 12]),
      S("economics", "Economics", [11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "level-4", label: "Level 4", minPct: 0.8, tone: "top" },
      { id: "level-3", label: "Level 3", minPct: 0.7, tone: "high" },
      { id: "level-2", label: "Level 2", minPct: 0.6, tone: "pass" },
      { id: "level-1", label: "Level 1", minPct: 0.5, tone: "fail" },
      { id: "below", label: "Below Level 1", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Level 2", merit: "Level 3", excellence: "Level 4" },
    promptConfig: {
      authorPersona: "an expert Ontario curriculum assessment author",
      examinerPersona: "an Ontario teacher marking to the provincial achievement chart",
      difficultySpread: "Spread the difficulty across achievement Levels 2 to 4, as Ontario assessments do.",
      localContext: "Use Canadian contexts where natural (Canadian places, CAD currency $, Canadian institutions, etc.)",
    },
    status: "early-access",
    blurb: "Ontario-style course practice with levels-based feedback.",
  },

  // ─────────────────────────────────────────────── CA · Alberta Diploma (early access)
  // Canada's most exam-like system — Grade 12 Diploma Examinations.
  // NWT and Nunavut follow the Alberta curriculum, so this card covers them too.
  {
    id: "ca-alberta",
    country: "CA",
    countryLabel: "Canada",
    flag: "🇨🇦",
    system: "Alberta",
    label: "Alberta Diploma · Grades 10–12 (+ NWT/NU)",
    levels: [
      { value: 10, label: "Grade 10", promptDescriptor: "Alberta 10-level course (Grade 10)", styleNote: "Match the style of Alberta Education course assessments at the 10-level.", titlePrefix: "Alberta Grade 10" },
      { value: 11, label: "Grade 11", promptDescriptor: "Alberta 20-level course (Grade 11)", styleNote: "Match the style of Alberta Education course assessments at the 20-level.", titlePrefix: "Alberta Grade 11" },
      { value: 12, label: "Grade 12", promptDescriptor: "Alberta 30-level course with Diploma Examination (Grade 12)", styleNote: "Match the style and question types of real Alberta Diploma Examinations — machine-scored items plus written-response questions.", titlePrefix: "Alberta Diploma" },
    ],
    subjects: [
      S("mathematics", "Mathematics (-1/-2)", [10, 11, 12]),
      S("english", "English Language Arts", [10, 11, 12]),
      S("biology", "Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("science", "Science", [10]),
      S("social-studies", "Social Studies", [10, 11, 12]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "excellence-standard", label: "Standard of Excellence", minPct: 0.8, tone: "top" },
      { id: "above-acceptable", label: "Above Acceptable", minPct: 0.65, tone: "high" },
      { id: "acceptable", label: "Acceptable Standard", minPct: 0.5, tone: "pass" },
      { id: "below-acceptable", label: "Below Acceptable", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Acceptable", merit: "Above Acceptable", excellence: "Excellence Standard" },
    promptConfig: {
      authorPersona: "an expert Alberta Education Diploma Examination author",
      examinerPersona: "an Alberta Diploma Examination marker",
      difficultySpread: "Spread the difficulty from Acceptable Standard through Standard of Excellence, as Diploma Exams do.",
      localContext: "Use Canadian contexts where natural (Canadian places, CAD currency $, Canadian institutions, etc.)",
    },
    status: "early-access",
    blurb: "Diploma Exam-style practice with Alberta's achievement standards.",
  },

  // ─────────────────────────────────────────────── CA · British Columbia (early access)
  // BC's Graduation Assessments (Numeracy 10, Literacy 10/12) + course practice,
  // marked on the provincial proficiency scale. Yukon follows BC.
  {
    id: "ca-bc",
    country: "CA",
    countryLabel: "Canada",
    flag: "🇨🇦",
    system: "BC",
    label: "British Columbia · Grades 10–12 (+ Yukon)",
    levels: [
      { value: 10, label: "Grade 10", promptDescriptor: "British Columbia Grade 10 course (including Graduation Numeracy and Literacy Assessment preparation)", styleNote: "Match the style of BC course assessments and the Graduation Numeracy/Literacy Assessments — contextual, multi-step problems.", titlePrefix: "BC Grade 10" },
      { value: 11, label: "Grade 11", promptDescriptor: "British Columbia Grade 11 course", styleNote: "Match the style of BC Grade 11 course assessments under the redesigned curriculum.", titlePrefix: "BC Grade 11" },
      { value: 12, label: "Grade 12", promptDescriptor: "British Columbia Grade 12 course (including Literacy 12 Assessment preparation)", styleNote: "Match the style of BC Grade 12 course assessments and the Grade 12 Literacy Assessment.", titlePrefix: "BC Grade 12" },
    ],
    subjects: [
      S("mathematics", "Mathematics (FoM / Pre-Calc)", [10, 11, 12]),
      S("english", "English Studies", [10, 11, 12]),
      S("science", "Science", [10]),
      S("biology", "Life Sciences / Biology", [11, 12]),
      S("chemistry", "Chemistry", [11, 12]),
      S("physics", "Physics", [11, 12]),
      S("social-studies", "Social Studies", [10, 11]),
    ],
    freeSubjects: ["mathematics", "english"],
    gradeBands: [
      { id: "extending", label: "Extending", minPct: 0.85, tone: "top" },
      { id: "proficient", label: "Proficient", minPct: 0.65, tone: "high" },
      { id: "developing", label: "Developing", minPct: 0.4, tone: "pass" },
      { id: "emerging", label: "Emerging", minPct: 0, tone: "fail" },
    ],
    difficultyLabels: { achieved: "Developing", merit: "Proficient", excellence: "Extending" },
    promptConfig: {
      authorPersona: "an expert British Columbia curriculum assessment author (BC Ministry of Education style)",
      examinerPersona: "a BC assessment marker using the provincial proficiency scale",
      difficultySpread: "Spread the difficulty across the proficiency scale from Developing through Extending.",
      localContext: "Use Canadian contexts where natural (Canadian places, CAD currency $, Canadian institutions, etc.)",
    },
    status: "early-access",
    blurb: "BC course + Graduation Assessment practice on the proficiency scale.",
  },
];

export const DEFAULT_CURRICULUM_ID = "nz-ncea";

export const LIVE_CURRICULA = CURRICULA.filter((c) => c.status === "live");
export const EARLY_ACCESS_CURRICULA = CURRICULA.filter((c) => c.status === "early-access");
export const COMING_CURRICULA = CURRICULA.filter((c) => c.status === "coming-soon");
/** Curricula a student can actually generate papers in */
export const USABLE_CURRICULA = CURRICULA.filter((c) => c.status === "live" || c.status === "early-access");

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

/** Resolve with fallback — unknown/missing ids default to NCEA so nothing breaks */
export function resolveCurriculum(id: string | null | undefined): Curriculum {
  return getCurriculum(id ?? "") ?? CURRICULA[0];
}

/** Band a percentage score into this curriculum's grade scale */
export function bandForPct(curriculum: Curriculum, pct: number): GradeBand {
  for (const band of curriculum.gradeBands) {
    if (pct >= band.minPct) return band;
  }
  return curriculum.gradeBands[curriculum.gradeBands.length - 1];
}

/** Is this subject on the free tier for this curriculum? */
export function isSubjectFree(curriculum: Curriculum, subject: string): boolean {
  return curriculum.freeSubjects.includes(subject);
}
