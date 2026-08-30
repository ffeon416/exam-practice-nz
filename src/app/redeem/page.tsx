"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { display } from "@/lib/displayFont";
import { useTier } from "@/hooks/useTier";

type RedeemResponse =
  | { ok: true; tier: "student" | "pro"; until: string }
  | { ok: false; reason: string };

const TIER_LABEL: Record<string, string> = { pro: "Pro", student: "Student" };

const ERRORS: Record<string, string> = {
  invalid: "That code isn't valid. Double-check it and try again.",
  expired: "That code has expired.",
  full: "This code has reached its limit — every spot has been claimed.",
  already: "You've already redeemed this code. You're all set!",
  unauthorized: "Please sign in first, then come back to redeem.",
  error: "Something went wrong. Please try again in a moment.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RedeemPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { refresh: refreshTier } = useTier();

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [granted, setGranted] = useState<{ tier: string; until: string } | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as RedeemResponse;
      if (data.ok) {
        setGranted({ tier: data.tier, until: data.until });
        setStatus("success");
        // Bust the 60s tier cache so the dashboard shows the new plan
        // immediately instead of the stale "free" snapshot.
        refreshTier();
      } else {
        setMessage(ERRORS[data.reason] ?? ERRORS.error);
        setStatus("error");
      }
    } catch {
      setMessage(ERRORS.error);
      setStatus("error");
    }
  }

  // ── Loading auth ──
  if (!isLoaded) {
    return (
      <div className="max-w-md mx-auto px-5 pt-24 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.04] rounded w-48" />
          <div className="h-12 bg-white/[0.04] rounded" />
        </div>
      </div>
    );
  }

  // ── Not signed in ──
  if (!isSignedIn) {
    return (
      <div className="max-w-md mx-auto px-5 pt-24 pb-24 text-center">
        <h1 className={`${display.className} text-[26px] font-bold text-white tracking-[-0.02em] mb-2`} style={{ textWrap: "balance" }}>
          Redeem your code
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          Sign up or sign in first — it&apos;s free and takes a few seconds. Then enter your
          code to unlock your plan.
        </p>
        <Link
          href="/sign-up?redirect_url=/redeem"
          className="block w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 transition-all text-white font-extrabold shadow-lg shadow-indigo-500/30 py-3.5 mb-3 min-h-[44px]"
        >
          Create a free account
        </Link>
        <Link
          href="/sign-in?redirect_url=/redeem"
          className="block w-full rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-zinc-200 font-semibold py-3.5 min-h-[44px]"
        >
          I already have an account
        </Link>
      </div>
    );
  }

  // ── Success ──
  if (status === "success" && granted) {
    return (
      <div className="max-w-md mx-auto px-5 pt-24 pb-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/15">
          <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className={`${display.className} text-[26px] font-bold text-white tracking-[-0.02em] mb-2`} style={{ textWrap: "balance" }}>
          You&apos;re on {TIER_LABEL[granted.tier] ?? granted.tier}! 🎉
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          Your {TIER_LABEL[granted.tier] ?? granted.tier} access is active until{" "}
          <span className="text-zinc-200 font-medium">{formatDate(granted.until)}</span>. Enjoy —
          everything&apos;s unlocked.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="block w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 transition-all text-white font-extrabold shadow-lg shadow-indigo-500/30 py-3.5 min-h-[44px]"
        >
          Go to my dashboard
        </button>
      </div>
    );
  }

  // ── Enter code ──
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-md mx-auto px-5 pt-24 pb-24">
      <div className="text-center mb-8">
        <h1
          className={`${display.className} home-rise text-[26px] font-bold text-white tracking-[-0.02em] mb-2`}
          style={{ textWrap: "balance" }}
        >
          Redeem your code
        </h1>
        <p className="home-rise text-zinc-400 text-sm" style={{ animationDelay: "80ms" }}>
          {user?.firstName ? `Hi ${user.firstName}! ` : ""}
          Enter the code your school gave you to unlock your free plan.
        </p>
      </div>

      <form onSubmit={handleRedeem}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER CODE"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 focus:border-indigo-400/60 focus:outline-none text-center text-lg tracking-widest font-semibold text-white py-4 mb-3 placeholder:text-zinc-600 placeholder:tracking-widest"
        />

        {status === "error" && (
          <p className="text-rose-400 text-sm text-center mb-3">{message}</p>
        )}

        <button
          type="submit"
          disabled={!code.trim() || status === "loading"}
          className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 disabled:opacity-50 disabled:hover:opacity-50 transition-all text-white font-extrabold shadow-lg shadow-indigo-500/30 py-3.5 min-h-[44px]"
        >
          {status === "loading" ? "Redeeming…" : "Redeem"}
        </button>
      </form>

      <p className="text-zinc-600 text-xs text-center mt-6">
        No payment needed. Your plan unlocks instantly and ends on its own — nothing to cancel.
      </p>
      </div>
    </div>
  );
}
