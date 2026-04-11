"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  tagline: string;
  price: number | "free";
  badge?: string;
  highlight?: boolean;
  features: { text: string; included: boolean; bold?: boolean }[];
  cta: string;
  ctaHref: string;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    tagline: "See how it works",
    price: "free",
    features: [
      { text: "2 practice exams per week", included: true },
      { text: "Basic AI marking", included: true },
      { text: "3 AI tutor messages per day", included: true },
      { text: "1 subject at a time", included: true },
      { text: "Maximum 8 questions per exam", included: true },
      { text: "Basic dashboard", included: true },
      { text: "Spaced repetition", included: false },
      { text: "Adaptive difficulty", included: false },
      { text: "All 19 subjects", included: false },
      { text: "Study planner", included: false },
    ],
    cta: "Start free",
    ctaHref: "/subjects",
  },
  {
    name: "Student",
    tagline: "Pass with confidence",
    price: 9.99,
    features: [
      { text: "20 practice exams per week", included: true, bold: true },
      { text: "Full AI marking on every question", included: true },
      { text: "50 AI tutor messages per day", included: true },
      { text: "All 19 subjects", included: true },
      { text: "Up to 12 questions per exam", included: true },
      { text: "Spaced repetition review", included: true },
      { text: "Full dashboard with analytics", included: true },
      { text: "Adaptive difficulty", included: false },
      { text: "Personal study planner", included: false },
      { text: "Deep English essay marking", included: false },
    ],
    cta: "Get Student",
    ctaHref: "/subjects",
  },
  {
    name: "Pro",
    tagline: "Built to chase Excellence",
    price: 19.99,
    badge: "Best value",
    highlight: true,
    features: [
      { text: "UNLIMITED practice exams", included: true, bold: true },
      { text: "UNLIMITED AI tutor chat", included: true, bold: true },
      { text: "Up to 20 questions (full mock exams)", included: true, bold: true },
      { text: "Adaptive difficulty (auto-tuned to you)", included: true },
      { text: "Personal study planner (week by week)", included: true },
      { text: "Deep English essay marking (4-pass)", included: true },
      { text: "Mock exam mode (timed, fullscreen)", included: true },
      { text: "Priority generation (3× faster)", included: true },
      { text: "Email exam date reminders", included: true },
      { text: "30-day money back guarantee", included: true },
    ],
    cta: "Get Pro",
    ctaHref: "/subjects",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  function getPrice(p: Plan): { display: string; sub?: string } {
    if (p.price === "free") return { display: "Free", sub: "Forever" };
    if (billing === "yearly") {
      const annual = Math.round(p.price * 12 * 0.7 * 100) / 100; // 30% off
      const perMonth = Math.round((annual / 12) * 100) / 100;
      return { display: `$${perMonth.toFixed(2)}`, sub: `per month, billed yearly ($${annual.toFixed(0)}/yr)` };
    }
    return { display: `$${p.price.toFixed(2)}`, sub: "per month" };
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <section className="max-w-4xl mx-auto px-5 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Cancel anytime · No hidden fees
        </div>
        <h1 className="text-[42px] sm:text-[56px] font-bold text-white tracking-tight leading-[1.05] mb-5">
          Simple pricing.
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Real results.
          </span>
        </h1>
        <p className="text-zinc-400 text-[16px] sm:text-[18px] leading-relaxed max-w-xl mx-auto mb-10">
          Cheaper than one tutoring session. More effective than any textbook.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
              billing === "monthly" ? "bg-white text-[#0a0a0f]" : "text-zinc-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
              billing === "yearly" ? "bg-white text-[#0a0a0f]" : "text-zinc-400 hover:text-white"
            }`}
          >
            Yearly
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              billing === "yearly" ? "bg-emerald-500/20 text-emerald-700" : "bg-emerald-500/15 text-emerald-400"
            }`}>
              Save 30%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const price = getPrice(plan);
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-b from-indigo-500/15 to-purple-500/5 border border-indigo-500/40 shadow-2xl shadow-indigo-500/10"
                    : "bg-white/[0.02] border border-white/[0.08]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name + tagline */}
                <div className="mb-5">
                  <h3 className="text-white font-bold text-[20px]">{plan.name}</h3>
                  <p className="text-zinc-500 text-[13px] mt-1">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "free" && (
                      <span className="text-zinc-400 text-[18px] font-medium">$</span>
                    )}
                    <span className={`font-bold text-white tabular-nums ${plan.price === "free" ? "text-[36px]" : "text-[42px]"}`}>
                      {plan.price === "free" ? "Free" : price.display.replace("$", "")}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[12px] mt-0.5">{price.sub} NZD</p>
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`block w-full text-center py-3 rounded-lg font-semibold text-[14px] mb-7 transition-all ${
                    plan.highlight
                      ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                      : plan.price === "free"
                      ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1]"
                      : "bg-white text-[#0a0a0f] hover:bg-zinc-100"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px]">
                      {f.included ? (
                        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span
                        className={`leading-relaxed ${
                          f.included
                            ? f.bold
                              ? "text-white font-medium"
                              : "text-zinc-300"
                            : "text-zinc-600 line-through"
                        }`}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison stats */}
      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-8">
          <h2 className="text-[24px] font-bold text-white text-center mb-2">Compare the cost</h2>
          <p className="text-zinc-500 text-[13px] text-center mb-8">A month of Study Ace vs. the alternatives</p>

          <div className="space-y-3">
            <CompareRow label="One private tutoring session (1 hour)" cost="$60–$80" />
            <CompareRow label="Workbook from Whitcoulls" cost="$25–$40" />
            <CompareRow label="Study Ace Pro for a whole month" cost="$19.99" highlight />
            <CompareRow label="Failing an exam and retaking it next year" cost="A whole year" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pb-24">
        <h2 className="text-[28px] font-bold text-white text-center mb-10">Common questions</h2>
        <div className="space-y-3">
          <Faq
            q="Will this actually help me pass?"
            a="Yes — practising real exam-style questions is the single most effective way to improve marks. Study Ace gives you unlimited practice with instant feedback, AI tutoring when you're stuck, and spaced repetition so you actually remember what you learn."
          />
          <Faq
            q="Can I cancel anytime?"
            a="Yes. Cancel any time from your dashboard. You'll keep access until the end of your billing period. No phone calls, no awkward emails."
          />
          <Faq
            q="What if it doesn't work for me?"
            a="Pro comes with a 30-day money back guarantee. If you've practised consistently and don't feel more confident, we'll refund you in full."
          />
          <Faq
            q="Is my progress saved?"
            a="Yes. Your dashboard tracks every exam you take, every topic you've practised, and how you've improved over time. Free users get basic tracking, paid users get full analytics."
          />
          <Faq
            q="Do you have a student discount?"
            a="Pricing is already set for NZ students — we already give the cheapest option in the country. Yearly billing saves you another 30% on top."
          />
          <Faq
            q="What subjects are covered?"
            a="All 19 main NCEA subjects across Years 10–13: Maths, Statistics, English, Te Reo Māori, Biology, Chemistry, Physics, Science, Economics, Accounting, Geography, History, Health, Social Studies, Digital Tech, Media Studies, Classical Studies, Art History, and Business Studies."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/[0.08] p-10 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/20 blur-[100px] rounded-full" />
          <div className="relative">
            <h2 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-4">
              Try it free first
            </h2>
            <p className="text-zinc-400 text-[15px] mb-8 max-w-md mx-auto">
              Build your first practice exam in 30 seconds. No credit card required.
            </p>
            <Link
              href="/subjects"
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-semibold px-8 py-3.5 rounded-lg hover:bg-zinc-100 transition-all hover:scale-[1.02] shadow-2xl text-[15px]"
            >
              Start practising
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CompareRow({ label, cost, highlight }: { label: string; cost: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg ${
        highlight
          ? "bg-indigo-500/15 border border-indigo-500/30"
          : "bg-white/[0.02] border border-white/[0.06]"
      }`}
    >
      <span className={`text-[14px] ${highlight ? "text-white font-semibold" : "text-zinc-300"}`}>{label}</span>
      <span className={`text-[14px] tabular-nums ${highlight ? "text-indigo-300 font-bold" : "text-zinc-500"}`}>
        {cost}
      </span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
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
