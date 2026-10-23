// Signed links in parent emails. Server-only.
//
//   /go?t=…      signs the parent in (no password) and goes to a page
//   /cancel?t=…  one-click cancel for one subscription
//   /keep?t=…    "Keep the plan going" (opts out of the auto-cancel promise)
//
// HMAC-SHA256 with INVITE_SECRET, each kind domain-separated ("go:" vs
// "cancel:" vs the invite links' "invite:"), so one kind can never be passed
// off as another. Links expire. Opening a link never acts by itself: /go mints
// a short-lived Clerk ticket only when the page runs, and /cancel needs a tap
// on its confirm button — so email scanners that pre-open links do nothing.

import { createHmac, timingSafeEqual } from "node:crypto";
import { siteOrigin } from "./inviteLink";

type Kind = "go" | "cancel" | "keep";

function key(): string {
  const s = process.env.INVITE_SECRET;
  if (!s || s.length < 32) throw new Error("INVITE_SECRET is missing or shorter than 32 characters.");
  return s;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function sign(kind: Kind, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${kind}:${body}`).digest("base64url").slice(0, 32);
}

export function makeToken(kind: Kind, fields: string[], ttlDays: number, opts: { secret?: string; now?: number } = {}): string {
  const exp = Math.floor((opts.now ?? Date.now()) / 1000) + Math.round(ttlDays * 86400);
  const body = b64([...fields, String(exp)].join("|"));
  return `${body}.${sign(kind, body, opts.secret ?? key())}`;
}

export function readToken(kind: Kind, token: string, opts: { secret?: string; now?: number } = {}): string[] | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || body.length > 600) return null;
  const want = Buffer.from(sign(kind, body, opts.secret ?? key()));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const parts = unb64(body).split("|");
  const exp = Number(parts.pop());
  if (!Number.isFinite(exp) || exp < Math.floor((opts.now ?? Date.now()) / 1000)) return null;
  return parts;
}

const SAFE_PATHS = ["/invite", "/profile"];

/** Sign-in link for a parent, landing on an internal page. 7 days. */
export function parentLink(parentUserId: string, to: "/invite" | "/profile" = "/invite"): string {
  return `${siteOrigin()}/go?t=${makeToken("go", [parentUserId, to], 7)}`;
}

export function readParentLink(token: string): { parentUserId: string; to: string } | null {
  const f = readToken("go", token);
  if (!f || f.length !== 2 || !/^user_[A-Za-z0-9]+$/.test(f[0])) return null;
  return { parentUserId: f[0], to: SAFE_PATHS.includes(f[1]) ? f[1] : "/invite" };
}

/** One-click cancel for one subscription. 30 days. */
export function cancelLink(subscriptionId: string, parentUserId: string): string {
  return `${siteOrigin()}/cancel?t=${makeToken("cancel", [subscriptionId, parentUserId], 30)}`;
}

export function readCancelLink(token: string): { subscriptionId: string; parentUserId: string } | null {
  const f = readToken("cancel", token);
  if (!f || f.length !== 2 || !/^sub_[A-Za-z0-9]+$/.test(f[0]) || !/^user_[A-Za-z0-9]+$/.test(f[1])) return null;
  return { subscriptionId: f[0], parentUserId: f[1] };
}

/** "Keep the plan going" from the day-5 email (charge on day 7 without a grade check). 7 days. */
export function keepLink(subscriptionId: string, parentUserId: string): string {
  return `${siteOrigin()}/keep?t=${makeToken("keep", [subscriptionId, parentUserId], 7)}`;
}

export function readKeepLink(token: string): { subscriptionId: string; parentUserId: string } | null {
  const f = readToken("keep", token);
  if (!f || f.length !== 2 || !/^sub_[A-Za-z0-9]+$/.test(f[0]) || !/^user_[A-Za-z0-9]+$/.test(f[1])) return null;
  return { subscriptionId: f[0], parentUserId: f[1] };
}
