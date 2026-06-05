"use client";

import { useEffect, useLayoutEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { setScopeUserId } from "@/lib/userScope";

// Runs before paint on the client, falls back to useEffect on the server so
// Next.js doesn't warn during SSR.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Keeps the localStorage namespace ([[userScope]]) in sync with the signed-in
 * Clerk user, app-wide. Mounted high in the tree so the Navbar's due-review
 * badge, the /review and /plan pages, etc. all read the current account's data
 * (and a brand-new account reads an empty namespace, never the last person's).
 *
 * Renders nothing. The dashboard also calls setScopeUserId itself before its
 * own reads — this component covers every other surface.
 */
export default function UserScopeSync() {
  const { user, isLoaded } = useUser();

  useIsoLayoutEffect(() => {
    if (!isLoaded) return;
    setScopeUserId(user?.id ?? null);
  }, [isLoaded, user?.id]);

  return null;
}
