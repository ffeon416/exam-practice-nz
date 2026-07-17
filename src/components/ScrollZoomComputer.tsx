"use client";

import { useEffect, useRef } from "react";

/**
 * A laptop showing StudyAce that zooms in as you scroll down the page.
 * Uses a tall section + sticky stage; scale is driven directly on the DOM
 * node (no React state) via requestAnimationFrame for smoothness.
 */
export default function ScrollZoomComputer() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (stageRef.current) stageRef.current.style.transform = "scale(1)";
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      // progress 0 → 1 as the sticky stage moves through the tall section
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(travel, 1));
      const p = travel > 0 ? scrolled / travel : 0;
      const scale = 0.72 + p * 1.0; // 0.72 → 1.72
      stage.style.transform = `scale(${scale.toFixed(3)})`;
      stage.style.opacity = String(Math.min(1, 0.55 + p * 0.9));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[200vh]" aria-hidden="true">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        <div
          ref={stageRef}
          className="will-change-transform origin-center"
          style={{ transform: "scale(0.72)", opacity: 0.55 }}
        >
          {/* ── Laptop lid / screen ── */}
          <div className="relative w-[300px] sm:w-[560px] rounded-[16px] bg-[#0c0c14] border border-white/[0.1] p-[6px] sm:p-2 shadow-2xl shadow-indigo-500/25">
            {/* camera */}
            <div className="mx-auto mb-1 h-1 w-1 rounded-full bg-white/25" />
            {/* screen */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-[9px] bg-gradient-to-b from-[#0a0a12] to-[#0f0b1c]">
              {/* mini top nav */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 sm:py-2.5">
                <span className="text-[10px] sm:text-[15px] font-extrabold text-white tracking-tight">
                  study<span className="text-indigo-400">ace</span>
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[6px] sm:text-[9px] font-bold text-[#0a0a0f]">
                  Try it free
                </span>
              </div>
              {/* mini hero */}
              <div className="px-3 pt-2.5 pb-3 text-center sm:pt-5">
                <p className="mx-auto max-w-[220px] text-[9px] font-extrabold leading-tight text-white sm:max-w-[380px] sm:text-[15px]">
                  The kids who ace NCEA{" "}
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    know a secret.
                  </span>
                </p>
                {/* mini marking card */}
                <div className="mx-auto mt-2 max-w-[200px] rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] p-2 text-left sm:mt-4 sm:max-w-[320px] sm:p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
                    <span className="text-[6px] font-bold text-emerald-400 sm:text-[10px]">
                      2 / 3 marks &middot; Achieved
                    </span>
                  </div>
                  <p className="text-[5.5px] leading-snug text-zinc-400 sm:text-[9px]">
                    Good start! Mention CO&#8322; and water as reactants for full marks.
                  </p>
                </div>
              </div>
              {/* ambient screen glow */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 h-20 w-48 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-2xl" />
            </div>
          </div>
          {/* ── Laptop base ── */}
          <div className="relative mx-auto -mt-px h-[9px] w-[338px] rounded-b-[12px] border-x border-b border-white/[0.07] bg-gradient-to-b from-[#1b1b24] to-[#0b0b11] sm:h-[13px] sm:w-[624px]">
            <div className="mx-auto h-1 w-14 rounded-b-md bg-white/10 sm:h-1.5 sm:w-24" />
          </div>
        </div>

        {/* caption */}
        <p className="mt-8 text-center text-[12px] text-zinc-600">
          Your whole NCEA — practised, marked, and mastered in one place.
        </p>
      </div>
    </section>
  );
}
