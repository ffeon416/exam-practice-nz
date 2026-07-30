import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";
import { getCurriculum } from "@/data/curricula";

export const dynamic = "force-dynamic";

// Waitlist signups for not-yet-launched curricula (StudyAce Global).
// Public route — visitors from AU/UK/US/CA are signed out by definition.
// Rows land in the existing `events` table (name: "waitlist_joined") so no
// schema change is needed; the email lives in props.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`waitlist:${ip}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { email?: string; curriculum?: string };
    const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
    const curriculumId = (body.curriculum ?? "").trim().slice(0, 50);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const curriculum = getCurriculum(curriculumId);
    if (!curriculum || curriculum.status !== "coming-soon") {
      return NextResponse.json({ error: "Unknown waitlist." }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      // Skip exact duplicates so refresh-and-resubmit doesn't double-count.
      const { data: existing } = await supabase
        .from("events")
        .select("id")
        .eq("name", "waitlist_joined")
        .contains("props", { email, curriculum: curriculum.id })
        .limit(1);

      if (!existing || existing.length === 0) {
        const country = request.headers.get("x-vercel-ip-country") ?? null;
        const { error } = await supabase.from("events").insert({
          name: "waitlist_joined",
          user_id: null,
          props: { email, curriculum: curriculum.id, system: curriculum.system, country },
        });
        if (error) {
          console.error("waitlist insert failed:", error.message);
          return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
