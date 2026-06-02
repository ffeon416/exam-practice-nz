// Single source of truth for "is this question safe to show a student?"
// Mirrors the validateGraphReferences logic in claude.ts but runs at LOAD time
// for AI-generated practice papers cached in localStorage — so older papers
// (generated before the validator existed, or by a path that skipped it) can
// never reach a student with the misleading "see the table above" wording and
// no actual table.

import type { Question } from "./types";

// Regexes that flag a question text as referencing a visual that, if absent,
// would leave the question unanswerable or misleading.
const VISUAL_REFERENCES: RegExp[] = [
  /\bthe\s+(graph|chart|diagram|figure|table|histogram|scatter\s*plot|box[-\s]?plot|number\s*line|pie\s*chart)\b/i,
  /\b(graph|chart|diagram|table|figure)\s+(above|below|to\s+the\s+(right|left)|shown)\b/i,
  /\b(above|below)\s+(shows|illustrates|displays|depicts|gives)\b/i,
  /\bas\s+shown\b/i,
  /\bshown\s+(above|below|in\s+the)\b/i,
  /\bfrom\s+the\s+(graph|chart|table|figure|diagram|histogram|scatter)\b/i,
  /\buse\s+the\s+(graph|chart|table|figure|diagram)\b/i,
  /\binterpret\s+the\s+(graph|chart|table|figure|diagram)\b/i,
  /\bin\s+the\s+(graph|chart|table|figure|diagram)\b/i,
  /\busing\s+the\s+(graph|chart|table|figure|diagram)\b/i,
  /\bcomplete\s+the\s+table\b/i,
];

// "draw/sketch/plot" instructions — students can't draw in the UI.
const ASK_TO_DRAW =
  /\b(draw|sketch|plot|construct)\s+(?:a\s+|an\s+|the\s+|its\s+|their\s+|your\s+|on\s+(?:the\s+)?)?(?:\w+\s+)?(graph|chart|diagram|curve|histogram|box[-\s]?plot|scatter\s*plot|number\s*line|parabola|hyperbola|function|axes|line\s+of\s+best\s+fit|points?)\b/i;

// "the graph of f(x)" / "rolls along the table" — math notation / physical
// surfaces. These trigger VISUAL_REFERENCES but the question is self-contained
// and a student would not be looking for a missing visual. Exclude them.
const SAFE_FALSE_POSITIVES: RegExp[] = [
  /\bthe\s+graph\s+of\s+(?:y\s*=|f|g|h|f\s*'|g\s*'|h\s*'|y)\b/i,
  /\balong\s+the\s+table\b/i,
  /\babove\s+the\s+table\s+(surface|top)\b/i,
  /\bthe\s+table\s+(top|surface|edge)\b/i,
  /\bshown\s+in\s+the\s+text\b/i,
];

export function questionReferencesMissingVisual(q: Pick<Question, "text" | "graph" | "image">): boolean {
  const text = String(q.text ?? "");
  if (q.graph || q.image) return false;
  const looksLikeVisualRef = VISUAL_REFERENCES.some((rx) => rx.test(text));
  if (!looksLikeVisualRef) return false;
  return !SAFE_FALSE_POSITIVES.some((rx) => rx.test(text));
}

export function questionAsksStudentToDraw(q: Pick<Question, "text" | "graph" | "image">): boolean {
  return ASK_TO_DRAW.test(String(q.text ?? ""));
}

// True iff this question can NEVER be answered correctly by a student in this
// UI (missing visual, or asks them to physically draw something).
export function isQuestionBroken(q: Pick<Question, "text" | "graph" | "image">): boolean {
  return questionReferencesMissingVisual(q) || questionAsksStudentToDraw(q);
}
