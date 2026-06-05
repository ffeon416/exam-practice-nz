// Per-user namespacing for all client-side (localStorage) state.
//
// Every student's progress, reviews, ratings, plan, onboarding and custom exams
// live under a key suffixed with their Clerk user id. This is the hard guarantee
// that one account can NEVER read another account's data on a shared browser
// (e.g. signing up with a +alias on a device that was already used) — the new
// account simply reads an empty namespace and starts at zero.
//
// Fail-safe by design: when the current user id is unknown (logged out, or
// before Clerk has hydrated) reads/writes go to an `::anon` namespace, which is
// never a real user's data — so the worst case is "shows empty", never "shows
// someone else's numbers".

let uid: string | null = null;
const listeners = new Set<() => void>();

/** Set the active user id (call when Clerk resolves / the account changes). */
export function setScopeUserId(id: string | null): void {
  if (uid === id) return;
  uid = id;
  // Tell every external store to re-read under the new namespace.
  listeners.forEach((l) => l());
}

export function getScopeUserId(): string | null {
  return uid;
}

/** Namespaced storage key for the current user. */
export function scopedKey(base: string): string {
  return `${base}::${uid ?? "anon"}`;
}

/**
 * Subscribe to scope (account) changes. Used by the useSyncExternalStore-backed
 * libs so a sign-in/account-switch bumps their version and forces a re-read.
 * Returns an unsubscribe function.
 */
export function onScopeChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
