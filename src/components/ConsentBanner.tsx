"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CONSENT_COOKIE, isParentPage, needsConsent } from "@/lib/metaShared";
import { META_PIXEL_ID, readConsent, visitorCountry } from "@/lib/metaPixel";
import { CONSENT_EVENT } from "./MetaPixel";

// Ad-measurement consent for UK and EU/EEA visitors only (PECR / GDPR). Shown
// on parent pages, where the Meta Pixel would run; nobody else sees it, and
// it never appears on kids' screens. Declining changes nothing about the site.

const YEAR = 60 * 60 * 24 * 365;

export default function ConsentBanner() {
  const pathname = usePathname();
  const [chosen, setChosen] = useState(false);

  // Reading cookies during render is safe here: this only ever mounts in the
  // browser, inside <DeferUntilIdle>, so there is no server render to match.
  const show = !chosen && !!META_PIXEL_ID && isParentPage(pathname) && needsConsent(visitorCountry()) && readConsent() === null;
  if (!show) return null;

  function choose(value: "granted" | "denied") {
    try {
      document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${YEAR}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* cookies blocked: the banner just shows again next time */ }
    setChosen(true);
    if (value === "granted") window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  return (
    <div role="dialog" aria-label="Cookie choice" aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[640px] rounded-2xl border border-[#E2E2E8] bg-white text-[#15151B] shadow-[0_8px_30px_rgba(21,21,27,0.12)] p-4 sm:p-5">
        <p className="text-[15px] leading-relaxed text-[#4D4F58]">
          Can we use a Meta cookie to see whether our Facebook and Instagram ads work? It never
          sees your child&rsquo;s answers or marks. StudyAce works the same either way.{" "}
          <Link href="/privacy#cookies" className="text-[#4A3AC4] underline underline-offset-2">Details</Link>
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => choose("granted")}
            className="min-h-[44px] flex-1 rounded-[10px] bg-[#5B47E0] px-4 text-[15px] font-semibold text-white hover:bg-[#4A3AC4]">
            That&rsquo;s fine
          </button>
          <button type="button" onClick={() => choose("denied")}
            className="min-h-[44px] flex-1 rounded-[10px] border border-[#E2E2E8] bg-white px-4 text-[15px] font-semibold text-[#15151B] hover:bg-[#F6F6F8]">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
