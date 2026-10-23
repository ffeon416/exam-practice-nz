"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";

// Door split: anyone with a plan (a student, or a parent — the app sends
// parents on to /invite) has no business on the sales page.
export default function HomePaidRedirect() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { tier, loading } = useTier();
  useEffect(() => {
    if (isSignedIn && !loading && tier !== "free") router.replace("/schedule");
  }, [isSignedIn, tier, loading, router]);
  return null;
}
