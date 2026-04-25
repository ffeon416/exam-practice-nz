import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// Delete Supabase profiles whose Clerk user_id no longer exists in the
// current Clerk production instance. Cascade cleans up custom_exams,
// exam_attempts, reviews, study_plans, usage, and api_usage automatically
// via ON DELETE CASCADE (see supabase/schema.sql).
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Pull every profile id so we can check them all against Clerk.
  const { data: profiles } = await supabase.from("profiles").select("user_id, email, tier");
  const allIds: string[] = (profiles ?? []).map((p) => p.user_id as string);

  if (allIds.length === 0) {
    return NextResponse.json({ scanned: 0, deleted: 0, deletedProfiles: [] });
  }

  // Clerk's getUserList accepts a `userId` filter (array of IDs) and returns
  // only the ones that actually exist. We batch to stay under URL/payload limits.
  const BATCH = 100;
  const existingClerkIds = new Set<string>();
  const clerk = await clerkClient();
  for (let i = 0; i < allIds.length; i += BATCH) {
    const chunk = allIds.slice(i, i + BATCH);
    try {
      const { data: clerkUsers } = await clerk.users.getUserList({
        userId: chunk,
        limit: chunk.length,
      });
      for (const cu of clerkUsers) existingClerkIds.add(cu.id);
    } catch (err) {
      console.error("Clerk getUserList failed for chunk:", err);
    }
  }

  // Never delete the admin running this cleanup.
  existingClerkIds.add(userId);

  const staleProfiles = (profiles ?? []).filter(
    (p) => !existingClerkIds.has(p.user_id as string)
  );
  const staleIds = staleProfiles.map((p) => p.user_id as string);

  if (staleIds.length === 0) {
    return NextResponse.json({ scanned: allIds.length, deleted: 0, deletedProfiles: [] });
  }

  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .in("user_id", staleIds);

  if (deleteError) {
    console.error("Failed to delete stale profiles:", deleteError);
    return NextResponse.json({ error: "Delete failed: " + deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    scanned: allIds.length,
    deleted: staleIds.length,
    deletedProfiles: staleProfiles.map((p) => ({
      userId: p.user_id,
      email: p.email,
      tier: p.tier,
    })),
  });
}
