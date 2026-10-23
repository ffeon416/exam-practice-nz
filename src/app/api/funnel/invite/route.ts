import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { childForParent, childrenForParent, updateChild, type ChildProfile } from "@/lib/children";
import { inviteMessage, inviteUrl } from "@/lib/inviteLink";
import { funnelEventId, sendParentEvent } from "@/lib/metaFunnel";
import { logEvent } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// The parent's "Send [name] their invite" page.
//   GET  ?childId=            → link + ready-made message (first child if no id)
//   POST { childId, action: "sent", channel }  → record it, fire InviteSent
//   POST { childId, action: "reset" }          → new link; older links stop working

const CHANNELS = new Set(["sms", "whatsapp", "email", "qr", "copy"]);

function view(c: ChildProfile) {
  const link = inviteUrl(c.id, c.invite_version ?? 1);
  return {
    childId: c.id,
    firstName: c.first_name,
    link,
    message: inviteMessage(c.first_name, link),
    sentAt: c.invite_sent_at,
    openedAt: c.invite_opened_at,
    gradeCheckDone: !!c.grade_check_completed_at,
    // The browser Pixel fires InviteSent with this id; the server sends the
    // same id, so Meta counts one per child.
    inviteEventId: funnelEventId("InviteSent", c.id),
  };
}

async function load(userId: string, childId: string | null): Promise<ChildProfile | null> {
  if (childId) return childForParent(userId, childId);
  return (await childrenForParent(userId))[0] ?? null;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const child = await load(userId, req.nextUrl.searchParams.get("childId"));
  if (!child) return NextResponse.json({ error: "No child on this account yet." }, { status: 404 });
  try {
    return NextResponse.json(view(child));
  } catch (err) {
    console.error("invite link failed:", err);
    return NextResponse.json({ error: "Invite links aren't set up yet." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { childId?: unknown; action?: unknown; channel?: unknown };
  if (typeof body.childId !== "string") return NextResponse.json({ error: "Missing child." }, { status: 400 });
  const child = await childForParent(userId, body.childId);
  if (!child) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (body.action === "reset") {
    const version = (child.invite_version ?? 1) + 1;
    await updateChild(child.id, { invite_version: version });
    void logEvent("invite_reset", userId, { child: child.id });
    return NextResponse.json(view({ ...child, invite_version: version }));
  }

  if (body.action === "sent") {
    const channel = typeof body.channel === "string" && CHANNELS.has(body.channel) ? body.channel : "copy";
    if (!child.invite_sent_at) {
      await updateChild(child.id, { invite_sent_at: new Date().toISOString(), invite_channel: channel });
    }
    void logEvent("invite_sent", userId, { child: child.id, channel, first: !child.invite_sent_at });
    after(() => sendParentEvent("InviteSent", userId, child.id).catch((e) => console.error("InviteSent failed:", e)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
