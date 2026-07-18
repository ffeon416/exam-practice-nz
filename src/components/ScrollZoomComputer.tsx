"use client";

import { useEffect, useRef } from "react";

/**
 * A laptop showing StudyAce that rises up in 3D and zooms toward the viewer
 * as you scroll down the page. All scroll work is done straight on the DOM
 * (no React state) inside a rAF for smoothness.
 */
export default function ScrollZoomComputer() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On phones the scroll-linked 3D transform recomposites a blur-heavy subtree
    // every frame and drops scrolling to single-digit FPS. Instead play a single
    // compositor-only rise-in (the .sa-reveal keyframes) when the laptop scrolls
    // into view — no scroll listener, no per-frame work, no will-change.
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (reduce || mobile) {
      const stage = stageRef.current;
      if (stage) stage.style.willChange = "auto";
      if (glowRef.current) glowRef.current.style.opacity = "0.4";
      if (shadowRef.current) shadowRef.current.style.opacity = "0.3";
      // Reduced-motion users get the static state from CSS (!important) already;
      // everyone else gets the one-shot reveal, fired once on first view.
      if (!reduce && stage) {
        // Clear the inline (desktop-initial) transform/opacity so the mobile CSS
        // base (hidden) applies until the laptop scrolls into view.
        stage.style.transform = "";
        stage.style.opacity = "";
        // Pin the settled state explicitly once the reveal ends. CSS
        // animation-fill-mode alone is NOT reliable here (a finished
        // compositor-run fill can release back to the hidden base and leave the
        // laptop invisible), so JS guarantees it lands visible — with a timer
        // failsafe in case animationend never fires.
        let timer = 0;
        const pin = () => {
          window.clearTimeout(timer);
          // Remove the animation before pinning: a running/filled CSS animation
          // ranks above inline styles in the cascade, so without this the inline
          // values below would be ignored and the laptop could stay hidden.
          stage.classList.remove("sa-reveal");
          stage.style.opacity = "1";
          stage.style.transform = "none";
        };
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            stage.addEventListener("animationend", pin, { once: true });
            timer = window.setTimeout(pin, 1300);
            stage.classList.add("sa-reveal");
          },
          { threshold: 0.2 },
        );
        io.observe(stage);
        return () => {
          io.disconnect();
          window.clearTimeout(timer);
        };
      }
      return;
    }

    // easeInOutCubic — gives the motion a cinematic accel/decel
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let raf = 0;
    const update = () => {
      raf = 0;
      const section = sectionRef.current;
      const stage = stageRef.current;
      if (!section || !stage) return;
      const mobile = window.innerWidth < 640;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(travel, 1));
      const p = ease(travel > 0 ? scrolled / travel : 0);

      // gentler tilt + tighter zoom on phones so the whole laptop stays on screen
      const maxTilt = mobile ? 16 : 34;
      const scaleFrom = mobile ? 0.7 : 0.66;
      const scaleTo = mobile ? 1.0 : 1.3;
      const maxLift = mobile ? 16 : 40;

      const rot = (1 - p) * maxTilt;
      const scale = scaleFrom + p * (scaleTo - scaleFrom);
      const lift = (1 - p) * maxLift;
      stage.style.transform = `perspective(1600px) translateY(${lift.toFixed(1)}px) rotateX(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      stage.style.opacity = Math.min(1, 0.5 + p * 1.1).toFixed(3);

      // opacity only — never re-rasterise the big blurs by transforming them (kills mobile jank)
      if (glowRef.current) glowRef.current.style.opacity = (0.12 + p * 0.5).toFixed(3);
      if (shadowRef.current) shadowRef.current.style.opacity = (0.1 + p * 0.32).toFixed(3);
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
    <section ref={sectionRef} className="relative sm:h-[220vh]" aria-hidden="true">
      <div className="flex min-h-[78svh] flex-col items-center justify-center overflow-hidden px-4 py-14 sm:sticky sm:top-0 sm:h-[100svh] sm:py-0">
        {/* ambient glow behind */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[520px] w-[720px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.5),rgba(232,121,249,0.18),transparent_70%)] blur-[28px] sm:blur-[60px]"
          style={{ transform: "translate(-50%,-50%)", opacity: 0.12 }}
        />

        <div
          ref={stageRef}
          className="sa-stage will-change-transform"
          style={{ transformOrigin: "center 55%", transform: "perspective(1600px) rotateX(34deg) scale(0.66)", opacity: 0.5 }}
        >
          {/* ── Laptop lid / screen ── */}
          <div className="relative w-[80vw] max-w-[340px] rounded-[16px] border border-white/[0.1] bg-[#0c0c14] p-[6px] shadow-2xl shadow-indigo-500/30 sm:w-[560px] sm:max-w-none sm:p-2">
            {/* camera */}
            <div className="mx-auto mb-1 h-1 w-1 rounded-full bg-white/25" />
            {/* screen */}
            <div className="relative flex aspect-[16/10] flex-col overflow-hidden rounded-[9px] bg-gradient-to-b from-[#0a0a12] to-[#0f0b1c]">
              {/* top nav */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 sm:py-2.5">
                <span className="text-[10px] font-extrabold tracking-tight text-white sm:text-[15px]">
                  study<span className="text-indigo-400">ace</span>
                </span>
                <div className="hidden items-center gap-3 text-[9px] text-zinc-400 sm:flex">
                  <span className="text-white">Dashboard</span>
                  <span>Exams</span>
                  <span>Review</span>
                  <span>Plan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1 py-0.5">
                    <span className="sa-flame inline-block text-[8px] leading-none sm:text-[11px]">🔥</span>
                    <span className="text-[6px] font-bold text-orange-300 sm:text-[9px]">12</span>
                  </span>
                  <span className="rounded-md bg-indigo-500 px-1.5 py-0.5 text-[6px] font-bold text-white sm:text-[9px]">
                    Pro
                  </span>
                </div>
              </div>

              {/* animated results dashboard */}
              <div className="relative flex flex-1 items-center gap-2.5 px-3 py-2 sm:gap-5 sm:px-5">
                {/* grade ring */}
                <div className="sa-float relative shrink-0">
                  <div className="pointer-events-none absolute inset-0 -z-0 rounded-full bg-indigo-500/25 blur-xl" />
                  <svg viewBox="0 0 100 100" className="w-[72px] sm:w-[130px]">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
                      stroke="url(#saGrad)" strokeDasharray="264"
                      className="sa-ring" transform="rotate(-90 50 50)"
                    />
                    <defs>
                      <linearGradient id="saGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#e879f9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[16px] font-extrabold leading-none text-white sm:text-[28px]">
                      92<span className="text-[8px] sm:text-[14px]">%</span>
                    </span>
                    <span className="text-[5px] font-bold uppercase tracking-wider text-emerald-400 sm:text-[9px]">
                      Excellence
                    </span>
                  </div>
                  <span className="sa-twinkle absolute -right-0.5 top-0 text-[7px] sm:text-[11px]">✨</span>
                  <span className="sa-twinkle absolute bottom-1 -left-1 text-[6px] sm:text-[9px]" style={{ animationDelay: "1.1s" }}>✨</span>
                  <span className="sa-twinkle absolute -top-1 left-1/2 text-[5px] sm:text-[8px]" style={{ animationDelay: "1.8s" }}>✨</span>
                </div>

                {/* climbing + subject bars */}
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold leading-tight text-white sm:text-[13px]">
                    Your grades are climbing.
                  </p>
                  <span className="sa-pop mt-1 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[5.5px] font-bold text-emerald-300 sm:text-[9px]">
                    +34% this term ↑
                  </span>
                  <div className="mt-2 flex h-[32px] items-end gap-1.5 sm:mt-3 sm:h-[56px] sm:gap-2.5">
                    {[
                      { s: "Ma", h: "72%" },
                      { s: "Sci", h: "96%" },
                      { s: "Eng", h: "64%" },
                      { s: "Bio", h: "88%" },
                      { s: "Che", h: "80%" },
                    ].map((b, i) => (
                      <div key={b.s} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
                        <div
                          className="sa-bar w-full rounded-t-[3px] bg-gradient-to-t from-indigo-500 to-fuchsia-400"
                          style={{ height: b.h, animationDelay: `${0.1 + i * 0.13}s` }}
                        />
                        <span className="text-[4.5px] leading-none text-zinc-500 sm:text-[8px]">{b.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* screen reflection / gloss */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,transparent_28%,transparent_100%)]" />
              {/* ambient screen glow */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 h-20 w-48 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-lg sm:blur-2xl" />
            </div>
          </div>
          {/* ── Laptop base ── */}
          <div className="relative mx-auto -mt-px h-[9px] w-[84vw] max-w-[356px] rounded-b-[12px] border-x border-b border-white/[0.07] bg-gradient-to-b from-[#20202a] to-[#0b0b11] sm:h-[13px] sm:w-[624px] sm:max-w-none">
            <div className="mx-auto h-1 w-14 rounded-b-md bg-white/10 sm:h-1.5 sm:w-24" />
          </div>
        </div>

        {/* ground shadow */}
        <div
          ref={shadowRef}
          className="pointer-events-none absolute left-1/2 top-[62%] h-10 w-[84vw] max-w-[356px] rounded-[100%] bg-black/60 blur-lg sm:blur-2xl sm:w-[620px] sm:max-w-none"
          style={{ transform: "translateX(-50%)", opacity: 0.1 }}
        />

        {/* caption */}
        <p className="mt-10 text-center text-[12px] text-zinc-600">
          Your whole NCEA — practised, marked, and mastered in one place.
        </p>
      </div>
    </section>
  );
}
