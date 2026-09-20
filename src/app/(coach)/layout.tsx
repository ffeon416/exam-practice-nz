import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getTier } from "@/lib/supabase";

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
  const tier = await getTier(userId);
  if (tier === "free") redirect("/start");
  return <>{children}</>;
}
