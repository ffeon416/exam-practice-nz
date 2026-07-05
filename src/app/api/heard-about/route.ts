import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateProfile, setHeardAbout } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Records how a user first heard about StudyAce (set once during /welcome).
// Attribution only — fire-and-forget from the client, never blocks onboarding.

// Allowlisted sources. Keep in sync with the chips in src/app/welcome/page.tsx.
const SOURCES = new Set([
  "tiktok",
  "instagram",
  "youtube",
  "friend",
  "school",
  "google",
  "reddit",
  "other",
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let source: unknown;
  try {
    ({ source } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (typeof source !== "string" || !SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  // Ensure the profile exists first (dodges the Clerk-webhook race, same as
  // /api/refer/claim), then write the attribution.
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  await getOrCreateProfile(userId, email);
  await setHeardAbout(userId, source);

  return new NextResponse(null, { status: 204 });
}
