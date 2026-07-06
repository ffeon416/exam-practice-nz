import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// Returns the full, ordered rrweb event stream for one recording so the /admin
// player can replay it. Chunks are stored in batches; we concatenate them by
// seq into a single events array.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("recording_chunks")
    .select("seq, events")
    .eq("session_id", sessionId)
    .order("seq", { ascending: true })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const events: unknown[] = [];
  for (const chunk of (data ?? []) as { seq: number; events: unknown[] }[]) {
    if (Array.isArray(chunk.events)) events.push(...chunk.events);
  }

  return NextResponse.json({ events });
}
