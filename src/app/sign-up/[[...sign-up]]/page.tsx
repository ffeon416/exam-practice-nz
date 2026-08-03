"use client";

import { SignUp } from "@clerk/nextjs";
import { useEffect } from "react";

const PENDING_REF_KEY = "studyace-pending-ref";
const GRADE_INTENT_KEY = "studyace-postsignup-intent";

export default function SignUpPage() {
  // Capture ?ref= into localStorage so it survives the Clerk OAuth/email
  // round-trip. The first authenticated page reads it back and POSTs to
  // /api/refer/claim. Stored as the raw Clerk user_id of the referrer.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim().length > 0 && ref.length < 200) {
      try {
        window.localStorage.setItem(PENDING_REF_KEY, ref.trim());
      } catch {
        /* localStorage may be unavailable in private browsing */
      }
    }
    // Header "Grade Check" button while signed out lands here directly
    // (?intent=grade) — /welcome reads this and bounces straight to /grade
    // right after signup, instead of the normal onboarding flow.
    if (params.get("intent") === "grade") {
      try {
        window.localStorage.setItem(GRADE_INTENT_KEY, "1");
      } catch {}
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
