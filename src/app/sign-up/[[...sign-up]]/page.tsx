"use client";

import { SignUp } from "@clerk/nextjs";
import { useEffect } from "react";

const PENDING_REF_KEY = "studyace-pending-ref";

export default function SignUpPage() {
  // Capture ?ref= into localStorage so it survives the Clerk OAuth/email
  // round-trip. The first authenticated page reads it back and POSTs to
  // /api/refer/claim. Stored as the raw Clerk user_id of the referrer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && ref.trim().length > 0 && ref.length < 200) {
      try {
        window.localStorage.setItem(PENDING_REF_KEY, ref.trim());
      } catch {
        /* localStorage may be unavailable in private browsing */
      }
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-5 py-12">
      <SignUp
        signInUrl="/sign-in"
        forceRedirectUrl="/welcome"
        fallbackRedirectUrl="/welcome"
      />
    </div>
  );
}
