"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackMetaPageEvent, metaEnabled, META_PIXEL_ID } from "@/lib/metaPixel";
import { isParentPage } from "@/lib/metaShared";

export const CONSENT_EVENT = "sa-consent";

// Meta PageView per parent-page route (SPA navigations included), plus
// ViewContent on the homepage. Mounted inside <DeferUntilIdle>, so the Pixel
// never competes with the first interaction. Waits for the consent banner
// where consent is needed; never fires on kids' or app pages.
export default function MetaPixel() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  // Bumped when the visitor opts in, so the page they're on still counts.
  const [consentTick, setConsentTick] = useState(0);

  useEffect(() => {
    const on = () => setConsentTick((n) => n + 1);
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);

  useEffect(() => {
    if (!META_PIXEL_ID || !isParentPage(pathname) || !metaEnabled()) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackMetaPageEvent("PageView");
    if (pathname === "/") trackMetaPageEvent("ViewContent", { content_name: "homepage", content_category: "landing" });
  }, [pathname, consentTick]);

  return null;
}
