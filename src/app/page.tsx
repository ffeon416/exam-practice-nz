"use client";

// ── Homepage, Soar-style (joinsoar.co studied 2026-08-28) ──
// Their skeleton, our world: news pill → hero with an italic accent word and
// a floating phone duo → goal picker → numbered proactive-vs-passive features
// → honest mono stats → exam-system chips → big CTA → FAQ. All visuals are
// CSS-built StudyAce UI (no borrowed assets), fonts are Bricolage Grotesque
// display over Geist body — the Soar pairing translated to our stack.
// Perf rules hold: CSS keyframes only, no scroll-scrubbed transforms,
// desktop-only blur layers.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bricolage_Grotesque } from "next/font/google";
import { loadProgress } from "@/lib/storage";
import { gradeLabel } from "@/lib/scoring";
import type { StudentProgress } from "@/lib/types";

// Bricolage ships no true italic — the browser synthesizes an oblique for the
// accent words, which suits a grotesque fine.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const FAQS: { q: string; a: string }[] = [
  { q: "Is it actually free?", a: "The grade check is completely free — no account, no card. A free account gets you 2 practice exams a week in Maths and English. The Student plan (NZ$15/month, cancel anytime) unlocks every subject, unlimited exams, and the week-by-week schedule." },
  { q: "Which exams does it cover?", a: "16 exam systems across 5 countries: NCEA, Australia's HSC/QCE/VCE/WACE/SACE, the UK's GCSE, A-Levels and SQA Highers, US AP/SAT/ACT plus state exams, and Canada's Ontario, Alberta and BC systems. Questions, difficulty and grading follow your system's own style." },
  { q: "Is the marking real?", a: "Yes, and it's deliberately honest — no participation marks, no rounding up. Every answer gets marked like an examiner would: a mark for working, a mark for the answer, and specific feedback on what was missing. A hedge answer scores zero, same as on the day." },
  { q: "Do I need an account?", a: "Not for the grade check — you can sit it and see your full marked paper anonymously. You only create an account when you want to keep training, and Google sign-in makes that one tap." },
  { q: "Does it work on my phone?", a: "Yes — StudyAce installs to your home screen like an app (iPhone and Android) and the whole thing is built for 20-minute sessions on a phone." },
  { q: "How is this different from a tutor?", a: "A tutor is great — at NZ$60+ an hour. StudyAce gives you the two things that actually move grades — unlimited exam-style practice and honest marking — for NZ$15 a month, available at 10pm the night you actually feel like studying." },
];

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      setProgress(loadProgress());
    }
  }, [isSignedIn]);

  const hasHistory = isSignedIn && progress && progress.totalExamsTaken > 0;

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StudyAce",
    applicationCategory: "EducationalApplication",
    description:
      "AI-powered exam practice for high-school students. Generates exam-style questions in your exam system's format — NCEA, HSC, QCE, GCSE, A-Levels, AP and more — marks them honestly, and surfaces weak topics.",
    operatingSystem: "Web",
    url: "https://studyace.co",
    offers: { "@type": "Offer", price: "0", priceCurrency: "NZD" },
  };

  return (
    <div className="relative overflow-x-clip bg-[#06060a] isolate">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />

      {/* Ambient ground — Soar's soft radial glow, our indigo */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
        <div className="hidden sm:block absolute top-[900px] -right-[200px] w-[600px] h-[600px] bg-indigo-600/[0.07] blur-[130px] rounded-full" />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="max-w-5xl mx-auto px-5 pt-8 sm:pt-16 pb-10 sm:pb-16">
        <div className="text-center">
          {/* News pill (Soar's banner, our news) */}
          <div className="home-rise mb-7 sm:mb-9">
            <Link href="/grade"
              className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[12px] text-zinc-300 hover:border-indigo-400/50 hover:bg-indigo-500/[0.08] transition-colors">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold tracking-wide">NEW</span>
              Free Grade Check — your real grade in 2 minutes
              <span aria-hidden className="text-indigo-400">→</span>
            </Link>
          </div>

          {/* Headline — display face, italic accent word (Soar signature) */}
          <h1 className={`${display.className} home-rise text-[42px] sm:text-[64px] md:text-[80px] font-bold text-white tracking-[-0.03em] leading-[1.02] mb-5 sm:mb-6`}
            style={{ animationDelay: "80ms", textWrap: "balance" }}>
            Your personal{" "}
            <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent pr-1">
              exam coach
            </em>
          </h1>

          {/* Subhead */}
          <p className="home-rise text-zinc-400 text-[15px] sm:text-[18px] leading-relaxed max-w-xl mx-auto mb-8"
            style={{ animationDelay: "160ms" }}>
            StudyAce learns where you lose marks, then builds, marks and schedules your practice like a tutor would — so 20 minutes a day beats hours of rereading notes.
          </p>

          {/* CTAs — pill buttons, Soar-style */}
          <div className="home-rise flex flex-col sm:flex-row gap-3 justify-center mb-5 min-h-[56px]" style={{ animationDelay: "240ms" }}>
            {isLoaded && (isSignedIn ? (
              <>
                <Link href="/subjects"
                  className="group bg-white text-[#0a0a0f] font-bold px-9 py-4 rounded-full transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20 text-[16px] inline-flex items-center justify-center gap-2">
                  Build my exam
                  <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link href="/dashboard"
                  className="text-zinc-300 hover:text-white font-semibold px-9 py-4 rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[16px]">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/grade"
                  className="group bg-white text-[#0a0a0f] font-bold px-9 py-4 rounded-full transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20 text-[16px] inline-flex items-center justify-center gap-2">
                  Get my real grade — free
                  <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link href="/demo"
                  className="text-zinc-300 hover:text-white font-semibold px-9 py-4 rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[16px]">
                  See how it works
                </Link>
              </>
            ))}
          </div>
          {isLoaded && !isSignedIn && (
            <p className="home-rise text-[12.5px] text-zinc-500" style={{ animationDelay: "300ms" }}>
              No account, no card · then one plan, NZ$15/mo, cancel anytime
            </p>
          )}
        </div>

        {/* ── Floating phone duo — the product, not a promise ── */}
        <div className="home-rise relative mt-12 sm:mt-16 flex justify-center" style={{ animationDelay: "360ms" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[420px] rounded-full pointer-events-none" aria-hidden
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.22) 0%, transparent 70%)" }} />

          <div className="relative flex items-start">
            {/* Phone A — grade reveal */}
            <div className="sa-float relative z-10 w-[218px] sm:w-[248px] -rotate-[7deg] rounded-[40px] border border-white/[0.12] bg-[#0d0d15] p-2 shadow-2xl shadow-black/60">
              <div className="rounded-[32px] overflow-hidden bg-[#08080e] border border-white/[0.05]">
                <div className="flex justify-center pt-2.5 pb-1"><div className="w-16 h-[5px] rounded-full bg-white/[0.1]" /></div>
                <div className="px-4 pb-5 pt-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-0.5">Grade check</p>
                  <p className="text-white text-[12.5px] font-bold mb-3">Mathematics · Year 12</p>
                  <div className="relative w-[104px] h-[104px] mx-auto mb-2.5">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#818cf8" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray="264" strokeDashoffset="63" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-white font-black text-[24px] leading-none">76%</span>
                      <span className="text-zinc-500 text-[9px] mt-0.5">12/16 marks</span>
                    </div>
                  </div>
                  <p className="text-center text-amber-400 font-black text-[20px] mb-2.5">Merit</p>
                  <div className="flex justify-center gap-1.5 mb-3">
                    <span className="px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[8.5px] font-semibold">⚠ Algebra</span>
                    <span className="px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[8.5px] font-semibold">⚠ Probability</span>
                  </div>
                  <div className="rounded-xl bg-indigo-500/[0.09] border border-indigo-500/25 px-3 py-2.5">
                    <p className="text-[9px] text-zinc-400 mb-1">Path to Excellence</p>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone B — the week plan */}
            <div className="sa-float relative w-[218px] sm:w-[248px] rotate-[6deg] -ml-10 sm:-ml-8 mt-10 rounded-[40px] border border-white/[0.12] bg-[#0d0d15] p-2 shadow-2xl shadow-black/60"
              style={{ animationDelay: "1.2s" }}>
              <div className="rounded-[32px] overflow-hidden bg-[#08080e] border border-white/[0.05]">
                <div className="flex justify-center pt-2.5 pb-1"><div className="w-16 h-[5px] rounded-full bg-white/[0.1]" /></div>
                <div className="px-4 pb-5 pt-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-0.5">Your plan · week 1</p>
                  <p className="text-white text-[12.5px] font-bold mb-3">Fix Algebra first</p>
                  <div className="space-y-1.5 mb-3">
                    {[
                      { d: "Mon", t: "20 min · fundamentals", done: true },
                      { d: "Wed", t: "20 min · exam questions", done: true },
                      { d: "Fri", t: "20 min · mixed set", today: true },
                      { d: "Sun", t: "mini-exam · marked", done: false },
                    ].map((r) => (
                      <div key={r.d} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 border ${r.today ? "bg-indigo-500/[0.12] border-indigo-400/40" : "bg-white/[0.02] border-white/[0.06]"}`}>
                        <span className={`w-6 text-[9px] font-black ${r.today ? "text-indigo-300" : "text-zinc-500"}`}>{r.d}</span>
                        <span className={`flex-1 text-[9.5px] ${r.today ? "text-white font-semibold" : "text-zinc-400"}`}>{r.t}</span>
                        <span className="text-[10px]">{r.done ? "✅" : r.today ? "▶️" : "·"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2.5">
                    <span className="text-[9.5px] text-zinc-400">🔥 6-day streak</span>
                    <span className="text-[9.5px] text-emerald-400 font-bold">on track</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Honest mono stats (Soar's "trusted by" slot, our truth) */}
        <div className="home-rise mt-12 sm:mt-14 flex flex-wrap justify-center gap-x-7 gap-y-2 font-mono text-[11px] sm:text-[12px] text-zinc-500 tracking-tight"
          style={{ animationDelay: "440ms" }}>
          <span><span className="text-zinc-200 font-semibold">16</span> exam systems</span>
          <span><span className="text-zinc-200 font-semibold">5</span> countries</span>
          <span>marked in <span className="text-zinc-200 font-semibold">seconds</span></span>
          <span>honest marks, <span className="text-zinc-200 font-semibold">always</span></span>
        </div>
      </section>

      {/* ═══ RETURNING USER ═══ */}
      {hasHistory && progress && (
        <section className="max-w-lg mx-auto px-5 pb-12">
          <Link href="/dashboard" className="block rounded-3xl bg-gradient-to-r from-indigo-500/[0.1] to-violet-500/[0.06] border border-indigo-500/20 p-5 hover:border-indigo-500/40 transition-all">
            <p className="text-[11px] text-indigo-300/70 uppercase tracking-wider font-medium mb-3">Welcome back</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-[22px] font-bold text-white">{progress.totalExamsTaken}</div>
                <div className="text-[10px] text-zinc-500">exams</div>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="text-center">
                <div className="text-[22px] font-bold text-white">{progress.streakDays}</div>
                <div className="text-[10px] text-zinc-500">streak</div>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="text-center">
                <div className="text-[18px] font-bold text-white">
                  {progress.examAttempts.length > 0 ? gradeLabel(progress.examAttempts[progress.examAttempts.length - 1].overallGrade) : "—"}
                </div>
                <div className="text-[10px] text-zinc-500">last grade</div>
              </div>
              <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        </section>
      )}

      {/* ═══ GOAL PICKER (Soar's journey selector) ═══ */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-20 text-center">
        <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
          Watch your grade come to life.
        </h2>
        <p className="text-zinc-500 text-[14px] sm:text-[16px] mb-7">
          Pick your exam. Two minutes later you&apos;re holding your real grade and the plan to raise it.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { label: "🇳🇿 NCEA", href: "/grade" },
            { label: "🇦🇺 HSC / VCE / QCE", href: "/grade" },
            { label: "🇬🇧 GCSE / A-Levels", href: "/grade" },
            { label: "🇺🇸 AP / State exams", href: "/grade" },
            { label: "Find my exam →", href: "/global" },
          ].map((c) => (
            <Link key={c.label} href={c.href}
              className="px-4 py-2.5 rounded-full text-[13px] font-semibold bg-white/[0.03] border border-white/[0.1] text-zinc-300 hover:border-indigo-400/50 hover:bg-indigo-500/[0.08] hover:text-white transition-colors">
              {c.label}
            </Link>
          ))}
        </div>
        {/* Sample mission line — what falls out the other end */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-3.5 text-[13px]">
          <span className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider">sample mission</span>
          <span className="text-zinc-300">Year 12 Mathematics:</span>
          <span className="text-amber-400 font-bold">Merit</span>
          <span className="text-zinc-600" aria-hidden>→</span>
          <span className="text-emerald-400 font-bold">Excellence</span>
          <span className="text-zinc-400">by end of {new Date(Date.now() + 35 * 864e5).toLocaleString("en-NZ", { month: "long" })}</span>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — proactive vs passive (Soar's thesis, ours) ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            Notes wait to be read.
            <br />
            <span className="italic bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">StudyAce trains you.</span>
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px] max-w-lg mx-auto">
            Tell it your exam and it takes over the planning — you just show up for 20 minutes.
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {/* 01 — sit the real thing */}
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div>
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">01</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>Sit the real thing</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                A fresh paper in your exam&apos;s exact style, any subject, any topic, in seconds. Not generic quizzes — your board&apos;s question types, difficulty spread and wording.
              </p>
            </div>
            <div className="rounded-2xl bg-[#0a0a11] border border-white/[0.07] p-4 sm:p-5">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Question 3 · 2 marks</p>
              <p className="text-zinc-200 text-[13.5px] leading-relaxed mb-3">Solve for x: 3x² − 12x = 0</p>
              <div className="space-y-2">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2 text-[12px] text-zinc-500">Working out (1 mark)…</div>
                <div className="rounded-lg bg-white/[0.03] border border-indigo-500/40 px-3 py-2 text-[12px] text-zinc-300">x = 0 and x = 4</div>
              </div>
            </div>
          </div>

          {/* 02 — marked like an examiner */}
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div className="sm:order-2">
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">02</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>Marked like an examiner</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Honest marks in seconds — working and answer scored separately, with exactly what was missing and the full-marks approach. No leniency, because the real exam has none.
              </p>
            </div>
            <div className="sm:order-1 rounded-2xl bg-[#0a0a11] border border-white/[0.07] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[12px] font-black flex items-center justify-center">1/2</span>
                <span className="text-amber-400 text-[12.5px] font-bold">answer ✓ · working ✗</span>
              </div>
              <p className="text-zinc-300 text-[12.5px] leading-relaxed mb-2.5">
                Both roots are right. The working mark isn&apos;t yours yet — show the factorising step: 3x(x − 4) = 0.
              </p>
              <p className="text-indigo-300/90 text-[11.5px]">💡 Factor first, always — it&apos;s the mark examiners give away.</p>
            </div>
          </div>

          {/* 03 — a plan that plans itself */}
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div>
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">03</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>A plan that plans itself</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Your results decide the schedule: weakest topics first, mistakes resurfacing until they stick, difficulty tracking you week by week — peaking exactly at exam day.
              </p>
            </div>
            <div className="rounded-2xl bg-[#0a0a11] border border-white/[0.07] p-4 sm:p-5 space-y-2">
              {[
                { w: "Week 1", t: "Fix Algebra", s: "done", tone: "text-emerald-400" },
                { w: "Week 2", t: "Fix Probability", s: "done", tone: "text-emerald-400" },
                { w: "Week 3", t: "Full paper, timed", s: "today", tone: "text-indigo-300" },
                { w: "Week 4", t: "Exam simulation", s: "ahead", tone: "text-zinc-600" },
              ].map((r) => (
                <div key={r.w} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${r.s === "today" ? "bg-indigo-500/[0.1] border-indigo-400/40" : "bg-white/[0.02] border-white/[0.06]"}`}>
                  <span className="font-mono text-[10px] text-zinc-500 w-12">{r.w}</span>
                  <span className={`flex-1 text-[13px] font-semibold ${r.s === "ahead" ? "text-zinc-500" : "text-white"}`}>{r.t}</span>
                  <span className={`text-[11px] font-bold ${r.tone}`}>{r.s === "done" ? "✓" : r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EXAM SYSTEMS ═══ */}
      <section className="max-w-4xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className={`${display.className} text-[26px] sm:text-[38px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            Your exam system. Your format.
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px]">
            Questions, difficulty and grading in your system&apos;s own language.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "🇳🇿 NCEA", "🇦🇺 HSC", "🇦🇺 QCE", "🇦🇺 VCE", "🇦🇺 WACE", "🇦🇺 SACE",
            "🏴󠁧󠁢󠁥󠁮󠁧󠁿 GCSE", "🏴󠁧󠁢󠁥󠁮󠁧󠁿 A-Levels", "🏴󠁧󠁢󠁳󠁣󠁴󠁿 SQA Highers",
            "🇺🇸 AP · SAT · ACT", "🇺🇸 NY Regents", "🇺🇸 Texas STAAR", "🇺🇸 Florida EOC",
            "🇨🇦 Ontario", "🇨🇦 Alberta", "🇨🇦 BC"
          ].map((s) => (
            <span key={s} className="text-[13px] px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.07] text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] transition-all cursor-default">
              {s}
            </span>
          ))}
        </div>
        <p className="text-center mt-6">
          <Link href="/global" className="text-[13px] text-indigo-400 font-semibold hover:underline">
            Find your exam system →
          </Link>
        </p>
      </section>

      {/* ═══ BIG CTA (Soar, anywhere) ═══ */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-24 text-center">
        <h2 className={`${display.className} text-[34px] sm:text-[56px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-4`} style={{ textWrap: "balance" }}>
          Exam day is coming.
          <br />
          <span className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Be the kid who trained.</span>
        </h2>
        <p className="text-zinc-500 text-[14px] sm:text-[16px] mb-8">
          It starts with one honest number — the grade you&apos;d get today.
        </p>
        <div className="min-h-[56px]">
          {isLoaded && (
            <Link href={isSignedIn ? "/subjects" : "/grade"}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-bold px-10 py-4 rounded-full hover:scale-[1.02] transition-all shadow-2xl shadow-indigo-500/20 text-[16px]">
              {isSignedIn ? "Build my exam" : "Get my real grade — free"}
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <p className="font-mono text-zinc-600 text-[11px] mt-5 tracking-tight">
          free grade check · 2 minutes · no account · then NZ$15/mo, cancel anytime
        </p>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="max-w-2xl mx-auto px-5 pb-16 sm:pb-24">
        <h2 className={`${display.className} text-center text-[26px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-8`}>
          Frequently asked
        </h2>
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/[0.07] bg-white/[0.015] open:border-white/[0.15]">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-[44px]">
                <span className="text-white font-semibold text-[14.5px]">{f.q}</span>
                <span className="text-zinc-500 text-[13px] group-open:rotate-45 transition-transform shrink-0" aria-hidden>＋</span>
              </summary>
              <p className="px-5 pb-4 -mt-1 text-zinc-400 text-[13.5px] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ GLOBAL STRIP ═══ */}
      <section className="border-t border-white/[0.06] py-6">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <Link href="/global"
            className="inline-flex flex-wrap items-center justify-center gap-2 text-[13px] text-zinc-400 hover:text-white transition-colors">
            <span aria-hidden>🇳🇿 🇦🇺 🏴󠁧󠁢󠁥󠁮󠁧󠁿 🇺🇸 🇨🇦</span>
            <span>
              Sitting HSC, GCSE, AP or something else? <span className="font-semibold text-indigo-400">16 exam systems, 5 countries</span> — find yours →
            </span>
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
          <div className="font-medium">
            study<span className="text-indigo-400">ace</span> &middot; Honest practice for every exam system
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
            {isSignedIn ? (
              <>
                <Link href="/subjects" className="hover:text-zinc-400 transition-colors">Exams</Link>
                <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
                <a href="https://discord.gg/3sGUANx7uW" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Discord</a>
                <Link href="/redeem" className="hover:text-zinc-400 transition-colors">Redeem code</Link>
                <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
                <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              </>
            ) : (
              <>
                <Link href="/grade" className="hover:text-zinc-400 transition-colors">Grade check</Link>
                <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
                <a href="https://discord.gg/3sGUANx7uW" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Discord</a>
                <Link href="/redeem" className="hover:text-zinc-400 transition-colors">Redeem code</Link>
                <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
                <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
