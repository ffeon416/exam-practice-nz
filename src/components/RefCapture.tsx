"use client";

import { useEffect } from "react";

// Referral links now point at the grade check (there is no sign-up page).
// Capture ?ref= on any page into localStorage; it rides along the checkout
// and is claimed when the buyer's account is created on /start.
export default function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && ref.trim().length > 0 && ref.length < 200) {
        window.localStorage.setItem("studyace-pending-ref", ref.trim());
      }
    } catch {}
  }, []);
  return null;
}
