import { NextRequest, NextResponse, after } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { readInviteToken } from "@/lib/inviteLink";
import { childById } from "@/lib/children";
import { getSupabase, getTier, logEvent } from "@/lib/supabase";
import { signInTicket } from "@/lib/funnelProvision";
import { sendParentEvent } from "@/lib/metaFunnel";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/join { token }  — the kid tapped their invite link.
// First time: creates the kid's own login (no email, no password), linked to
// the parent, and fires KidStarted. Every time: returns a one-time sign-in
// ticket so the kid lands signed in. The session then lasts as long as the
// Clerk instance's session lifetime (set long in the Clerk dashboard).
//
// The kid has no email: Clerk gets a placeholder address on our own domain
// (never emailed; we own the domain so it can't reach anyone).

const kidEmail = (childId: string) => `${childId}@kid.studyace.co`;

async function kidUserFor(childId: string, firstName: string, isTest: boolean): Promise<string> {
  const clerk = await clerkClient();
  const find = async () => (await clerk.users.getUserList({ externalId: [childId], limit: 1 })).data[0]?.id ?? null;
  const existing = await find();
  if (existing) return existing;
  try {
    const user = await clerk.users.createUser({
      externalId: childId,
      emailAddress: [kidEmail(childId)],
      firstName,
      skipPasswordRequirement: true,
      skipLegalChecks: true,
      publicMetadata: { role: "student", childId, ...(isTest ? { test: true } : {}) },
    });
    return user.id;
  } catch (err) {
    const again = await find(); // two taps at once: the other one made it
    if (again) return again;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`join:${ip}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const parsed = typeof body.token === "string" ? readInviteToken(body.token) : null;
  if (!parsed) return NextResponse.json({ error: "This link isn't right. Ask your parent to send it again." }, { status: 400 });

  const child = await childById(parsed.childId);
  if (!child) return NextResponse.json({ error: "This link isn't right. Ask your parent to send it again." }, { status: 404 });
  if ((child.invite_version ?? 1) !== parsed.version) {
    return NextResponse.json({ error: "This link has been replaced. Ask your parent for the new one.", replaced: true }, { status: 410 });
  }
  if ((await getTier(child.parent_user_id)) === "free") {
    return NextResponse.json({ error: "This StudyAce plan has ended. Ask your parent if they'd like to start it again.", ended: true }, { status: 403 });
  }

  const { userId } = await auth();
  const firstName = child.first_name;
  if (userId && userId === child.kid_user_id) return NextResponse.json({ signedIn: true, firstName });
  if (userId && userId === child.parent_user_id) return NextResponse.json({ isParent: true, firstName });
  if (userId) return NextResponse.json({ signedInAsOther: true, firstName });

  try {
    let kidUserId = child.kid_user_id;
    if (!kidUserId) {
      kidUserId = await kidUserFor(child.id, firstName, child.is_test);
      const supabase = getSupabase();
      // The kid's own profile row. Tier stays "free": getTier resolves the parent's plan.
      await supabase?.from("profiles").upsert(
        { user_id: kidUserId, email: null, tier: "free", role: "student", ...(child.is_test ? { is_test: true } : {}) },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
      // Link it (only if still unlinked — a concurrent tap may have done it).
      await supabase?.from("child_profiles").update({ kid_user_id: kidUserId, invite_opened_at: new Date().toISOString() }).eq("id", child.id).is("kid_user_id", null);
      void logEvent("kid_started", kidUserId, { child: child.id, parent: child.parent_user_id });
      after(() => sendParentEvent("KidStarted", child.parent_user_id, child.id).catch((e) => console.error("KidStarted failed:", e)));
    }
    const ticket = await signInTicket(kidUserId);
    if (!ticket) throw new Error("no ticket");
    return NextResponse.json({ ticket, firstName });
  } catch (err) {
    console.error("join failed:", err);
    return NextResponse.json({ error: "We couldn't sign you in just now. Try the link again in a minute." }, { status: 503 });
  }
}
