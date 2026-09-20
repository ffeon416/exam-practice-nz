"use client";

// /start — the seam between paying and using StudyAce.
//
// There is no sign-up. Checkout is anonymous; Stripe sends the buyer here
// with a session id, and THIS page creates their login (Clerk restricts
// sign-ups to emails that have paid — the webhook allowlists them). Once
// signed in, the subscription is attached to the new account and they're
// handed to /today. It also still serves the few legacy unpaid accounts that
// exist from before: one-tap checkout, nothing else.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignUp, useClerk, useUser } from "@clerk/nextjs";
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

function Spinner({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin mx-auto mb-4" aria-hidden />
        <p className="text-white font-semibold text-[15px]">{title}</p>
        {sub && <p className="text-zinc-500 text-[12.5px] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StartInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { tier, loading: tierLoading, refresh } = useTier();

  const sessionId = params.get("session_id");
  const paymentSuccess = params.get("payment") === "success" || !!sessionId;
  // Arriving back from the Clerk invitation link: the SignUp form below
  // consumes __clerk_ticket from the URL and binds to the invited email.
  const hasTicket = !!params.get("__clerk_ticket");

  // ── Signed-out: with a paid session, create the login; otherwise pricing ──
  type SessionInfo = { paid: boolean; email: string | null; accountExists: boolean; ticketUrl: string | null };
  const [session, setSession] = useState<SessionInfo | "loading" | "error">("loading");
  useEffect(() => {
    if (!isLoaded || isSignedIn || hasTicket) return;
    if (!sessionId) { router.replace("/pricing"); return; }
    let cancelled = false;
    fetch(`/api/checkout/session?id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d: Partial<SessionInfo>) => {
        if (cancelled) return;
        const info: SessionInfo = { paid: !!d?.paid, email: d?.email ?? null, accountExists: !!d?.accountExists, ticketUrl: d?.ticketUrl ?? null };
        setSession(info);
        // Paid, no account yet → straight into the invitation link, which
        // brings them back here with the ticket for the sign-up form.
        if (info.paid && !info.accountExists && info.ticketUrl) window.location.replace(info.ticketUrl);
      })
      .catch(() => { if (!cancelled) setSession("error"); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, sessionId, hasTicket, router]);

  // ── Signed-in: paid → the app ──
  useEffect(() => {
    if (!isSignedIn || tierLoading || tier === "free") return;
    router.replace("/today");
  }, [isSignedIn, tier, tierLoading, router]);

  // ── Signed-in, just paid: attach the subscription, then the app ──
  const [claimTries, setClaimTries] = useState(0);
  const claimStalled = claimTries >= 12; // ~25 s
  useEffect(() => {
    if (!isSignedIn || !paymentSuccess || tierLoading || tier !== "free" || claimStalled) return;
    let cancelled = false;
    const run = async () => {
      try {
        await fetch("/api/claim", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {}
      if (cancelled) return;
      refresh();
      setClaimTries((n) => n + 1);
    };
    const id = setTimeout(run, claimTries === 0 ? 0 : 2000);
    return () => { cancelled = true; clearTimeout(id); };
  }, [isSignedIn, paymentSuccess, tier, tierLoading, claimTries, claimStalled, sessionId, refresh]);

  // Referral claim for a brand-new account (link captured by RefCapture).
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

  // Grade-check handoff + attribution chips (legacy unpaid accounts only).
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

  if (!isLoaded) return <Spinner title="One moment…" />;

  // ── Signed-out after paying: create the login ──
  if (!isSignedIn) {
    if (!sessionId) return <Spinner title="One moment…" />;
    if (hasTicket) {
      const back = `/start?payment=success&session_id=${encodeURIComponent(sessionId)}`;
      return (
        <div className="max-w-md mx-auto px-5 pt-8 sm:pt-12 pb-16">
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Payment received</p>
          <h1 className={`${display.className} text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>Create your login</h1>
          <p className="text-zinc-400 text-[14px] mb-6">This is how you get back in on any device. It&apos;s tied to the email you paid with.</p>
          <div className="flex justify-center">
            <SignUp routing="hash" forceRedirectUrl={back} fallbackRedirectUrl={back} signInUrl="/sign-in" />
          </div>
        </div>
      );
    }
    if (session === "loading") return <Spinner title="Confirming your payment…" sub="This takes a few seconds." />;
    if (session === "error" || !session.paid) {
      return (
        <div className="max-w-md mx-auto px-5 pt-14 pb-16 text-center">
          <h1 className={`${display.className} text-[28px] font-bold text-white tracking-[-0.02em] mb-3`}>We couldn&apos;t confirm that payment</h1>
          <p className="text-zinc-400 text-[14px] mb-6">If your card was charged, email <a href="mailto:grades@studyace.co" className="text-indigo-400 underline">grades@studyace.co</a> and we&apos;ll set you up straight away. Otherwise, try again.</p>
          <Link href="/pricing" className="inline-block bg-white text-[#0a0a0f] font-bold px-8 py-3.5 rounded-full">Back to pricing</Link>
        </div>
      );
    }
    if (session.accountExists) {
      return (
        <div className="max-w-md mx-auto px-5 pt-14 pb-16 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Payment received</p>
          <h1 className={`${display.className} text-[28px] font-bold text-white tracking-[-0.02em] mb-3`}>You already have a login</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Sign in with <span className="text-white font-semibold">{session.email}</span> and your plan will be attached automatically.</p>
          <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/start?payment=success&session_id=${sessionId}`)}`} className="inline-block bg-white text-[#0a0a0f] font-bold px-8 py-3.5 rounded-full">Sign in</Link>
        </div>
      );
    }
    // Paid, no account, ticket link couldn't be produced: give them a way forward.
    return (
      <div className="max-w-md mx-auto px-5 pt-14 pb-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Payment received</p>
        <h1 className={`${display.className} text-[28px] font-bold text-white tracking-[-0.02em] mb-3`}>Check your email</h1>
        <p className="text-zinc-400 text-[14px] mb-6">We&apos;ve sent a link to <span className="text-white font-semibold">{session.email}</span> to create your login. If it doesn&apos;t arrive in a few minutes, email <a href="mailto:grades@studyace.co" className="text-indigo-400 underline">grades@studyace.co</a>.</p>
        {session.ticketUrl && <a href={session.ticketUrl} className="inline-block bg-white text-[#0a0a0f] font-bold px-8 py-3.5 rounded-full">Create my login</a>}
      </div>
    );
  }

  // ── Signed-in ──
  if (tierLoading || (paymentSuccess && !claimStalled && tier === "free")) {
    return <Spinner title={paymentSuccess ? "Setting up your account…" : "One moment…"} sub={paymentSuccess ? "Linking your payment to this login." : undefined} />;
  }

  const firstName = user?.firstName?.trim() || null;

  return (
    <div className="relative overflow-x-clip bg-[#06060a]">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8 sm:pt-14 pb-16">
        {claimStalled && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-[13px] text-amber-200">
            Your payment went through but we couldn&apos;t link it to this login. Most often that means a different email was used. Email <a href="mailto:grades@studyace.co" className="underline">grades@studyace.co</a> and we&apos;ll sort it straight away.
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

export default function StartPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-hidden />}>
      <StartInner />
    </Suspense>
  );
}
