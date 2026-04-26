"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ReferralStats {
  referralsCount: number;
  proUntil: string | null;
  bonusExamsRemaining: number;
}

function daysFromNow(iso: string | null): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function ReferPage() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/refer/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data as ReferralStats))
      .catch(() => {
        /* fall back to zero state */
      });
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-20 pb-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.04] rounded w-48" />
          <div className="h-4 bg-white/[0.04] rounded w-64" />
        </div>
      </div>
    );
  }

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign-up?ref=${user.id}`
      : `https://studyace.co/sign-up?ref=${user.id}`;

  const proDaysLeft = daysFromNow(stats?.proUntil ?? null);
  const referralsCount = stats?.referralsCount ?? 0;

  const shareMessage = `I'm using Study Ace to practise for NCEA — sign up here and get 5 bonus exams: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Study Ace",
          text: shareMessage,
        });
      } catch {
        /* user cancelled */
      }
    }
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
        <div className="absolute top-[300px] right-0 w-[400px] h-[400px] bg-fuchsia-500/[0.06] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[13px] mb-8 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Profile
        </Link>

        <h1 className="text-[28px] sm:text-[40px] font-extrabold text-white tracking-tight mb-2">
          Get free Pro by inviting friends
        </h1>
        <p className="text-zinc-400 text-[15px] mb-8 sm:mb-10 leading-relaxed">
          Every friend who signs up unlocks <span className="text-white font-semibold">7 days of Pro</span> for you,
          and gets <span className="text-white font-semibold">5 bonus exams</span> on the house.
        </p>

        {/* Stats row — only render once loaded so the zero state isn't a flash */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-indigo-500/[0.02] border border-indigo-500/15 p-4 sm:p-5">
              <p className="text-[11px] text-indigo-400 uppercase tracking-[0.18em] font-bold mb-2">Friends joined</p>
              <p className="text-[32px] sm:text-[40px] font-extrabold text-white leading-none">{referralsCount}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/[0.08] to-fuchsia-500/[0.02] border border-fuchsia-500/15 p-4 sm:p-5">
              <p className="text-[11px] text-fuchsia-400 uppercase tracking-[0.18em] font-bold mb-2">Pro days left</p>
              <p className="text-[32px] sm:text-[40px] font-extrabold text-white leading-none">{proDaysLeft}</p>
            </div>
          </div>
        )}

        {/* Referral link card */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            Your referral link
          </h2>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
            <p className="text-zinc-300 text-[13px] break-all font-mono select-all">{referralLink}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:opacity-95 text-white text-[14px] font-bold transition-opacity min-h-[48px] shadow-lg shadow-indigo-500/20"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>

            {canShare && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 text-[14px] font-semibold transition-colors min-h-[48px]"
              >
                Share
              </button>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            How it works
          </h2>
          <div className="space-y-4">
            <Step number={1} text="Share your link with a friend studying for NCEA" />
            <Step number={2} text="They sign up and instantly get 5 bonus exams" />
            <Step number={3} text="You get 7 days of Pro added to your account — stacks for every friend" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[12px] font-bold">
        {number}
      </span>
      <span className="text-zinc-300 text-[14px] leading-relaxed">{text}</span>
    </div>
  );
}
