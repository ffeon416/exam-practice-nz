"use client";

// The parent check's result page, built to the "On-track result — alive"
// design (2026-10-20). The breakdown is already in the parent's inbox; this
// screen exists to turn the verdict into a start. Top to bottom: the verdict,
// the two-lines chart (same as now vs with a plan), a live countdown to the
// exam, the "you've already put a lot in" line, the first three nights of the
// plan, a sample of honest marking, the tutor comparison, the two plans, the
// guarantee, and a sticky button that goes straight to checkout.
//
// Alive: the lines draw themselves, the goal node pulses, the countdown
// ticks every second, the plan bar fills, the marking badges land one after
// the other, the cost bars grow when scrolled to. CSS transforms/opacity
// only; reduced motion respected by the shared keyframes.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { PRO_PRICING, proMonthlyEquivalent, type Billing } from "@/lib/tierLimits";
import { trackEvent } from "@/lib/attribution";
import { GRADES, type Grade, type OnTrackResult } from "@/lib/onTrack";

const GREEN = "#3ee6a0", ROSE = "#ff6b7a", VIOLET = "#a78bfa";
const TUTOR_HOURLY = 70;

export type RevealProps = {
  result: OnTrackResult;
  name: string;            // teen, capitalised
  subjectLabel: string;
  system: string;          // "NCEA", "HSC" …
  current: Grade | null;
  examDate: string;        // ISO date
  email: string;
  firstFix?: string;
};

const VERDICT = {
  on: { label: "On track.", line: (n: string, g: string) => `On what you’ve told us, ${n} is putting in enough of the right work to reach ${g}. The job now is to keep it that way, and to see the first slip before the report does.` },
  borderline: { label: "Borderline.", line: (n: string, g: string) => `On what you’ve told us, ${n} could reach ${g}, but there’s no slack. Study that stays as it is, or one bad fortnight, and the goal slides.` },
  off: { label: "Not on track.", line: (n: string, g: string) => `On what you’ve told us, ${n} won’t get to ${g} the way things are going. The good news: it’s fixable. Just not by doing more of the same.` },
  hold: { label: "Already there.", line: (n: string, g: string) => `${n} is at ${g} now. Grades don’t fall off a cliff, they drift, and nobody notices until results day. Holding it is the job.` },
  unknown: { label: "Can’t tell yet.", line: (n: string, g: string) => `Without a current grade there’s no gap to measure against ${g}. The first night fixes that: ${n} sits a real check and gets a real grade.` },
} as const;

function pad(n: number) { return String(n).padStart(2, "0"); }
function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Ticks once a second until the exam (9am local on the exam date). */
function useCountdown(examDate: string) {
  const target = new Date(examDate + "T09:00:00").getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return parts(target - now);
}

/** True once the element has scrolled into view (and stays true). */
function useSeen<T extends Element>(threshold = 0.3): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setSeen(true); }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

// ── The two-lines chart ──
function Lines({ current, goal, projected, weeks }: { current: Grade; goal: Grade; projected: Grade; weeks: number }) {
  const top = GRADES.indexOf("A+");
  const low = Math.min(GRADES.indexOf(current), GRADES.indexOf("D"));
  const rows = GRADES.slice(low, top + 1).reverse(); // A+ … low
  const W = 520, H = 60 + rows.length * 46, L = 54, R = 36, T = 22, B = 44;
  const y = (g: Grade) => T + (top - GRADES.indexOf(g)) * ((H - T - B) / Math.max(1, rows.length - 1));
  const x0 = L, x1 = W - R;
  const yNow = y(current), yGoal = y(goal), yProj = y(projected);
  // "Same as now" barely moves; "with a plan" eases up to the goal.
  const nowEnd = yNow + (yProj - yNow) * 0.9 - (yProj === yNow ? 8 : 0);
  const plan = `M ${x0} ${yNow} C ${x0 + (x1 - x0) * 0.45} ${yNow}, ${x0 + (x1 - x0) * 0.6} ${yGoal}, ${x1} ${yGoal}`;
  const same = `M ${x0} ${yNow} L ${x1} ${nowEnd}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-4" role="img" aria-label={`Two lines from ${current} tonight: same as now stays near ${projected}; with a plan reaches ${goal} by the exam`}>
      {rows.map((g) => (
        <g key={g}>
          <line x1={x0} x2={x1} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 5" />
          <text x={x0 - 14} y={y(g) + 4} textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" fill="#8a8a96">{g}</text>
        </g>
      ))}
      <path d={same} pathLength={1} className="sa-draw" stroke={ROSE} strokeWidth="2.5" fill="none" strokeLinecap="round" style={{ animationDelay: "250ms" }} />
      <path d={plan} pathLength={1} className="sa-draw" stroke={GREEN} strokeWidth="3" fill="none" strokeLinecap="round" style={{ animationDelay: "500ms", animationDuration: "1.9s" }} />
      <circle cx={x0} cy={yNow} r="14" fill={ROSE} opacity="0.14" />
      <circle cx={x0} cy={yNow} r="5" fill={ROSE} />
      <circle cx={x1} cy={nowEnd} r="5" fill={ROSE} className="sa-fade-in" style={{ animationDelay: "1.4s" }} />
      <circle cx={x1} cy={yGoal} r="16" fill={GREEN} opacity="0.16" className="sa-fade-in" style={{ animationDelay: "2.1s" }} />
      <circle cx={x1} cy={yGoal} r="16" fill="none" stroke={GREEN} strokeWidth="1.5" className="sa-pulse-ring" style={{ animationDelay: "2.3s" }} />
      <circle cx={x1} cy={yGoal} r="6" fill={GREEN} className="sa-fade-in" style={{ animationDelay: "2s" }} />
      <text x={x0} y={H - 12} fontFamily="ui-monospace, Menlo, monospace" fontSize="11" fill="#8a8a96" letterSpacing="1.5">TONIGHT</text>
      <text x={x1} y={H - 12} textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" fill="#8a8a96" letterSpacing="1.5">{weeks <= 1 ? "EXAM ·" : `EXAM · ${weeks} WK`}</text>
    </svg>
  );
}

export default function OnTrackReveal({ result, name, subjectLabel, system, current, examDate, email, firstFix }: RevealProps) {
  const v = VERDICT[result.verdict];
  const goal = result.goalGrade;
  const cd = useCountdown(examDate);
  const [billing, setBilling] = useState<Billing>("yearly");
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [costRef, costSeen] = useSeen<HTMLDivElement>();
  const [marksRef, marksSeen] = useSeen<HTMLDivElement>(0.4);
  const [planRef, planSeen] = useSeen<HTMLDivElement>(0.4);

  // Where "same as now" ends up: the gap closed at the current pace.
  const projected: Grade = (() => {
    if (!current) return "C";
    if (result.verdict === "hold") return current;
    const ratio = result.requiredHours > 0 ? Math.min(1, result.effectiveHours / result.requiredHours) : 0;
    const idx = GRADES.indexOf(current) + Math.floor(ratio * result.steps);
    return GRADES[Math.min(GRADES.indexOf(goal), idx)];
  })();

  const perWeekYearly = Math.round((PRO_PRICING.yearly.amount / 52) * 10) / 10;
  const weeksWord = result.weeks <= 1 ? "This is the week it shows up on paper." : result.weeks <= 4 ? "These are the weeks it shows up on paper." : "The next few months decide what shows up on paper.";
  const ctaPrice = billing === "yearly" ? `NZ$${PRO_PRICING.yearly.amount}/yr` : `NZ$${PRO_PRICING.monthly.amount}/mo`;

  async function startPlan() {
    if (busy) return;
    setBusy(true); setCheckoutError(null);
    trackEvent("cta_click", { cta: `ontrack-checkout-${billing}`, page: "/on-track" });
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: "pro", billing }) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) { window.location.href = data.url; return; }
      setCheckoutError(data.error ?? "Couldn’t open checkout. Try the pricing page.");
    } catch { setCheckoutError("No connection. Try again, or use the pricing page."); }
    setBusy(false);
  }

  // Hide the site header while the result is up: this screen carries its own.
  useEffect(() => {
    document.documentElement.setAttribute("data-sa-result", "1");
    return () => document.documentElement.removeAttribute("data-sa-result");
  }, []);

  const mono = "font-mono text-[10.5px] uppercase tracking-[0.2em]";
  const eyebrowRow = [name, subjectLabel, current ? `${current} now` : "grade unknown", `goal ${goal}`].join(" · ");

  return (
    <div className="relative">
      {/* Own header */}
      <div className="sticky top-0 z-40 bg-[#06060a]/85 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link href="/" className="font-semibold text-white tracking-tight text-[18px]">study<span className="text-indigo-400">ace</span></Link>
          <span className={`${mono} text-zinc-500`}>{name}’s result</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 pt-8 pb-40">
        <p className={`home-rise ${mono} text-zinc-500`}>{eyebrowRow}</p>

        {/* The verdict */}
        <p className={`home-rise ${mono} font-bold mt-5 inline-flex items-center gap-2`} style={{ color: result.verdict === "on" || result.verdict === "hold" ? GREEN : ROSE, animationDelay: "60ms" }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "currentColor" }} />The verdict</p>
        <h1 className={`${display.className} home-rise text-white font-bold text-[46px] sm:text-[64px] tracking-[-0.04em] leading-[0.98] mt-2`} style={{ animationDelay: "120ms" }}>{v.label}</h1>
        <p className="home-rise text-zinc-300 text-[16px] sm:text-[17px] leading-relaxed mt-4" style={{ animationDelay: "180ms" }}>{v.line(name, goal)}</p>

        {/* Same as now vs with a plan */}
        {current && (
          <div className="home-rise rounded-[24px] border border-white/[0.08] bg-[#0e0f13] p-5 mt-7" style={{ animationDelay: "260ms" }}>
            <div className="flex items-start justify-between">
              <div><p className={`${mono} font-bold`} style={{ color: ROSE }}>Same as now</p><p className={`${display.className} font-bold text-[40px] leading-none tracking-[-0.04em] mt-1`} style={{ color: ROSE }}>{projected}</p></div>
              <div className="text-right"><p className={`${mono} font-bold`} style={{ color: GREEN }}>With a plan</p><p className={`${display.className} font-bold text-[40px] leading-none tracking-[-0.04em] mt-1`} style={{ color: GREEN }}>{goal}</p></div>
            </div>
            <Lines current={current} goal={goal} projected={projected} weeks={result.weeks} />
          </div>
        )}
        {!current && (
          <div className="home-rise rounded-[24px] border border-white/[0.08] bg-[#0e0f13] p-5 mt-7 flex items-center justify-between gap-4" style={{ animationDelay: "260ms" }}>
            <div><p className={`${mono} font-bold`} style={{ color: VIOLET }}>Night one</p><p className="text-white text-[15px] font-semibold mt-1">{name} sits 8 real {subjectLabel} questions, marked like an examiner.</p><p className="text-zinc-500 text-[13px] mt-1">That’s the grade. The plan to {goal} starts from it.</p></div>
            <p className={`${display.className} font-bold text-[44px] leading-none tracking-[-0.04em] shrink-0`} style={{ color: VIOLET }}>?</p>
          </div>
        )}

        {/* Countdown */}
        <div className="home-rise rounded-[18px] border px-5 py-4 mt-3 flex items-center justify-between gap-4" style={{ animationDelay: "320ms", borderColor: `${ROSE}40`, background: `${ROSE}0d` }}>
          <p className="text-zinc-200 text-[14.5px]">Time left to turn it around</p>
          <p className="font-mono text-white text-[17px] font-bold tabular-nums whitespace-nowrap">{cd.d}d {pad(cd.h)}h {pad(cd.m)}m <span style={{ color: ROSE }}>{pad(cd.s)}s</span></p>
        </div>

        {/* The line */}
        <h2 className={`${display.className} text-white font-bold text-[30px] sm:text-[38px] tracking-[-0.03em] leading-[1.05] mt-12`}>You’ve already put a lot into {name}’s education. <span className="text-zinc-500">{weeksWord}</span></h2>
        <p className="text-zinc-400 text-[15px] leading-relaxed mt-4">The grade on results day is the one that follows them. The next few nights decide which one it is.</p>

        {/* The plan */}
        <p className={`${mono} font-bold mt-10`} style={{ color: GREEN }}>{name}’s plan</p>
        <div ref={planRef} className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] mt-3 overflow-clip">
          <div className="px-5 pt-4 pb-3.5 border-b border-white/[0.06]">
            <p className="text-[14.5px] font-semibold inline-flex items-center gap-2" style={{ color: GREEN }}><span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-[#07120d]" style={{ background: GREEN }}>✓</span>Ready to start tonight</p>
            <div className="h-1 rounded-full bg-white/[0.07] overflow-hidden mt-3"><div className="h-full rounded-full sa-bar-grow" style={{ background: GREEN, transform: planSeen ? "scaleX(1)" : "scaleX(0)" }} /></div>
          </div>
          {[
            { when: "Tonight", what: `Their weakest ${subjectLabel} topics, as timed exam questions`, min: 20, hot: true },
            { when: "Tomorrow", what: `A full ${system} practice set, marked like the real exam`, min: 20 },
            { when: result.weeks <= 1 ? "Exam morning" : "Every night", what: result.weeks <= 1 ? "A short warm-up so they walk in sharp" : "One task, marked, until the exam", min: result.weeks <= 1 ? 10 : 20 },
          ].map((r) => (
            <div key={r.when} className="px-5 py-3.5 grid grid-cols-[92px_1fr_auto] gap-3 items-center border-b border-white/[0.05] last:border-0">
              <span className={`${mono} ${r.hot ? "font-bold" : "text-zinc-500"}`} style={r.hot ? { color: GREEN } : undefined}>{r.when}</span>
              <span className="text-zinc-200 text-[14px]">{r.what}</span>
              <span className="font-mono text-zinc-500 text-[11.5px]">{r.min} min</span>
            </div>
          ))}
        </div>

        {/* Honest marking */}
        <p className={`${mono} font-bold mt-12`} style={{ color: VIOLET }}>Marked like an examiner</p>
        <h2 className={`${display.className} text-white font-bold text-[28px] sm:text-[34px] tracking-[-0.03em] leading-[1.05] mt-2`}>No ticking their own work. No marks for guesses.</h2>
        <div ref={marksRef} className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] p-5 mt-5">
          <div className="flex items-baseline justify-between gap-3"><p className="text-white text-[15px] font-semibold">Solve 3x + 7 = 22</p><span className={`${mono} text-zinc-500`}>2 marks</span></div>
          <div className="flex flex-col items-end gap-2 mt-4">
            <span className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: `${GREEN}22`, color: GREEN, opacity: marksSeen ? 1 : 0, transform: marksSeen ? "none" : "translateY(6px)", transition: "opacity .5s .2s, transform .5s .2s" }}>Working ✓ 1/1</span>
            <span className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ background: `${ROSE}22`, color: ROSE, opacity: marksSeen ? 1 : 0, transform: marksSeen ? "none" : "translateY(6px)", transition: "opacity .5s .7s, transform .5s .7s" }}>Answer ✗ 0/1</span>
          </div>
          <p className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-zinc-300 text-[13.5px] leading-relaxed mt-4" style={{ opacity: marksSeen ? 1 : 0, transition: "opacity .6s 1.1s" }}>Right method, slip at the end — 15 ÷ 3 is 5. In the exam that’s a mark gone. Here they find out tonight, not on results day.</p>
        </div>

        {/* Tutor */}
        <p className={`${mono} text-zinc-500 mt-12`}>Already paying a tutor?</p>
        <h2 className={`${display.className} text-white font-bold text-[28px] sm:text-[34px] tracking-[-0.03em] leading-[1.05] mt-2`}>Keep them. We cover the other six nights.</h2>
        <div ref={costRef} className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] p-5 mt-5">
          <p className={`${mono} text-zinc-500`}>Exam practice each week</p>
          <div className="flex items-baseline justify-between mt-3 text-[14px]"><span className="text-zinc-200">A tutor · 1 hour a week</span><span className="text-zinc-500 text-[13px]">60 min · ~NZ${TUTOR_HOURLY}</span></div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden mt-2"><div className="h-full rounded-full sa-bar-grow bg-zinc-500" style={{ transform: costSeen ? "scaleX(0.43)" : "scaleX(0)" }} /></div>
          <div className="flex items-baseline justify-between mt-4 text-[14px]"><span className="text-white font-semibold">StudyAce · 20 min every night</span><span className="text-[13px] font-semibold" style={{ color: GREEN }}>140 min · ~NZ${Math.round(perWeekYearly)}</span></div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden mt-2 relative"><div className="h-full rounded-full sa-bar-grow" style={{ background: GREEN, transform: costSeen ? "scaleX(1)" : "scaleX(0)", transitionDelay: ".15s" }} /></div>
          <p className="text-zinc-600 text-[12px] mt-3">StudyAce cost per week on the yearly plan. Tutor rate is a typical hourly figure.</p>
        </div>

        {/* Plans */}
        <p className={`${mono} font-bold mt-12`} style={{ color: GREEN }}>Pick a plan</p>
        <div className="mt-3 space-y-2.5">
          {([
            { b: "yearly" as Billing, title: "Whole year", badge: "Best value", sub: `Every exam this year · about NZ$${proMonthlyEquivalent("yearly").toFixed(0)} a month`, price: <>NZ${PRO_PRICING.yearly.amount}</> },
            { b: "monthly" as Billing, title: "Monthly", sub: "Cancel any time", price: <>NZ${PRO_PRICING.monthly.amount}<span className="text-zinc-500 text-[14px] font-semibold tracking-normal">/mo</span></> },
          ]).map((p) => {
            const on = billing === p.b;
            return (
              <button key={p.b} type="button" onClick={() => setBilling(p.b)} aria-pressed={on} className="w-full text-left rounded-[20px] border-2 bg-[#0e0f13] px-5 py-4 flex items-center justify-between gap-4 transition-colors" style={{ borderColor: on ? GREEN : "rgba(255,255,255,0.08)", boxShadow: on ? `0 0 0 4px ${GREEN}1a` : undefined }}>
                <div>
                  <p className="text-white text-[16px] font-bold inline-flex items-center gap-2">{p.title}{p.badge && <span className={`${mono} font-bold rounded-full px-2 py-0.5 text-[#07120d]`} style={{ background: GREEN }}>{p.badge}</span>}</p>
                  <p className="text-zinc-400 text-[13px] mt-1">{p.sub}</p>
                </div>
                <p className={`${display.className} text-white font-bold text-[28px] tracking-[-0.03em] shrink-0`}>{p.price}</p>
              </button>
            );
          })}
        </div>
        <div className="rounded-[20px] border border-white/[0.08] bg-[#0e0f13] px-5 py-4 mt-2.5 flex gap-3.5">
          <svg className="w-7 h-7 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.8" aria-hidden><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div><p className="text-white text-[15px] font-bold">30 days or your money back</p><p className="text-zinc-400 text-[13.5px] leading-relaxed mt-1">If it’s not working for {name}, you get every cent back. One email, no questions.</p></div>
        </div>
        {checkoutError && <p role="alert" className="text-amber-200 text-[13.5px] rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3 mt-3">{checkoutError} <Link href="/pricing" className="underline underline-offset-4">Pricing page →</Link></p>}
        <p className="text-zinc-600 text-[12.5px] text-center mt-8">A copy of this is on its way to {email}.{firstFix ? ` First thing to change: ${firstFix.charAt(0).toLowerCase()}${firstFix.slice(1)}.` : ""}</p>
      </div>

      {/* Sticky start */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#06060a] via-[#06060a]/95 to-transparent pt-8" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}>
        <div className="max-w-xl mx-auto px-5">
          <button type="button" onClick={startPlan} disabled={busy} className="w-full rounded-full min-h-[60px] text-[17px] font-extrabold text-[#07120d] inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-70" style={{ background: GREEN, boxShadow: `0 0 0 6px ${GREEN}1f, 0 10px 44px ${GREEN}55` }}>
            {busy ? "Opening checkout…" : <>Start {name}’s plan tonight · {ctaPrice} →</>}
          </button>
          <p className="text-zinc-500 text-[12px] text-center mt-2.5">Exam in <span className="font-mono" style={{ color: ROSE }}>{cd.d}d {pad(cd.h)}h {pad(cd.m)}m</span> · Set up in 5 minutes · 30-day money back</p>
        </div>
      </div>
    </div>
  );
}
