"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { loadProgress } from "@/lib/storage";
import { gradeLabel } from "@/lib/scoring";
import type { StudentProgress } from "@/lib/types";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(loadProgress());
    }
  }, [isSignedIn]);

  const hasHistory = isSignedIn && progress && progress.totalExamsTaken > 0;

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
        <div className="absolute top-[300px] right-0 w-[400px] h-[400px] bg-purple-500/[0.06] blur-[100px] rounded-full" />
      </div>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-5 pt-8 sm:pt-20 pb-10 sm:pb-24 text-center">
        {/* Pre-headline badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-5 sm:mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built for NZ NCEA students &middot; Free to start
        </div>

        {/* Headline */}
        <h1 className="text-[28px] sm:text-[48px] md:text-[56px] font-bold text-white tracking-tight leading-[1.1] sm:leading-[1.05] mb-4 sm:mb-6">
          Practise smarter.
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Pass with confidence.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-zinc-400 text-[13px] sm:text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto mb-6 sm:mb-10 px-1">
          Unlimited NCEA practice exams, generated and marked instantly by AI.
          Built for NZ students from Year 10 to Year 13.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 sm:mb-12">
          {isSignedIn ? (
            <>
              <Link
                href="/subjects"
                className="group bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3.5 rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 text-[15px] inline-flex items-center justify-center gap-2"
              >
                Build my exam
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/dashboard"
                className="text-zinc-300 hover:text-white font-medium px-8 py-3.5 rounded-lg border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.02] transition-all text-[15px]"
              >
                See my progress
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/demo"
                className="group bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3.5 rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 text-[15px] inline-flex items-center justify-center gap-2"
              >
                Try it free — no sign-up
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/pricing"
                className="text-zinc-300 hover:text-white font-medium px-8 py-3.5 rounded-lg border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.02] transition-all text-[15px]"
              >
                See pricing
              </Link>
            </>
          )}
        </div>

        {/* Stats row — hidden on mobile to reduce scroll */}
        <div className="hidden sm:flex flex-wrap justify-center gap-x-8 gap-y-3 text-[12px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">Unlimited</span> practice exams
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">19</span> subjects
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">Years 10–13</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">AI marking</span>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-5 sm:mt-8 flex items-center justify-center gap-2">
          <div className="flex -space-x-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-[#0a0a0f] flex items-center justify-center text-[10px] text-white font-bold">
                {["R", "M", "J", "S"][i]}
              </div>
            ))}
          </div>
          <p className="text-zinc-500 text-[12px]">
            Built by students, for students
          </p>
        </div>
      </section>

      {/* RETURNING USER STATS */}
      {hasHistory && (
        <section className="max-w-2xl mx-auto px-5 -mt-8 mb-20">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.04] border border-indigo-500/20 p-1">
            <div className="bg-[#0a0a0f]/60 rounded-[14px] p-5 backdrop-blur-sm">
              <p className="text-[11px] text-indigo-300/70 mb-3 uppercase tracking-wider font-medium">Welcome back</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{progress.totalExamsTaken}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">exams done</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{progress.streakDays}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">day streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {progress.examAttempts.length > 0
                      ? gradeLabel(progress.examAttempts[progress.examAttempts.length - 1].overallGrade)
                      : "—"}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">last grade</div>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="mt-4 block w-full text-center text-[13px] text-indigo-300 hover:text-indigo-200 font-medium py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 transition-colors"
              >
                Go to dashboard →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT SHOWCASE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 pb-12 sm:pb-16">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Example marked answer */}
            <div>
              <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-3">AI marking in action</p>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                <div>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">Question</p>
                  <p className="text-zinc-300 text-[13px]">Explain why photosynthesis is important for life on Earth.</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1">Student&apos;s answer</p>
                  <p className="text-zinc-300 text-[13px]">Plants make oxygen and food from sunlight which animals need to survive.</p>
                </div>
                <div className="rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-400 text-[12px] font-semibold">2/3 marks — Achieved</span>
                  </div>
                  <p className="text-zinc-300 text-[12px] leading-relaxed">Good start! You correctly identified that plants produce oxygen and food. To get full marks, mention the specific reactants (CO₂ and water) and that sunlight energy drives the process.</p>
                </div>
              </div>
            </div>
            {/* Features list */}
            <div>
              <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-3">What you get</p>
              <div className="space-y-3">
                {[
                  { icon: "✓", text: "Marks and feedback on every answer in seconds" },
                  { icon: "✓", text: "Worked solutions showing the correct approach" },
                  { icon: "✓", text: "Exam tips specific to each question" },
                  { icon: "✓", text: "AI tutor to help when you're stuck" },
                  { icon: "✓", text: "Tracks your weak topics automatically" },
                  { icon: "✓", text: "Spaced review so you don't forget" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-emerald-400 text-[14px] font-bold shrink-0 mt-0.5">{item.icon}</span>
                    <span className="text-zinc-300 text-[14px]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID — desktop only, mobile gets the checklist above */}
      <section className="hidden sm:block max-w-5xl mx-auto px-5 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-[36px] md:text-[40px] font-bold text-white tracking-tight mb-3">
            Everything you need to ace it
          </h2>
          <p className="text-zinc-500 text-[15px] max-w-lg mx-auto">
            Real exam questions. Instant AI marking. Personalised study plans.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>}
            title="Unlimited practice exams"
            desc="Pick a subject and topic, AI builds you a fresh NCEA-style paper in seconds."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>}
            title="Instant AI marking"
            desc="Get marks, feedback, and worked solutions in seconds — not days."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>}
            title="AI tutor"
            desc="Stuck? Get hints that guide you to the answer instead of giving it away."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
            title="Adaptive difficulty"
            desc="Questions adjust to your level as you improve."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>}
            title="Spaced repetition"
            desc="Wrong answers come back until you master them."
          />
          <FeatureCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>}
            title="Study planner"
            desc="Week-by-week plan focused on your weakest topics."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 pb-16 sm:pb-24">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-2 sm:mb-3">How it works</p>
          <h2 className="text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-tight">
            Three steps. That&apos;s it.
          </h2>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 sm:gap-6">
          <Step
            number="01"
            title="Pick a paper"
            desc="Choose a subject and year level. Or generate a custom paper on any topic in seconds."
          />
          <Step
            number="02"
            title="Practise"
            desc="Answer real exam-style questions. Show your working, type your final answer."
          />
          <Step
            number="03"
            title="Learn"
            desc="Get marked instantly. See exactly what you got wrong and why, with worked solutions."
          />
        </div>
      </section>

      {/* SUBJECTS GRID — hidden on mobile */}
      <section className="hidden sm:block max-w-4xl mx-auto px-5 pb-24">
        <div className="text-center mb-6 sm:mb-10">
          <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-2 sm:mb-3">19 subjects covered</p>
          <h2 className="text-[20px] sm:text-[32px] md:text-[36px] font-bold text-white tracking-tight">
            Whatever you&apos;re sitting, we&apos;ve got it
          </h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Mathematics", "English", "Statistics", "Biology", "Chemistry", "Physics",
            "Science", "Economics", "Accounting", "Geography", "History", "Te Reo Māori",
            "Health", "Social Studies", "Digital Tech", "Media Studies", "Classical Studies",
            "Art History", "Business Studies"
          ].map((s) => (
            <span
              key={s}
              className="text-[12px] px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* EMAIL CAPTURE */}
      {!isSignedIn && (
        <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-10 sm:pb-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] to-purple-500/[0.04] border border-indigo-500/15 p-5 sm:p-8 text-center">
            <h2 className="text-[18px] sm:text-[24px] font-bold text-white tracking-tight mb-2">
              Not ready to sign up yet?
            </h2>
            <p className="text-zinc-400 text-[13px] sm:text-[14px] mb-4 sm:mb-5 max-w-md mx-auto">
              Get free exam tips straight to your inbox.
            </p>
            {emailSent ? (
              <p className="text-emerald-400 text-[14px] font-medium">You&apos;re in! Check your inbox.</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email.trim()) return;
                  await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: "Email subscriber", email: email.trim(), type: "subscribe", message: "Subscribed from homepage" }),
                  }).catch(() => {});
                  setEmailSent(true);
                }}
                className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@school.nz"
                  required
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-lg transition-all text-[14px] whitespace-nowrap"
                >
                  Get tips
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-16 sm:pb-24">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/[0.08] p-7 sm:p-14 text-center relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/20 blur-[100px] rounded-full" />

          <div className="relative">
            <h2 className="text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-tight mb-3 sm:mb-4">
              Your next exam is coming.
              <br />
              Be ready.
            </h2>
            <p className="text-zinc-400 text-[13px] sm:text-[15px] mb-6 sm:mb-8 max-w-md mx-auto">
              Join the students using StudyAce to practise smarter, not harder.
            </p>
            <Link
              href={isSignedIn ? "/subjects" : "/sign-up"}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-semibold px-8 py-3.5 rounded-lg hover:bg-zinc-100 transition-all hover:scale-[1.02] shadow-2xl text-[15px]"
            >
              {isSignedIn ? "Build my exam" : "Start practising free"}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <p className="text-[11px] text-zinc-600 mt-5">
              Free tier available &middot; No credit card required &middot; Made in NZ
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-4xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-600">
          <div>
            study<span className="text-indigo-400">ace</span> &middot; Built for NZ NCEA students
          </div>
          <div className="flex gap-5">
            {isSignedIn ? (
              <>
                <Link href="/subjects" className="hover:text-zinc-400 transition-colors">Exams</Link>
                <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
                <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact</Link>
                <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
              </>
            ) : (
              <>
                <Link href="/pricing" className="hover:text-zinc-400 transition-colors">Pricing</Link>
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

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-4 group-hover:bg-indigo-500/15 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-[15px] mb-1.5">{title}</h3>
      <p className="text-zinc-500 text-[13px] leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-[12px] sm:text-[14px] mb-3 sm:mb-4 shadow-lg shadow-indigo-500/20">
        {number}
      </div>
      <h3 className="text-white font-semibold text-[14px] sm:text-[17px] mb-1 sm:mb-2">{title}</h3>
      <p className="text-zinc-500 text-[11px] sm:text-[13px] leading-relaxed">{desc}</p>
    </div>
  );
}
