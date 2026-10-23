// The kid's invite link: https://studyace.co/join/<token>. Server-only.
//
// token = <childId>.<version>.<signature>, signed with INVITE_SECRET (HMAC-
// SHA256). Nothing secret is stored, so the same link can be shown again (the
// day-2 "resend" email) without keeping it in the database. The parent can
// make a new link at any time, which bumps child_profiles.invite_version and
// kills every older one.
//
// The link is reusable until it's replaced: tapping it again (new phone,
// cleared browser) signs the child straight back into THEIR account.

import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const s = process.env.INVITE_SECRET;
  if (!s || s.length < 32) throw new Error("INVITE_SECRET is missing or shorter than 32 characters.");
  return s;
}

function sign(childId: string, version: number, key = secret()): string {
  return createHmac("sha256", key).update(`invite:${childId}:${version}`).digest("base64url").slice(0, 32);
}

export function inviteToken(childId: string, version: number, key?: string): string {
  return `${childId}.${version}.${sign(childId, version, key)}`;
}

/** Parse and check a token's signature. The version still has to match the DB. */
export function readInviteToken(token: string, key?: string): { childId: string; version: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [childId, v, sig] = parts;
  const version = Number(v);
  if (!UUID.test(childId) || !Number.isInteger(version) || version < 1 || version > 1_000_000) return null;
  const want = Buffer.from(sign(childId, version, key));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { childId, version };
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_URL || "https://studyace.co").replace(/\/$/, "");
}

export function inviteUrl(childId: string, version: number): string {
  return `${siteOrigin()}/join/${inviteToken(childId, version)}`;
}

/** The ready-made message the parent can edit before sending. */
export function inviteMessage(childName: string, link: string): string {
  return `${childName}, here's your plan for the grades you want. 20 minutes a night, on your phone. Tap to start: ${link}`;
}
