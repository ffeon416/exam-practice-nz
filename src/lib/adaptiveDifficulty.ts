// Adaptive difficulty system.
// Tracks a per-topic ELO-style rating that drifts up when the student
// answers hard questions correctly and drifts down when they slip on easy
// ones. The recommended difficulty level is whichever NCEA grade (Achieved /
// Merit / Excellence) is closest to the student's current rating for the
// topic.
//
// Storage and the external-store subscription API mirror spacedRepetition.ts
// so React 19 components can read via useSyncExternalStore.

const RATINGS_KEY = "adaptive-ratings";

export type GradeLevel = "achieved" | "merit" | "excellence";

export const DEFAULT_RATING = 1200;
const K_FACTOR = 32; // ELO update step. Standard chess-ish value.

export const QUESTION_DIFFICULTY: Record<GradeLevel, number> = {
  achieved: 1100,
  merit: 1300,
  excellence: 1500,
};

interface RatingsStore {
  // Topic id → current rating.
  ratings: Record<string, number>;
}

function loadStore(): RatingsStore {
  if (typeof window === "undefined") return { ratings: {} };
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    if (!raw) return { ratings: {} };
    const parsed = JSON.parse(raw) as Partial<RatingsStore>;
    return { ratings: parsed.ratings ?? {} };
  } catch {
    return { ratings: {} };
  }
}

function saveStore(store: RatingsStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(store));
    notify();
  } catch {
    // Storage full or disabled — fail silently
  }
}

/**
 * Expected score for player A against player B under the ELO formula.
 * Returns a value in [0, 1] — 0.5 means an even match.
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update the student's rating for every topic touched by a question.
 * - Correct answer on a question above your rating → big gain.
 * - Correct answer on a question below your rating → small gain.
 * - Incorrect answer on a question above your rating → small loss.
 * - Incorrect answer on a question below your rating → big loss.
 */
export function updateRating(
  topic: string,
  gradeLevel: GradeLevel,
  correct: boolean
): void {
  if (!topic) return;
  const store = loadStore();
  const current = store.ratings[topic] ?? DEFAULT_RATING;
  const questionRating = QUESTION_DIFFICULTY[gradeLevel];

  const expected = expectedScore(current, questionRating);
  const actual = correct ? 1 : 0;
  const next = current + K_FACTOR * (actual - expected);

  // Clamp to a sane range so one bad day doesn't tank the score forever.
  store.ratings[topic] = Math.max(600, Math.min(2400, Math.round(next)));
  saveStore(store);
}

/**
 * Current rating for a topic, defaulting to DEFAULT_RATING for unseen topics.
 */
export function getTopicRating(topic: string): number {
  const store = loadStore();
  return store.ratings[topic] ?? DEFAULT_RATING;
}

/**
 * Pick the difficulty level whose rating is closest to the student's current
 * rating for this topic.
 */
export function getRecommendedLevel(topic: string): GradeLevel {
  const rating = getTopicRating(topic);
  let best: GradeLevel = "achieved";
  let bestDelta = Infinity;
  (Object.keys(QUESTION_DIFFICULTY) as GradeLevel[]).forEach((level) => {
    const delta = Math.abs(rating - QUESTION_DIFFICULTY[level]);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = level;
    }
  });
  return best;
}

/**
 * Snapshot of every tracked topic rating. Returns a fresh object so callers
 * can't mutate the underlying store.
 */
export function getAllRatings(): Record<string, number> {
  return { ...loadStore().ratings };
}

/** Convert a numeric rating to the matching grade level label. */
export function ratingToLevel(rating: number): GradeLevel {
  let best: GradeLevel = "achieved";
  let bestDelta = Infinity;
  (Object.keys(QUESTION_DIFFICULTY) as GradeLevel[]).forEach((level) => {
    const delta = Math.abs(rating - QUESTION_DIFFICULTY[level]);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = level;
    }
  });
  return best;
}

// ── External-store subscription API for useSyncExternalStore ──
// Same pattern as spacedRepetition.ts — React 19 components should read
// localStorage through useSyncExternalStore, not useEffect + setState.

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

/** Subscribe to rating changes. Returns an unsubscribe function. */
export function subscribeRatings(listener: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === RATINGS_KEY) notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot getter for useSyncExternalStore — returns current version. */
export function getRatingsVersion(): number {
  return version;
}

/** SSR snapshot — always 0 so server and first-client render match. */
export function getServerRatingsVersion(): number {
  return 0;
}
