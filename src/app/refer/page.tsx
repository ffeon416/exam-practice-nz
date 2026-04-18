"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

export default function ReferPage() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);

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
      : `https://studyace.co.nz/sign-up?ref=${user.id}`;

  const shareMessage = `I've been using StudyAce to practise for NCEA exams — try it free: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
          title: "StudyAce",
          text: shareMessage,
        });
      } catch {
        // User cancelled or share failed — ignore
      }
    }
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-12 sm:pt-16 pb-20">
        {/* Back link */}
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[13px] mb-8 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Profile
        </Link>

        {/* Header */}
        <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-1">
          Invite friends
        </h1>
        <p className="text-zinc-500 text-[14px] mb-10">
          Share StudyAce with your mates and help them practise for their exams too.
        </p>

        {/* Referral link card */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 mb-4">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            Your referral link
          </h2>

          {/* Link display */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
            <p className="text-zinc-300 text-[13px] break-all font-mono select-all">
              {referralLink}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[14px] font-semibold transition-colors"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>

            {canShare && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-300 text-[14px] font-semibold transition-colors"
              >
                Share
              </button>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
          <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">
            How it works
          </h2>
          <div className="space-y-4">
            <Step number={1} text="Share your unique link with a friend" />
            <Step number={2} text="They sign up for a free StudyAce account" />
            <Step
              number={3}
              text="They start practising and you both benefit from studying together"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[12px] font-bold">
        {number}
      </span>
      <span className="text-zinc-400 text-[14px]">{text}</span>
    </div>
  );
}
