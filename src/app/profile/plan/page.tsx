"use client";

// /profile/plan — everything the plan includes, on one plain page. Reached
// by tapping the gold "Pro" pill on the dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { display } from "@/lib/displayFont";
import { useTier, isUnlimited } from "@/hooks/useTier";

export default function PlanIncludedPage() {
  const router = useRouter();
  const { tier, limits, loading } = useTier();
  const [opening, setOpening] = useState(false);

  // An unpaid account has no plan to show: send it to the plans.
  useEffect(() => { if (!loading && tier === "free") router.replace("/pricing"); }, [loading, tier, router]);

  const billing = async () => {
    setOpening(true);
    try {
      const res = await fetch("/api/customer-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
    } catch { /* fall through */ }
    setOpening(false);
  };

  if (loading || tier === "free") {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10"><div className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] min-h-[520px] animate-pulse" /></div>;
  }

  const items: { title: string; detail: string }[] = [
    { title: "Your daily schedule", detail: "One task a day, built for your subjects, your goal grade and your exam date." },
    { title: "A grade check every week", detail: "So the plan always knows where you really are." },
    { title: "Review lessons", detail: "Short lessons built from the questions you got wrong." },
    { title: isUnlimited(limits.examsPerWeek) ? "Unlimited practice papers" : `${limits.examsPerWeek} practice papers a week`, detail: `Any subject in your exam system, up to ${limits.maxQuestions} questions a paper.` },
    { title: "Mock exams", detail: "Longer timed papers, marked in one go." },
    { title: "Honest marking", detail: "One mark for working, one for the answer. A guess scores zero." },
    { title: "Essay marking", detail: "Longer written answers get a detailed breakdown." },
    { title: `Tutor chat, ${limits.tutorMessagesPerWeek} messages a week`, detail: "Ask about any question you're stuck on." },
    { title: "Pace", detail: "Whether you're on track for your goal grade, updated with every paper." },
    { title: "Streak", detail: "One star a night for every day you finish your task." },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-10 pb-16">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-[14px] min-h-[44px]">← Dashboard</Link>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[13px] font-semibold px-3 py-1 rounded-full border text-yellow-400 bg-yellow-500/10 border-yellow-500/30">Pro</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Your plan</span>
      </div>
      <h1 className={`${display.className} font-bold text-white text-[34px] sm:text-[48px] leading-none tracking-[-0.04em] mt-3`}>Everything&apos;s included.</h1>
      <p className="text-zinc-400 text-[15px] mt-3">There&apos;s one plan and you&apos;re on it. Nothing is locked.</p>

      <ul className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] mt-6 divide-y divide-white/[0.06]">
        {items.map((it) => (
          <li key={it.title} className="flex items-start gap-4 px-5 sm:px-7 py-4">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            <div>
              <p className="text-white font-semibold text-[16px]">{it.title}</p>
              <p className="text-zinc-400 text-[14px] mt-0.5">{it.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <button onClick={billing} disabled={opening} className="mt-5 inline-flex items-center rounded-full border border-white/[0.14] hover:border-white/40 text-white font-semibold text-[15px] px-6 min-h-[52px] transition-colors disabled:opacity-50">
        {opening ? "Opening…" : "Manage billing →"}
      </button>
    </div>
  );
}
