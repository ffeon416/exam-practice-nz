"use client";

import Link from "next/link";
import { useTier } from "@/hooks/useTier";

interface UpgradeNudgeProps {
  /** Short headline (auto-selected if omitted) */
  headline?: string;
  /** Short body text (auto-selected if omitted) */
  body?: string;
  /** Size variant */
  variant?: "card" | "inline";
}

const DEFAULTS = {
  headline: "Unlock the good stuff",
  body: "Go unlimited on exams, tutor chats, deep essay marking, adaptive difficulty and more.",
};

export default function UpgradeNudge({
  headline = DEFAULTS.headline,
  body = DEFAULTS.body,
  variant = "card",
}: UpgradeNudgeProps) {
  const { tier, loading } = useTier();
  if (loading || tier !== "free") return null;

  if (variant === "inline") {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 text-[12px] text-indigo-300 hover:text-indigo-200 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        Upgrade for unlimited &rarr;
      </Link>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-500/[0.12] to-purple-500/[0.05] border border-indigo-500/20 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[14px] mb-1">{headline}</p>
          <p className="text-zinc-400 text-[12px] leading-relaxed mb-3">{body}</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[12px] font-semibold transition-colors"
          >
            See plans
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
