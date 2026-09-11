"use client";

import { useEffect, useState } from "react";

/**
 * Thin progress bar fixed to the top of the viewport. Fills 0-100% as the
 * reader scrolls through the <article>, not the whole page — so it doesn't
 * fill while they're still in the header and hits 100% at the end of the
 * body, not the footer.
 */
export function ReadingProgress({ targetSelector = "article" }: { targetSelector?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.querySelector(targetSelector) as HTMLElement | null;
    if (!target) return;

    const update = () => {
      const rect = target.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const scrolled = window.scrollY - articleTop + window.innerHeight;
      setProgress(Math.max(0, Math.min(100, (scrolled / target.offsetHeight) * 100)));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetSelector]);

  return (
    <div aria-hidden="true" className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
