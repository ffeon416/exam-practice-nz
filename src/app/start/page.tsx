"use client";

// /start — the ONLY screen a signed-in, unpaid account ever sees.
//
// Door 1 (convert) ends here. A lead has an account but no plan; every
// coach route ((coach)/layout.tsx) sends them back to this page. Its job is
// one thing: the subscription. It also absorbs the two housekeeping jobs
// that used to live in /welcome for leads — claiming a pending referral and
// the one-tap "how did you hear about us" — and it is the landing page for
// the Stripe success redirect, where it waits for the webhook to flip the
// tier before handing over to the coach app.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { useTier } from "@/hooks/useTier";
import { BILLING_PERIODS, PRO_PRICING, proMonthlyEquivalent, proSavingPct, type Billing } from "@/lib/tierLimits";
import { gradeColor } from "@/lib/scoring";
import { scopedKey } from "@/lib/userScope";
import type { Grade } from "@/lib/types";

type GradeResult = {
  bandLabel: string; grade: Grade; pct: number; subjectLabel: string;
  topBandLabel: string; targetMonth: string; system: string; ts: number;
};

const SOURCES = [
  { v: "tiktok", l: "TikTok" }, { v: "instagram", l: "Instagram" }, { v: "youtube", l: "YouTube" },
  { v: "google", l: "Google" }, { v: "friend", l: "A friend" }, { v: "parent", l: "A parent" },
  { v: "school", l: "School" }, { v: "other", l: "Other" },
];

const INCLUDED = [
  "Unlimited exam-style papers, every subject",
  "Every answer marked like an examiner: working and answer, no rounding up",
  "A week-by-week plan built from what you get wrong",
  "Tutor chat for the moment you're stuck",
];

function StartInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { tier, loading: tierLoading, refresh } = useTier();

  const paymentSuccess = params.get("payment") === "success";
  const purchasedPlan = params.get("plan");

  // ── Paid? Then this isn't your page. ──
  useEffect(() => {
    if (tierLoading || tier === "free") return;
    // New buyer → /today, which sends anyone without onboarding to /welcome
    // (the first-five-minutes flow). The purchased plan is implied by the tier.
    void purchasedPlan;
    router.replace("/today");
  }, [tier, tierLoading, paymentSuccess, purchasedPlan, router]);

  // ── Stripe just redirected here: poll until the webhook lands. ──
  const [confirmTries, setConfirmTries] = useState(0);
  const confirmStalled = confirmTries >= 20; // ~30 s of polling
  useEffect(() => {
    if (!paymentSuccess || tierLoading || tier !== "free" || confirmStalled) return;
    const id = setTimeout(() => { refresh(); setConfirmTries((n) => n + 1); }, 1500);
    return () => clearTimeout(id);
  }, [paymentSuccess, tier, tierLoading, confirmStalled, refresh]);

  // ── Referral claim (moved here from /welcome, which is paid-only now). ──
  useEffect(() => {
    if (!isLoaded || !user) return;
    let pending: string | null = null;
    try { pending = window.localStorage.getItem("studyace-pending-ref"); } catch { return; }
    if (!pending) return;
    fetch("/api/refer/claim", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId: pending }),
    }).catch(() => {}).finally(() => {
      try { window.localStorage.removeItem("studyace-pending-ref"); } catch {}
    });
  }, [isLoaded, user]);

  // ── Grade-check handoff (same key /pricing reads). ──
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [heardDone, setHeardDone] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const raw = localStorage.getItem("studyace-grade-result");
        if (raw) {
          const r = JSON.parse(raw) as GradeResult;
          if (r?.bandLabel && r?.topBandLabel && Date.now() - (r.ts ?? 0) < 14 * 864e5) setGradeResult(r);
        }
      } catch {}
      try { setHeardDone(localStorage.getItem(scopedKey("studyace-heard-done")) === "1"); } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function heard(source: string) {
    try { localStorage.setItem(scopedKey("studyace-heard-done"), "1"); } catch {}
    setHeardDone(true);
    fetch("/api/heard-about", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }), keepalive: true,
    }).catch(() => {});
  }

  // ── Checkout ──
  const [busy, setBusy] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigating = useRef(false);
  const checkout = useCallback(async (billing: Billing) => {
    if (navigating.current) return;
    setError(null); setBusy(billing);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro", billing }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) { setError(data.error ?? "Something went wrong. Try again."); setBusy(null); return; }
      navigating.current = true;
      const a = document.createElement("a"); a.href = data.url; a.rel = "noopener";
      document.body.appendChild(a); a.click();
      setTimeout(() => window.location.assign(data.url), 100);
    } catch { setError("Couldn't start checkout. Try again."); setBusy(null); }
  }, []);

  const firstName = user?.firstName?.trim() || null;

  // While the tier is unknown, or while we're waiting on Stripe's webhook,
  // show a neutral state — never a wrong one (house rule: no tier flicker).
  if (!isLoaded || tierLoading || (paymentSuccess && !confirmStalled && tier === "free")) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin mx-auto mb-4" aria-hidden />
          <p className="text-white font-semibold text-[15px]">{paymentSuccess ? "Confirming your payment…" : "One moment…"}</p>
          {paymentSuccess && <p className="text-zinc-500 text-[12.5px] mt-1">This takes a few seconds.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-clip bg-[#06060a]">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8 sm:pt-14 pb-16">
        {confirmStalled && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-[13px] text-amber-200">
            Your payment went through but your plan hasn&apos;t activated yet. Give it a minute and refresh. If it&apos;s still not showing, email <a href="mailto:grades@studyace.co" className="underline">grades@studyace.co</a> and we&apos;ll sort it straight away.
          </div>
        )}

        <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
          {firstName ? `${firstName}, you're signed in` : "You're signed in"}
        </p>
        <h1 className={`${display.className} text-[34px] sm:text-[46px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-3`} style={{ textWrap: "balance" }}>
          {gradeResult
            ? <>Your account is ready. <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Your plan isn&apos;t.</em></>
            : <>One step left: <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">pick how to pay.</em></>}
        </h1>
        <p className="text-zinc-400 text-[15px] leading-relaxed mb-7">
          Practice papers, marking, the tutor and the plan are all on Pro. Choose a period below and you&apos;ll be sitting your first paper in about a minute.
        </p>

        {gradeResult && (
          <div className="mb-7 rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.06] px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1.5">Your grade check</p>
            <p className="text-white font-extrabold text-[16px] sm:text-[18px] leading-snug">
              {gradeResult.subjectLabel}:{" "}
              <span className={gradeColor(gradeResult.grade)}>{gradeResult.bandLabel}</span>
              <span className="text-zinc-500 mx-1.5">→</span>
              <span className="text-emerald-400">{gradeResult.topBandLabel}</span>
              <span className="text-zinc-400 font-semibold"> by end of {gradeResult.targetMonth}</span>
            </p>
            <p className="text-zinc-400 text-[12.5px] mt-1">That jump is the plan. Twenty minutes a night, weakest topics first.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300">{error}</div>
        )}

        {/* Three ways to pay — one tap to Stripe. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {BILLING_PERIODS.map((b) => {
            const p = PRO_PRICING[b];
            const best = b === "yearly";
            return (
              <button
                key={b}
                onClick={() => checkout(b)}
                disabled={busy !== null}
                className={`relative text-left rounded-[22px] border p-4 sm:p-5 transition-all min-h-[96px] disabled:opacity-60 ${
                  best ? "border-indigo-400/40 bg-indigo-500/[0.08] hover:bg-indigo-500/[0.12]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]"
                }`}
              >
                {best && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">Best value</span>
                )}
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400 mb-1.5">{p.label}</p>
                <p className="flex items-baseline gap-1">
                  <span className="text-zinc-400 text-[13px]">NZ$</span>
                  <span className={`${display.className} text-white font-bold text-[30px] leading-none tracking-[-0.02em]`}>{p.amount}</span>
                </p>
                <p className="text-zinc-500 text-[11.5px] mt-1">
                  {b === "monthly" ? "per month" : <>≈ NZ${proMonthlyEquivalent(b).toFixed(2)}/mo · save {proSavingPct(b)}%</>}
                </p>
                <p className={`mt-3 text-[13px] font-semibold ${best ? "text-indigo-300" : "text-zinc-300"}`}>
                  {busy === b ? "Opening checkout…" : "Start Pro →"}
                </p>
              </button>
            );
          })}
        </div>
        <p className="text-center text-zinc-600 text-[11.5px] mb-8">Cancel anytime · 30-day money back · Billed in NZD by Stripe</p>

        <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.015] p-5 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-3">What Pro is</p>
          <ul className="space-y-2">
            {INCLUDED.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-zinc-300">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {!heardDone && (
          <div className="mb-8">
            <p className="text-zinc-500 text-[12.5px] mb-2">Quick one: how did you hear about StudyAce?</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button key={s.v} onClick={() => heard(s.v)}
                  className="px-3.5 py-2 rounded-full text-[12.5px] bg-white/[0.03] border border-white/[0.1] text-zinc-300 hover:border-indigo-400/50 hover:text-white transition-colors min-h-[40px]">
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <Link href="/grade" className="text-indigo-400 font-semibold hover:underline">Sit another free grade check →</Link>
          <button onClick={() => signOut({ redirectUrl: "/" })} className="text-zinc-500 hover:text-zinc-300 transition-colors">Sign out</button>
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary for the static shell.
export default function StartPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-hidden />}>
      <StartInner />
    </Suspense>
  );
}
