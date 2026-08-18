"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import HeroVideo from "@/components/HeroVideo";
import ScrollZoomComputer from "@/components/ScrollZoomComputer";
import { loadProgress } from "@/lib/storage";
import { gradeLabel } from "@/lib/scoring";
import type { StudentProgress } from "@/lib/types";

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
      {/* Ambient animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <HeroVideo />
        {/* Desktop only: these 120–140px blur blobs re-rasterise every scroll
            frame on a phone (they aren't on cached GPU layers once static), which
            was the main mobile scroll cost. On mobile the hero video poster
            already supplies the ambient violet glow. */}
        <div className="hidden sm:block absolute -top-[200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-indigo-600/20 blur-[140px] rounded-full animate-blob-a" />
        <div className="hidden sm:block absolute top-[400px] -right-[200px] w-[600px] h-[600px] bg-purple-600/15 blur-[130px] rounded-full animate-blob-b" />
        <div className="hidden sm:block absolute top-[800px] -left-[200px] w-[500px] h-[500px] bg-pink-500/10 blur-[120px] rounded-full animate-blob-c" />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="max-w-5xl mx-auto px-5 pt-10 sm:pt-24 pb-12 sm:pb-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] sm:text-[12px] text-zinc-400 mb-6 sm:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            Stop studying. Start training.
          </div>

          {/* Headline */}
          <h1 className="text-[36px] sm:text-[56px] md:text-[72px] font-extrabold text-white tracking-tight leading-[1.05] mb-5 sm:mb-7">
            Hours of notes won&apos;t
            <br className="hidden sm:block" /> raise your grade.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              20 minutes a day will.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-zinc-400 text-[15px] sm:text-[18px] md:text-[20px] leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10">
            Rereading and copying notes feel productive — psychologists call it the illusion of mastery. What actually moves grades is sitting real exam-style questions and getting marked honestly. StudyAce turns that into a 20-minute daily habit, in your exam system&apos;s exact style.
          </p>

          {/* CTAs — gated on isLoaded so signed-in users never flash the guest
              buttons (same rule as tier flicker; min-h reserves the space). */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 min-h-[56px]">
            {isLoaded && (isSignedIn ? (
              <>
                <Link
                  href="/subjects"
                  className="group bg-white text-[#0a0a0f] font-bold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] shadow-2xl shadow-white/10 text-[16px] inline-flex items-center justify-center gap-2"
                >
                  Build my exam
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/dashboard"
                  className="text-zinc-300 hover:text-white font-semibold px-8 py-4 rounded-xl border border-white/[0.1] hover:border-white/[0.25] hover:bg-white/[0.03] transition-all text-[16px]"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                {/* Cold traffic (TikTok) converts through the Grade Detector,
                    not a generic signup — /grade diagnoses, then sells the fix. */}
                <Link
                  href="/grade"
                  className="group bg-white text-[#0a0a0f] font-bold px-8 py-4 rounded-xl transition-all hover:scale-[1.02] shadow-2xl shadow-white/10 text-[16px] inline-flex items-center justify-center gap-2"
                >
                  See what you&apos;d score today
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="text-zinc-300 hover:text-white font-semibold px-8 py-4 rounded-xl border border-white/[0.1] hover:border-white/[0.25] hover:bg-white/[0.03] transition-all text-[16px]"
                >
                  See pricing
                </Link>
              </>
            ))}
          </div>

          {isLoaded && !isSignedIn && (
            <p className="text-[13px] text-zinc-500 mb-8 -mt-3">
              🎯 Free · no account · 8 questions · your exact exam system
            </p>
          )}

        </div>
      </section>

      {/* ═══ SCROLL-ZOOM COMPUTER ═══ */}
      <ScrollZoomComputer />

      {/* ═══ RETURNING USER ═══ */}
      {hasHistory && progress && (
        <section className="max-w-lg mx-auto px-5 pb-12">
          <Link href="/dashboard" className="block rounded-2xl bg-gradient-to-r from-indigo-500/[0.1] to-purple-500/[0.06] border border-indigo-500/20 p-5 hover:border-indigo-500/40 transition-all">
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

      {/* ═══ LIVE DEMO PREVIEW (guests only) ═══ */}
      {isLoaded && !isSignedIn && (
      <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-16 sm:pb-24">
        {/* Phone-style mockup */}
        <div className="relative mx-auto max-w-sm sm:max-w-lg">
          {/* Glow behind the card */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-purple-500/10 blur-[60px] rounded-full scale-90" />

          <div className="relative rounded-3xl bg-[#0c0c14] border border-white/[0.08] overflow-hidden shadow-2xl shadow-indigo-500/10">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider">StudyAce Marking</span>
              <span className="text-[10px] text-zinc-600">Science</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Question */}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 font-medium">Question</p>
                <p className="text-zinc-200 text-[14px] leading-relaxed">
                  Explain why photosynthesis is important for life on Earth.
                </p>
              </div>

              {/* Student answer */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 font-medium">Your answer</p>
                <p className="text-zinc-300 text-[13px] leading-relaxed">
                  Plants make oxygen and food from sunlight which animals need to survive.
                </p>
              </div>

              {/* AI result */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.1] to-emerald-500/[0.03] border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-emerald-400 text-[13px] font-bold">1/2 — answer ✓, working ✗</span>
                </div>
                <p className="text-zinc-300 text-[12px] leading-relaxed">
                  The answer mark is yours — oxygen and food from sunlight is right. The working mark isn&apos;t: name the reactants (CO₂ and water) and that light energy drives the reaction.
                </p>
              </div>

              {/* Exam tip */}
              <div className="flex items-start gap-2.5 px-1">
                <span className="text-amber-400 text-[14px] mt-0.5">💡</span>
                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  <span className="text-zinc-400 font-medium">Exam tip:</span> Always include the equation when explaining photosynthesis — it&apos;s an easy mark.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-zinc-600 text-[12px] mt-6">
          This is what training looks like. Every answer, marked in seconds, with exactly what&apos;s missing.
        </p>
      </section>
      )}

      {/* ═══ FEATURES ═══ */}
      <section className="max-w-5xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-[24px] sm:text-[40px] font-extrabold text-white tracking-tight mb-3">
            Built like a training system, not a textbook.
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px]">
            Because the exam isn&apos;t a textbook test. It&apos;s a performance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[
            { emoji: "⚡", title: "Unlimited reps", desc: "Pick any subject and topic. A fresh paper in your exam's style, in seconds. Twenty minutes, done — again tomorrow with new questions." },
            { emoji: "🎯", title: "Real marks, real feedback", desc: "Not “right or wrong.” You get marks, specific feedback on what was missing, and a worked solution — so you know exactly what to fix next rep." },
            { emoji: "💬", title: "A coach, not a cheat sheet", desc: "Stuck? Get Socratic hints that walk you to the answer. You learn the move, not just the result." },
            { emoji: "📈", title: "Difficulty that tracks you", desc: "Strong topics get harder. Weak ones get focused. You’re always training at the edge of your ability." },
            { emoji: "🔄", title: "Mistakes come back", desc: "Every wrong answer returns at spaced intervals until you actually know it. No more “I knew this last week.”" },
            { emoji: "📅", title: "Train for exam day", desc: "Enter your exam date. Get a week-by-week plan that peaks you at exactly the right moment." },
          ].map((f, i) => (
            <div key={i} className="p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group">
              <span className="text-[24px] sm:text-[28px] block mb-3 sm:mb-4">{f.emoji}</span>
              <h3 className="text-white font-bold text-[15px] sm:text-[16px] mb-1.5 sm:mb-2">{f.title}</h3>
              <p className="text-zinc-500 text-[13px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-4xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-[24px] sm:text-[40px] font-extrabold text-white tracking-tight mb-3">
            How you actually get good.
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px]">
            Same way any athlete does.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-8">
          {[
            { n: "01", title: "See the patterns", desc: "Every exam board repeats the same question types. We’ve mapped yours." },
            { n: "02", title: "Train the reps", desc: "Do them until they’re automatic. Marked in seconds, every time." },
            { n: "03", title: "Walk in ready", desc: "Exam day is just another rep. You’ve already done it 50 times." },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-[14px] sm:text-[18px] mb-3 sm:mb-5 shadow-lg shadow-indigo-500/30">
                {s.n}
              </div>
              <h3 className="text-white font-bold text-[15px] sm:text-[18px] mb-1">{s.title}</h3>
              <p className="text-zinc-500 text-[11px] sm:text-[14px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ EXAM SYSTEMS ═══ */}
      <section className="max-w-4xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-[24px] sm:text-[36px] font-extrabold text-white tracking-tight mb-3">
            Your exam system. Your grades. Your format.
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px]">
            Questions, difficulty and grading in your system&apos;s own language — not generic quizzes.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "🇳🇿 NCEA", "🇦🇺 HSC", "🇦🇺 QCE", "🇦🇺 VCE", "🇦🇺 WACE", "🇦🇺 SACE",
            "🏴󠁧󠁢󠁥󠁮󠁧󠁿 GCSE", "🏴󠁧󠁢󠁥󠁮󠁧󠁿 A-Levels", "🏴󠁧󠁢󠁳󠁣󠁴󠁿 SQA Highers",
            "🇺🇸 AP · SAT · ACT", "🇺🇸 NY Regents", "🇺🇸 Texas STAAR", "🇺🇸 Florida EOC",
            "🇨🇦 Ontario", "🇨🇦 Alberta", "🇨🇦 BC"
          ].map((s) => (
            <span key={s} className="text-[13px] px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] transition-all cursor-default">
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

      {/* ═══ WHY THIS WORKS ═══ */}
      <section className="max-w-2xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="text-center">
          <h2 className="text-[24px] sm:text-[40px] font-extrabold text-white tracking-tight mb-8 sm:mb-10 leading-tight">
            Why this works when textbooks don&apos;t.
          </h2>
          <div className="space-y-5 sm:space-y-6 text-zinc-300 text-[15px] sm:text-[18px] leading-relaxed">
            <p>
              Textbooks teach you a subject. The exam tests whether you can perform under pressure, in a specific format, against a clock.
            </p>
            <p className="text-white font-semibold">
              Those are two different skills.
            </p>
            <p>
              Reading about swimming doesn&apos;t make you a swimmer. Rereading your notes doesn&apos;t make you good at exams. Reps do.
            </p>
            <p>
              It&apos;s called{" "}
              <Link href="/blog/the-testing-effect-practice-beats-rereading" className="text-indigo-400 font-semibold hover:underline">
                the testing effect
              </Link>{" "}
              — one of the most replicated findings in learning science. Twenty focused minutes of answering real questions beats hours of passive review.
            </p>
            <p className="text-white font-bold text-[18px] sm:text-[22px] pt-2">
              StudyAce is reps.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="max-w-3xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-pink-600/10" />
          <div className="absolute inset-0 bg-[#06060a]/60" />

          <div className="relative p-8 sm:p-16 text-center">
            <h2 className="text-[24px] sm:text-[44px] font-extrabold text-white tracking-tight mb-3 sm:mb-5 leading-tight">
              Exam day is coming.
              <br />
              <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">Be the kid who trained.</span>
            </h2>
            <p className="text-zinc-400 text-[14px] sm:text-[16px] mb-8 max-w-md mx-auto">
              Free to start. No credit card. 30 seconds to your first practice exam.
            </p>
            <div className="min-h-[56px]">
              {isLoaded && (
                <Link
                  href={isSignedIn ? "/subjects" : "/grade"}
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-bold px-10 py-4 rounded-xl hover:scale-[1.02] transition-all shadow-2xl text-[16px]"
                >
                  {isSignedIn ? "Build my exam" : "See what you'd score today"}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              )}
            </div>
            <p className="text-zinc-600 text-[11px] mt-5">
              NCEA &middot; HSC &middot; GCSE &middot; AP &middot; + 12 more exam systems
            </p>
          </div>
        </div>
      </section>

      {/* ═══ GLOBAL STRIP ═══ */}
      {/* AU is already ~half our traffic — point overseas visitors straight at
          their exam system instead of letting them bounce. */}
      <section className="border-t border-white/[0.06] py-6">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <Link
            href="/global"
            className="inline-flex flex-wrap items-center justify-center gap-2 text-[13px] text-zinc-400 hover:text-white transition-colors"
          >
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
                <Link href="/redeem" className="hover:text-zinc-400 transition-colors">Redeem code</Link>
                <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
                <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              </>
            ) : (
              <>
                <Link href="/grade" className="hover:text-zinc-400 transition-colors">Grade check</Link>
                <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
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
