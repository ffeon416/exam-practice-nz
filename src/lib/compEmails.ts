// Accounts that hold a paid tier but don't pay real money (owner test
// accounts, 100%-off comps). They keep their access, but nothing that counts
// customers or revenue should count them.
export const COMP_EMAILS = new Set<string>([
  "ffeon.io+test1@gmail.com",
  "osullivantre2009@gmail.com",
  "roccopovey@gmail.com", // co-founder, 100%-off Pro
]);

export function isComp(email: unknown): boolean {
  return typeof email === "string" && COMP_EMAILS.has(email.toLowerCase().trim());
}
