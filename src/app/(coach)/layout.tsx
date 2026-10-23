import type { ReactNode } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabase, getTier } from "@/lib/supabase";
import { claimPurchase } from "@/lib/claimPurchase";
import ExamGate from "@/components/ExamGate";

export const dynamic = "force-dynamic";

// ── The door between Convert and Coach ──
// Every route in this group is the learning app: dashboard, subjects, exam,
// plan, review, refer, welcome. It is for paying students only. A signed-in
// account with no plan (a lead) is sent to /start, the one screen that
// exists to sell them one. This is the ONLY place that rule lives — pages
// inside the group never need their own paywall gates.
export default async function CoachLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  let tier = await getTier(userId);
  if (tier === "free") {
    // Bought anonymously, created the login, landed here first? Attach it.
    try {
      const user = await currentUser();
      const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      const claimed = await claimPurchase({ userId, email });
      if (claimed) tier = claimed;
    } catch {}
  }
  if (tier === "free") redirect("/start");
  // Parents who bought the free week don't use the learning app themselves:
  // their page is /invite (send the invite, see how their child is doing).
  const { data: me } = (await getSupabase()?.from("profiles").select("role").eq("user_id", userId).maybeSingle()) ?? { data: null };
  if (me?.role === "parent") redirect("/invite");
  // ExamGate: after the last exam date, Pace/Streak/Practise send the
  // student to /schedule to set the next exam (see the component).
  return <><ExamGate />{children}</>;
}
