import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readParentLink } from "@/lib/emailLinks";
import { signInTicket } from "@/lib/funnelProvision";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/go { t } — the sign-in link in a parent email. Returns a
// one-time Clerk ticket (10 minutes) and where to go. Only called by the /go
// page's script, so an email scanner opening the link mints nothing.

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`go:${ip}`, 20, 10 * 60_000).ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { t?: unknown };
  let link: ReturnType<typeof readParentLink> = null;
  try { link = typeof body.t === "string" ? readParentLink(body.t) : null; } catch { link = null; }
  if (!link) return NextResponse.json({ error: "This link has expired. Sign in with your email instead.", expired: true }, { status: 400 });

  const { userId } = await auth();
  if (userId === link.parentUserId) return NextResponse.json({ signedIn: true, to: link.to });
  if (userId) return NextResponse.json({ signedInAsOther: true, to: link.to });
  const ticket = await signInTicket(link.parentUserId);
  if (!ticket) return NextResponse.json({ error: "We couldn't sign you in just now. Try again in a minute." }, { status: 503 });
  return NextResponse.json({ ticket, to: link.to });
}
