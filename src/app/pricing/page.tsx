"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { display } from "@/lib/displayFont";
import SiteFooter from "@/components/SiteFooter";
import { useTier } from "@/hooks/useTier";
import {
  BILLING_PERIODS,
  PRO_PRICING,
  proMonthlyEquivalent,
  proSavingPct,
  type Billing,
} from "@/lib/tierLimits";
import { gradeColor } from "@/lib/scoring";
import type { Grade } from "@/lib/types";

// Grade-check handoff (written by /grade on reveal) — keeps the funnel's
// context alive so this page pitches THEIR jump, not generic pricing.
type GradeResult = {
  bandLabel: string; grade: Grade; pct: number; subjectLabel: string;
  topBandLabel: string; targetMonth: string; system: string; ts: number;
};

// One plan — Pro — in three billing periods, side by side. There is no free
// plan (the free experience is the Grade Detector at /grade) and the old
// Student plan is closed to new signups: anyone still on it keeps it at the
// price they signed up at, and this page never touches that.
const PRO_FEATURES: { text: string; bold?: boolean }[] = [
  { text: "Unlimited practice exams", bold: true },
  { text: "Honest StudyAce marking on every answer", bold: true },
  { text: "100 StudyAce tutor chats per week", bold: true },
  { text: "Every subject in your exam system" },
  { text: "Adaptive difficulty (auto-tuned to you)" },
  { text: "Up to 20 questions (full mock exams)" },
  { text: "Personal study planner (week by week)" },
  { text: "Deep English essay marking (4-pass)" },
  { text: "Spaced repetition review" },
  { text: "Mock exam mode (timed, fullscreen)" },
  { text: "Full dashboard with analytics" },
  { text: "30-day money back guarantee" },
];

const OPTION_META: Record<Billing, { tag: string; note: string; highlight?: boolean }> = {
  monthly: { tag: "Flexible", note: "Renews monthly · cancel anytime" },
  quarterly: { tag: `Save ${proSavingPct("quarterly")}%`, note: "One payment every 3 months · cancel anytime" },
  yearly: { tag: `Save ${proSavingPct("yearly")}%`, note: "One payment a year · cancel anytime", highlight: true },
};

function pendingRef(): string | undefined {
  try { return localStorage.getItem("studyace-pending-ref") ?? undefined; } catch { return undefined; }
}

function nz(n: number): string {
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2);
}

export default function PricingPage() {
  const [loadingBilling, setLoadingBilling] = useState<Billing | "manage" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tier: currentTier, loading: tierLoading } = useTier();

  // Fresh grade-check result → personalised mission strip (nothing renders
  // until mounted, so there's no flash for visitors without one).
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem("studyace-grade-result");
        if (!raw) return;
        const r = JSON.parse(raw) as GradeResult;
        // Only honour recent results (7 days) — stale missions feel creepy.
        if (r?.bandLabel && r?.topBandLabel && Date.now() - (r.ts ?? 0) < 7 * 864e5) setGradeResult(r);
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const handleCheckout = useCallback(async (billing: Billing) => {
    setError(null);
    setLoadingBilling(billing);
    // checkout_started is logged server-side in /api/checkout (logEvent).
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro", billing, ref: pendingRef() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoadingBilling(null);
        return;
      }
      if (data.url) {
        // Mobile Safari can drop window.location.href after an await.
        // An anchor click is treated as a user gesture and always navigates.
        const a = document.createElement("a");
        a.href = data.url;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        // Fallback in case the click doesn't navigate
        setTimeout(() => {
          window.location.assign(data.url);
        }, 100);
      } else {
        setError("Checkout URL missing. Please try again.");
        setLoadingBilling(null);
      }
    } catch {
      setError("Failed to start checkout. Please try again.");
      setLoadingBilling(null);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    setError(null);
    setLoadingBilling("manage");
    try {
      const res = await fetch("/api/customer-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to open subscription portal. Please try again.");
    } finally {
      setLoadingBilling(null);
    }
  }, []);

  // Tier-conditional UI only renders once the real tier is known (no flicker).
  const isPro = !tierLoading && currentTier === "pro";
  const isLegacyStudent = !tierLoading && currentTier === "student";
  const isPaid = isPro || isLegacyStudent;
  const ctaLabel = "Get Pro";

  return (
    <div className="relative overflow-hidden bg-[#06060a]">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <section className="max-w-4xl mx-auto px-5 pt-6 sm:pt-20 pb-8 sm:pb-10 text-center">
        <div className="home-rise mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            One plan · Cancel anytime · No hidden fees
          </div>
        </div>
        <h1 className={`${display.className} home-rise text-[34px] sm:text-[52px] md:text-[64px] font-bold text-white tracking-[-0.03em] leading-[1.1] sm:leading-[1.05] mb-4 sm:mb-5`}
          style={{ animationDelay: "80ms", textWrap: "balance" }}>
          Everything in Pro.
          <br />
          <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent pr-1">
            Pick your pace.
          </em>
        </h1>
        <p className="home-rise text-zinc-400 text-[14px] sm:text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto mb-2 px-2"
          style={{ animationDelay: "160ms" }}>
          Same plan, same features, whichever way you pay. Cheaper than one tutoring session a month.
        </p>

        {/* Mission strip — carried over from the grade check */}
        {gradeResult && (
          <div className="home-rise max-w-xl mx-auto mt-6 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] px-5 py-4 text-left"
            style={{ animationDelay: "240ms" }}>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1.5">Your mission · from your grade check</p>
            <p className="text-white font-extrabold text-[16px] sm:text-[18px] leading-snug">
              {gradeResult.subjectLabel}:{" "}
              <span className={gradeColor(gradeResult.grade)}>{gradeResult.bandLabel}</span>
              <span className="text-zinc-500 mx-1.5">→</span>
              <span className="text-emerald-400">{gradeResult.topBandLabel}</span>
              <span className="text-zinc-400 font-semibold"> by end of {gradeResult.targetMonth}</span>
            </p>
            <p className="text-zinc-400 text-[12.5px] mt-1">
              Pro is the vehicle: unlimited {gradeResult.system}-style exams, honest marking, your weak topics first.
            </p>
          </div>
        )}
      </section>

      {/* Error banner */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-5 mb-4">
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 text-center">
            {error}
          </div>
        </div>
      )}

      {/* Already subscribed */}
      {isPro && (
        <div className="max-w-4xl mx-auto px-4 sm:px-5 mb-5">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mr-2">Current plan</span>
              <span className="text-white font-semibold text-[14px]">You&apos;re on Pro.</span>
              <span className="text-zinc-400 text-[13px]"> Your price stays exactly what you signed up at.</span>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={loadingBilling !== null}
              className="px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white text-[13px] font-semibold hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            >
              {loadingBilling === "manage" ? "Opening…" : "Manage subscription"}
            </button>
          </div>
        </div>
      )}
      {isLegacyStudent && (
        <div className="max-w-4xl mx-auto px-4 sm:px-5 mb-5">
          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mr-2">Current plan</span>
              <span className="text-white font-semibold text-[14px]">You&apos;re on the original plan, with everything in Pro.</span>
              <span className="text-zinc-400 text-[13px]"> Your price stays exactly what you signed up at.</span>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={loadingBilling !== null}
              className="px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white text-[13px] font-semibold hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            >
              {loadingBilling === "manage" ? "Opening…" : "Manage subscription"}
            </button>
          </div>
        </div>
      )}

      {/* The three ways to pay — one line */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 pb-6 sm:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          {BILLING_PERIODS.map((billing, i) => {
            const p = PRO_PRICING[billing];
            const meta = OPTION_META[billing];
            const perMonth = proMonthlyEquivalent(billing);
            const busy = loadingBilling === billing;
            const disabled = loadingBilling !== null || isPaid;
            return (
              <div
                key={billing}
                className={`home-rise relative rounded-[28px] border p-5 sm:p-6 flex flex-col transition-all ${
                  meta.highlight
                    ? "border-indigo-400/40 bg-indigo-500/[0.06] shadow-xl shadow-indigo-500/10"
                    : "border-white/[0.07] bg-white/[0.015]"
                }`}
                style={{ animationDelay: `${280 + i * 80}ms` }}
              >
                {meta.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/30 whitespace-nowrap">
                      Best value
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{p.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    meta.highlight
                      ? "bg-emerald-500/15 text-emerald-400"
                      : billing === "quarterly"
                      ? "bg-emerald-500/10 text-emerald-400/90"
                      : "bg-white/[0.05] text-zinc-400"
                  }`}>
                    {meta.tag}
                  </span>
                </div>

                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-zinc-400 text-[16px] font-medium">NZ$</span>
                  <span className="font-bold text-white tabular-nums text-[40px] sm:text-[44px] leading-none tracking-[-0.02em]">{nz(p.amount)}</span>
                </div>
                <p className="text-zinc-500 text-[12px] mb-1">{p.per}</p>
                <p className={`text-[12.5px] mb-5 ${meta.highlight ? "text-indigo-300" : "text-zinc-400"}`}>
                  {billing === "monthly" ? "Pay as you go" : <>≈ NZ${perMonth.toFixed(2)} a month</>}
                </p>

                {(
                  <button
                    onClick={() => handleCheckout(billing)}
                    disabled={disabled}
                    className={`mt-auto w-full text-center py-3 rounded-full text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 min-h-[48px] ${
                      meta.highlight
                        ? "bg-white text-[#0a0a0f] font-bold hover:scale-[1.02] shadow-2xl shadow-indigo-500/20"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600 font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02]"
                    }`}
                  >
                    {isPaid ? "Current plan" : busy ? "Redirecting…" : ctaLabel}
                  </button>
                )}
                <p className="text-zinc-600 text-[11px] mt-3 text-center">{meta.note}</p>
              </div>
            );
          })}
        </div>
        <p className="text-center text-zinc-600 text-[11.5px] mt-4">
          Prices in NZD, GST included · Billed by Stripe · Cancel from your dashboard any time
        </p>
      </section>

      {/* What Pro includes */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 pb-12 sm:pb-20">
        <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-6">
            <div>
              <h2 className={`${display.className} text-[22px] sm:text-[28px] font-bold text-white tracking-[-0.02em]`}>What&apos;s in Pro</h2>
              <p className="text-zinc-500 text-[13px] mt-1">Every feature, on every billing option. Nothing is held back.</p>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">Built to chase Excellence</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-[13.5px]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className={f.bold ? "text-white font-medium" : "text-zinc-300"}>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison stats */}
      <section className="max-w-3xl mx-auto px-5 pb-12 sm:pb-20">
        <div className="rounded-[32px] bg-white/[0.015] border border-white/[0.07] p-4 sm:p-8">
          <h2 className={`${display.className} text-[20px] sm:text-[26px] font-bold text-white text-center tracking-[-0.02em] mb-2`} style={{ textWrap: "balance" }}>Compare the cost</h2>
          <p className="text-zinc-500 text-[13px] text-center mb-8">Study Ace vs. the alternatives</p>

          <div className="space-y-3">
            <CompareRow label="One private tutoring session (1 hour)" cost="$60–$80" />
            <CompareRow label="A single revision workbook" cost="$25–$40" />
            <CompareRow label="Study Ace Pro for a whole month" cost={`$${nz(PRO_PRICING.monthly.amount)}`} highlight />
            <CompareRow label="Study Ace Pro for a whole year" cost={`$${nz(PRO_PRICING.yearly.amount)}`} highlight />
            <CompareRow label="Failing an exam and retaking it next year" cost="A whole year" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pb-16 sm:pb-24">
        <h2 className={`${display.className} text-[24px] sm:text-[32px] font-bold text-white text-center tracking-[-0.02em] mb-6 sm:mb-10`}>Common questions</h2>
        <div className="space-y-3">
          <Faq
            q="Will this actually help me pass?"
            a="Yes — practising exam-style questions is the single most effective way to improve marks. Study Ace gives you unlimited practice with instant honest feedback, StudyAce tutoring when you're stuck, and spaced repetition so you actually remember what you learn."
          />
          <Faq
            q="What's the difference between the three options?"
            a={`Nothing except how often you pay. Monthly is NZ$${nz(PRO_PRICING.monthly.amount)} each month. The 3-month option is one payment of NZ$${nz(PRO_PRICING.quarterly.amount)} (about NZ$${proMonthlyEquivalent("quarterly").toFixed(2)} a month). Yearly is one payment of NZ$${nz(PRO_PRICING.yearly.amount)} for the whole year (about NZ$${proMonthlyEquivalent("yearly").toFixed(2)} a month). Same features on all three.`}
          />
          <Faq
            q="Can I cancel anytime?"
            a="Yes. Cancel any time from your dashboard. You'll keep access until the end of whatever period you've paid for. No phone calls, no awkward emails."
          />
          <Faq
            q="What if it doesn't work for me?"
            a="Pro comes with a 30-day money back guarantee. If you've practised consistently and don't feel more confident, we'll refund you in full."
          />
          <Faq
            q="I subscribed before this pricing. Does my price change?"
            a="No. If you're already subscribed, you keep the exact price you signed up at for as long as your subscription stays active — monthly, yearly, Student or Pro. Nothing changes unless you cancel and re-subscribe, or choose to upgrade yourself."
          />
          <Faq
            q="Is my progress saved?"
            a="Yes. Your dashboard tracks every exam you take, every topic you've practised, and how you've improved over time — plus spaced-repetition reviews so you actually remember it."
          />
          <Faq
            q="Why are prices in NZ dollars?"
            a={`StudyAce is billed in New Zealand dollars wherever you are — your card converts automatically at checkout, no extra steps. Roughly, NZ$${nz(PRO_PRICING.monthly.amount)} is about US$29, £22, A$45 or C$40 a month, and the yearly option works out to about US$7 a month.`}
          />
          <Faq
            q="Do you have a student discount?"
            a="Pricing is already set for students — a month of Pro costs less than a single hour of tutoring. Paying yearly brings it down to about NZ$12 a month."
          />
          <Faq
            q="What subjects are covered?"
            a="All the core subjects in your exam system — Maths, English, the sciences, humanities, commerce and more. Pick your exam system (NCEA, HSC, QCE, GCSE, A-Levels, AP and more) and you'll see the exact subject list for it."
          />
        </div>
      </section>

      {/* Final CTA — visitors and leads only; a paying student has nothing to decide here */}
      {!isPaid && (
      <section className="max-w-3xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="rounded-[32px] bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent border border-white/[0.07] p-5 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none" aria-hidden
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.22) 0%, transparent 70%)" }} />
          <div className="relative">
            <h2 className={`${display.className} text-[26px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-[-0.02em] mb-4`} style={{ textWrap: "balance" }}>
              Not sure yet? See your{" "}
              <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">real grade</em>
              {" "}first
            </h2>
            <p className="text-zinc-400 text-[15px] mb-8 max-w-md mx-auto">
              Sit the free 8-question grade check — see exactly where you are before you pay a cent.
            </p>
            <Link
              href="/grade"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-bold px-9 py-4 rounded-full transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20 text-[15px]"
            >
              Get my free grade check
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      )}
      <SiteFooter />
    </div>
  );
}

function CompareRow({ label, cost, highlight }: { label: string; cost: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${
        highlight
          ? "bg-indigo-500/15 border border-indigo-500/30"
          : "bg-white/[0.02] border border-white/[0.06]"
      }`}
    >
      <span className={`text-[13px] sm:text-[14px] min-w-0 ${highlight ? "text-white font-semibold" : "text-zinc-300"}`}>{label}</span>
      <span className={`text-[13px] sm:text-[14px] tabular-nums shrink-0 ${highlight ? "text-indigo-300 font-bold" : "text-zinc-500"}`}>
        {cost}
      </span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-white font-medium text-[14px]">{q}</span>
        <svg
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-zinc-400 text-[13px] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}
