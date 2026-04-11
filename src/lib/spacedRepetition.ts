// Spaced repetition using a simplified SM-2 algorithm
// Questions the student got wrong come back at increasing intervals
// until mastered — the same way Anki and Duolingo work.

const REVIEW_KEY = "exam-practice-nz-reviews";

export interface ReviewItem {
  questionId: string;
  examId: string;
  questionText: string;
  // SM-2 state
  ease: number; // difficulty factor (starts at 2.5, min 1.3)
  interval: number; // days until next review
  repetitions: number; // successful reviews in a row
  nextReview: string; // ISO date
  lastReviewed: string; // ISO date
  // Metadata
  topics: string[];
}

export interface ReviewStore {
  items: Record<string, ReviewItem>; // keyed by questionId
}

function loadStore(): ReviewStore {
  if (typeof window === "undefined") return { items: {} };
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    if (!raw) return { items: {} };
    return JSON.parse(raw) as ReviewStore;
  } catch {
    return { items: {} };
  }
}

function saveStore(store: ReviewStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVIEW_KEY, JSON.stringify(store));
  notify();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Record a review result. Quality is 0-5 like SM-2:
 * 0-2 = incorrect, 3 = barely correct, 4 = correct, 5 = perfect
 * For our simplified model: 0 = wrong, 3 = partial, 5 = correct.
 */
export function recordReview(
  questionId: string,
  examId: string,
  questionText: string,
  topics: string[],
  quality: 0 | 3 | 5
) {
  const store = loadStore();
  const existing = store.items[questionId];
  const now = new Date();

  let ease = existing?.ease ?? 2.5;
  let interval = existing?.interval ?? 1;
  let repetitions = existing?.repetitions ?? 0;

  if (quality < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed — increase interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease);
    }
    repetitions += 1;
    // Update ease factor
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }

  store.items[questionId] = {
    questionId,
    examId,
    questionText,
    ease,
    interval,
    repetitions,
    nextReview: addDays(now, interval).toISOString(),
    lastReviewed: now.toISOString(),
    topics,
  };

  saveStore(store);
}

/**
 * Get questions that are due for review today.
 */
export function getDueReviews(): ReviewItem[] {
  const store = loadStore();
  const now = new Date().toISOString();
  return Object.values(store.items)
    .filter((item) => item.nextReview <= now)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

/**
 * Get count of reviews due today.
 */
export function getDueCount(): number {
  return getDueReviews().length;
}

/**
 * Get all review items (for dashboard/stats).
 */
export function getAllReviews(): ReviewItem[] {
  return Object.values(loadStore().items);
}

/**
 * Get stats for the dashboard.
 */
export function getReviewStats() {
  const items = getAllReviews();
  const now = new Date().toISOString();
  const due = items.filter((i) => i.nextReview <= now).length;
  const mastered = items.filter((i) => i.repetitions >= 5).length;
  const learning = items.filter((i) => i.repetitions > 0 && i.repetitions < 5).length;
  const newItems = items.filter((i) => i.repetitions === 0).length;
  return { total: items.length, due, mastered, learning, new: newItems };
}

/**
 * Remove a question from the review queue (e.g. mastered completely).
 */
export function removeFromReviews(questionId: string) {
  const store = loadStore();
  delete store.items[questionId];
  saveStore(store);
}

// ── External-store subscription API for useSyncExternalStore ──
// React 19 / Next 16 forbids calling setState directly inside useEffect
// bodies. Components that read from localStorage (a genuine external store)
// should go through useSyncExternalStore instead. We expose a version
// counter that bumps on every save, and a subscribe function that fires
// on same-tab writes and cross-tab storage events.

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

/** Subscribe to review-store changes. Returns an unsubscribe function. */
export function subscribeReviews(listener: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === REVIEW_KEY) notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot getter for useSyncExternalStore — returns current version. */
export function getReviewsVersion(): number {
  return version;
}

/** SSR snapshot — always 0 so server and first-client render match. */
export function getServerReviewsVersion(): number {
  return 0;
}
