"use client";

// ── Homepage, parent-first (rebuilt 2026-09-20 for the ads launch) ──
// The buyer is a parent; the user is their teenager. Every section answers
// the parent's real question — "is this worth it, and will it actually move
// the grade?" — and frames the answer against what they already pay for
// (tutoring, workbooks) and what the grade unlocks (UE, rank score, a first-
// choice course, a working life). Tone stays modern enough that the student
// still wants to use it. House rules: no invented statistics, no fake
// testimonials, no past-paper claims, honest marking front and centre.
// All visuals are CSS-built StudyAce UI (no borrowed assets). Perf rules:
// CSS keyframes only, no scroll-scrubbed transforms, desktop-only blur layers.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { display } from "@/lib/displayFont";
import SiteFooter from "@/components/SiteFooter";
import { loadProgress } from "@/lib/storage";
import { gradeLabel } from "@/lib/scoring";
import { PRO_PRICING, proMonthlyEquivalent } from "@/lib/tierLimits";
import type { StudentProgress } from "@/lib/types";

// Typical NZ private tutoring sits at NZ$60–80/hr; the comparison uses the
// middle of that range and a school year of weekly sessions. Workbooks are
// NZ$25–40 each; five subjects is a normal senior load.
const TUTOR_HOURLY = 70;
const TUTOR_WEEKS = 40;
const TUTOR_YEAR = TUTOR_HOURLY * TUTOR_WEEKS; // 2,800
const WORKBOOKS_YEAR = 5 * 32; // ~160
const STUDYACE_YEAR = PRO_PRICING.yearly.amount; // 149

const FAQS: { q: string; a: string }[] = [
  { q: "Is the marking actually honest, or does it just encourage them?", a: "Honest, deliberately. Every answer is marked the way an examiner marks it: one mark for the working, one for the answer, scored separately, with exactly what was missing. A hedge like \"not sure, maybe 4?\" scores zero, the same as it would on the day. Encouraging in tone, truthful in content. That's the whole point." },
  { q: "Who sets it up, me or my teenager?", a: "Either. Most parents sit the free grade check with their child first (two minutes, no account), then subscribe. The account is in the student's name so their history, weak topics and plan are theirs. You can open the dashboard together any time." },
  { q: "Can it replace a tutor?", a: "For the part that actually moves grades, unlimited exam-style practice with honest marking and a plan, yes, and it's there every night instead of one hour a week. If your child needs a person to re-teach a topic from scratch, a tutor still earns their fee. Many families use both: StudyAce for the reps, a tutor for the sticking points." },
  { q: "Which exams does it cover?", a: "NCEA Levels 1 to 3 plus Year 10, and 15 more systems in beta: Australia's HSC, QCE, VCE, WACE and SACE, the UK's GCSE, A-Levels and SQA Highers, US AP, SAT, ACT and state exams, and Canada's Ontario, Alberta and BC. Questions, difficulty and grading follow the system's own style." },
  { q: "Is it safe for a 13 to 18 year old?", a: "It's built for them. No ads, no selling data, no public profiles, and the tutor chat is a study tool, not a social one. Everything your child types stays in their account. The full privacy policy is written in plain English at studyace.co/privacy." },
  { q: "How much time does it take?", a: "About 20 minutes a day on a phone. A short paper, marked in seconds, and the next step already scheduled. It's designed to fit after dinner, not to replace a whole evening." },
  { q: "What does it cost, and what if they don't use it?", a: `NZ$${PRO_PRICING.monthly.amount} a month, NZ$${PRO_PRICING.quarterly.amount} for three months, or NZ$${PRO_PRICING.yearly.amount} for the whole year. Cancel any time from the dashboard, and there's a 30-day money-back guarantee, so if it doesn't get used, you're not out of pocket.` },
];

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { tier, loading: tierLoading } = useTier();
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  // Door split: a paying student has no business on the sales page.
  useEffect(() => {
    if (isSignedIn && !tierLoading && tier !== "free") router.replace("/dashboard");
  }, [isSignedIn, tier, tierLoading, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    // Deferred so the read happens after mount (same pattern as /pricing).
    const id = setTimeout(() => setProgress(loadProgress()), 0);
    return () => clearTimeout(id);
  }, [isSignedIn]);

  const hasHistory = isSignedIn && progress && progress.totalExamsTaken > 0;

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StudyAce",
    applicationCategory: "EducationalApplication",
    description:
      "Unlimited AI-generated, exam-style practice for high-school students, marked honestly like an examiner, with a week-by-week plan to a target grade. NCEA, HSC, QCE, GCSE, A-Levels, AP and more.",
    operatingSystem: "Web",
    url: "https://studyace.co",
    offers: { "@type": "Offer", price: String(PRO_PRICING.monthly.amount), priceCurrency: "NZD" },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Signed-in here means a lead (paid users are redirected above).
  const primaryHref = isSignedIn ? "/start" : "/grade";
  const primaryLabel = isSignedIn ? "Get Pro" : "Check their grade — free";

  return (
    <div className="relative overflow-x-clip bg-[#06060a] isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Ambient ground */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
        <div className="hidden sm:block absolute top-[1500px] -right-[200px] w-[600px] h-[600px] bg-indigo-600/[0.07] blur-[130px] rounded-full" />
        <div className="hidden sm:block absolute top-[3200px] -left-[200px] w-[600px] h-[600px] bg-violet-600/[0.06] blur-[130px] rounded-full" />
      </div>

      {/* ═══ HERO ═══ */}
      <section className="max-w-5xl mx-auto px-5 pt-8 sm:pt-16 pb-10 sm:pb-14">
        <div className="text-center">
          <div className="home-rise mb-7 sm:mb-9">
            <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[12px] text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              For parents of NCEA, HSC, QCE, GCSE and A-Level students
            </span>
          </div>

          <h1 className={`${display.className} home-rise text-[40px] sm:text-[60px] md:text-[74px] font-bold text-white tracking-[-0.03em] leading-[1.04] mb-5 sm:mb-6`}
            style={{ animationDelay: "80ms", textWrap: "balance" }}>
            Know exactly where your child stands.{" "}
            <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent pr-1">
              Then fix it.
            </em>
          </h1>

          <p className="home-rise text-zinc-400 text-[15px] sm:text-[18px] leading-relaxed max-w-2xl mx-auto mb-8"
            style={{ animationDelay: "160ms" }}>
            StudyAce gives your teenager unlimited exam-style practice, marks it as strictly as an examiner would, and builds a week-by-week plan to their target grade. You see the real number, not a reassuring one.
          </p>

          <div className="home-rise flex flex-col sm:flex-row gap-3 justify-center mb-4 min-h-[56px]" style={{ animationDelay: "240ms" }}>
            {isLoaded && (isSignedIn ? (
              <>
                <Link href="/start"
                  className="group bg-white text-[#0a0a0f] font-bold px-9 py-4 rounded-full transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20 text-[16px] inline-flex items-center justify-center gap-2">
                  Get Pro
                  <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link href="/grade"
                  className="text-zinc-300 hover:text-white font-semibold px-9 py-4 rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[16px]">
                  Free grade check
                </Link>
              </>
            ) : (
              <>
                <Link href="/grade"
                  className="group bg-white text-[#0a0a0f] font-bold px-9 py-4 rounded-full transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20 text-[16px] inline-flex items-center justify-center gap-2">
                  Check their grade — free
                  <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <Link href="/pricing"
                  className="text-zinc-300 hover:text-white font-semibold px-9 py-4 rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[16px]">
                  See pricing
                </Link>
              </>
            ))}
          </div>
          {isLoaded && !isSignedIn && (
            <p className="home-rise text-[12.5px] text-zinc-500" style={{ animationDelay: "300ms" }}>
              2 minutes · no account · no card · then NZ${PRO_PRICING.monthly.amount}/mo or NZ${PRO_PRICING.yearly.amount}/yr, cancel anytime
            </p>
          )}
        </div>

        {/* ── The parent's view: one dashboard card, one marked answer floating over it ── */}
        <div className="home-rise relative mt-12 sm:mt-16" style={{ animationDelay: "360ms" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[420px] rounded-full pointer-events-none" aria-hidden
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)" }} />

          <div className="relative max-w-3xl mx-auto">
            <div className="rounded-[28px] border border-white/[0.12] bg-[#0d0d15] p-2 shadow-2xl shadow-black/60">
              <div className="rounded-[22px] bg-[#08080e] border border-white/[0.05] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <div>
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-0.5">Dashboard · sample</p>
                    <p className="text-white text-[14px] sm:text-[16px] font-bold">Mathematics · NCEA Level 2</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">Target: Excellence by November</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center">
                  {/* Grade ring */}
                  <div className="flex items-center gap-4 sm:block sm:text-center">
                    <div className="relative w-[92px] h-[92px] sm:w-[112px] sm:h-[112px] sm:mx-auto shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#818cf8" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray="264" strokeDashoffset="63" className="sa-ring" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-white font-black text-[22px] sm:text-[26px] leading-none">76%</span>
                        <span className="text-zinc-500 text-[9px] mt-0.5">latest paper</span>
                      </div>
                    </div>
                    <div className="sm:mt-2">
                      <p className="text-amber-400 font-black text-[18px] leading-tight">Merit</p>
                      <p className="text-zinc-500 text-[10.5px]">9 marks off Excellence</p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3.5 py-3">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">6-week trend</p>
                      <p className="text-emerald-400 text-[11px] font-bold">↑ 58% → 76%</p>
                    </div>
                    <svg viewBox="0 0 160 56" className="w-full h-[56px]" aria-hidden>
                      <defs>
                        <linearGradient id="hp-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M4 40 L34 36 L64 30 L94 32 L124 20 L156 12 L156 56 L4 56 Z" fill="url(#hp-fill)" />
                      <polyline points="4,40 34,36 64,30 94,32 124,20 156,12" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {[[4,40],[34,36],[64,30],[94,32],[124,20],[156,12]].map(([x,y]) => (
                        <circle key={x} cx={x} cy={y} r="3" fill="#0b0b12" stroke="#a5b4fc" strokeWidth="2" />
                      ))}
                    </svg>
                    <p className="text-[9.5px] text-zinc-600 mt-1">practice average · one paper a week</p>
                  </div>

                  {/* Weak topics */}
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3.5 py-3">
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Where marks are lost</p>
                    <div className="space-y-1.5">
                      {[
                        { t: "Algebra", pct: 48, tone: "bg-rose-400" },
                        { t: "Probability", pct: 61, tone: "bg-amber-400" },
                        { t: "Graphs", pct: 88, tone: "bg-emerald-400" },
                      ].map((r) => (
                        <div key={r.t} className="flex items-center gap-2">
                          <span className="w-[68px] text-[11px] text-zinc-300">{r.t}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full ${r.tone}`} style={{ width: `${r.pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-[10px] text-zinc-500 tabular-nums">{r.pct}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9.5px] text-indigo-300/90 mt-2">This week&apos;s plan: Algebra first</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] text-zinc-500">
                  <span><span className="text-zinc-300 font-semibold">12</span> papers sat</span>
                  <span><span className="text-zinc-300 font-semibold">6-day</span> streak</span>
                  <span>last marked <span className="text-zinc-300 font-semibold">tonight, 9:40pm</span></span>
                </div>
              </div>
            </div>

            {/* Floating marked answer */}
            <div className="sa-float sm:absolute sm:-right-6 md:-right-14 sm:-bottom-10 mt-4 sm:mt-0 sm:w-[300px] rounded-2xl border border-white/[0.12] bg-[#0d0d15] p-4 shadow-2xl shadow-black/60"
              style={{ animationDelay: "1.1s" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[12px] font-black flex items-center justify-center">1/2</span>
                <span className="text-amber-400 text-[12px] font-bold">answer ✓ · working ✗</span>
              </div>
              <p className="text-zinc-300 text-[12px] leading-relaxed">
                Both roots are right. The working mark isn&apos;t earned yet: show the factorising step, 3x(x − 4) = 0.
              </p>
            </div>
          </div>
        </div>

        <div className="home-rise mt-16 sm:mt-20 flex flex-wrap justify-center gap-x-7 gap-y-2 font-mono text-[11px] sm:text-[12px] text-zinc-500 tracking-tight"
          style={{ animationDelay: "440ms" }}>
          <span>built for <span className="text-zinc-200 font-semibold">20 minutes a night</span></span>
          <span>marked <span className="text-zinc-200 font-semibold">like an examiner</span></span>
          <span><span className="text-zinc-200 font-semibold">cancel</span> anytime</span>
          <span><span className="text-zinc-200 font-semibold">30-day</span> money back</span>
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

      {/* ═══ THE PROBLEM ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            You&apos;re already paying for study.
            <br />
            <span className="italic bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">You&apos;re just not seeing it.</span>
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px] max-w-lg mx-auto">
            Most families spend real money on exam prep and get back one sentence: &ldquo;yeah, it went fine.&rdquo;
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {[
            { k: "The tutor", cost: "NZ$60–80 an hour", body: "One hour a week, if they're available. The feedback lives in a notebook you never see, and the other six nights are unsupervised.", tone: "text-rose-300" },
            { k: "The workbooks", cost: "NZ$25–40 each", body: "Bought in February, half-finished by June. Nobody marks them, so a wrong method gets practised until it's a habit.", tone: "text-amber-300" },
            { k: "The \"studying\"", cost: "Hours, unmeasured", body: "Rereading notes feels productive and barely moves a grade. Sitting questions and getting marked is what does, and it's the part nobody checks.", tone: "text-indigo-300" },
          ].map((c) => (
            <div key={c.k} className="rounded-[28px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-7">
              <p className={`font-mono text-[11px] font-bold uppercase tracking-wider ${c.tone} mb-1.5`}>{c.k}</p>
              <p className={`${display.className} text-white font-bold text-[22px] tracking-[-0.01em] mb-3`}>{c.cost}</p>
              <p className="text-zinc-400 text-[13.5px] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            What your child actually does with it
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px] max-w-lg mx-auto">
            Twenty minutes on a phone, most nights. Here is what those minutes look like.
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div>
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">01</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>They sit a real-style paper</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                A fresh paper in their exam board&apos;s exact style, any subject, any topic, generated in seconds. The same question types, difficulty spread and wording they&apos;ll meet in November, so nothing on the day is a surprise.
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

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div className="sm:order-2">
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">02</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>It&apos;s marked like an examiner would</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Working and answer are scored separately, in seconds, with exactly what was missing and the full-marks approach. No participation marks and no rounding up, because the real exam has neither. If they&apos;d lose the mark in November, they lose it here first, when it costs nothing.
              </p>
            </div>
            <div className="sm:order-1 rounded-2xl bg-[#0a0a11] border border-white/[0.07] p-4 sm:p-5 space-y-3">
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-black flex items-center justify-center">0/2</span>
                  <span className="text-zinc-500 text-[11px] italic">&ldquo;not sure, maybe 4?&rdquo;</span>
                </div>
                <p className="text-rose-200/90 text-[11.5px]">A hedge isn&apos;t an answer. On the day this scores zero, so it scores zero here.</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black flex items-center justify-center">2/2</span>
                  <span className="text-zinc-300 text-[11px]">3x(x − 4) = 0, so x = 0 or x = 4</span>
                </div>
                <p className="text-emerald-200/90 text-[11.5px]">Working ✓ Answer ✓. Factorised first, both roots stated. Full marks.</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
            <div>
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">03</p>
              <h3 className={`${display.className} text-white font-bold text-[20px] sm:text-[26px] mb-2.5 tracking-[-0.01em]`}>The plan builds itself around the gaps</h3>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Their results decide the schedule: weakest topics first, mistakes resurfacing until they stick, difficulty rising week by week and peaking at exam day. Nobody has to nag about what to study tonight. It&apos;s already on the screen.
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

      {/* ═══ THE MATHS ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-10">
          <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
            <div className="md:col-span-2">
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">The maths, for parents</p>
              <h2 className={`${display.className} text-[26px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-3 leading-[1.1]`} style={{ textWrap: "balance" }}>
                A year of practice for less than three hours of tutoring.
              </h2>
              <p className="text-zinc-400 text-[14px] leading-relaxed mb-4">
                A tutor at NZ${TUTOR_HOURLY} an hour, once a week through the school year, is about NZ${TUTOR_YEAR.toLocaleString("en-NZ")}. Workbooks for five subjects are another NZ${WORKBOOKS_YEAR} or so, unmarked. StudyAce for the whole year is NZ${STUDYACE_YEAR}, every night, every subject, every answer marked.
              </p>
              <p className="text-zinc-500 text-[12.5px] leading-relaxed">
                It doesn&apos;t replace a good tutor for re-teaching a topic from scratch. It does replace the expensive part: the practice, the marking, and knowing what to do next.
              </p>
            </div>
            <div className="md:col-span-3 space-y-3">
              {[
                { label: "Weekly private tutor, one school year", note: `${TUTOR_WEEKS} weeks × NZ$${TUTOR_HOURLY}/hr`, amount: TUTOR_YEAR, tone: "from-rose-500/70 to-rose-400/40" },
                { label: "Workbooks, five subjects", note: "typical NZ$25–40 each, unmarked", amount: WORKBOOKS_YEAR, tone: "from-amber-500/70 to-amber-400/40" },
                { label: "StudyAce, the whole year", note: `≈ NZ$${proMonthlyEquivalent("yearly").toFixed(2)} a month · every subject · marked`, amount: STUDYACE_YEAR, tone: "from-indigo-400 to-violet-400", highlight: true },
              ].map((r) => {
                const pct = Math.max(4, Math.round((r.amount / TUTOR_YEAR) * 100));
                return (
                  <div key={r.label} className={`rounded-2xl border px-4 py-3.5 ${r.highlight ? "border-indigo-400/40 bg-indigo-500/[0.08]" : "border-white/[0.07] bg-[#0a0a11]"}`}>
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className={`text-[13.5px] font-semibold truncate ${r.highlight ? "text-white" : "text-zinc-200"}`}>{r.label}</p>
                        <p className="text-[11px] text-zinc-500">{r.note}</p>
                      </div>
                      <p className={`${display.className} shrink-0 font-bold tabular-nums text-[20px] sm:text-[24px] ${r.highlight ? "text-indigo-200" : "text-zinc-300"}`}>
                        NZ${r.amount.toLocaleString("en-NZ")}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${r.tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10.5px] text-zinc-600 pt-1">Tutoring and workbook figures are typical rates in NZD, shown for comparison. Your local prices will vary.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY THE GRADE MATTERS ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            The grade isn&apos;t the end result.
            <br />
            <span className="italic bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">What it unlocks is.</span>
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px] max-w-xl mx-auto">
            None of this is decided in November. It&apos;s decided on the Tuesday nights between now and then.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-[16px]" aria-hidden>🎓</span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-indigo-300">Their first-choice course</p>
            </div>
            <p className="text-zinc-300 text-[14px] leading-relaxed mb-3">
              University Entrance needs NCEA Level 3 with 14 credits in each of three approved subjects, plus literacy and numeracy. Limited-entry courses go further: universities such as Auckland rank applicants on their best 80 Level 3 credits, and an Excellence credit is worth twice an Achieved.
            </p>
            <p className="text-zinc-500 text-[12.5px]">The difference between Achieved and Excellence in one subject can be the difference between the course they want and the one they settle for.</p>
          </div>
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[16px]" aria-hidden>📈</span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">A working life</p>
            </div>
            <p className="text-zinc-300 text-[14px] leading-relaxed mb-3">
              Education earnings data consistently shows people with a degree earning more, year after year, than those who finish with school qualifications alone. That gap doesn&apos;t close; it compounds across a career.
            </p>
            <p className="text-zinc-500 text-[12.5px]">
              Twenty minutes a night in Year 12 is one of the cheapest investments a family will ever make.{" "}
              <a href="https://www.educationcounts.govt.nz/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Education Counts</a> has the figures.
            </p>
          </div>
          <div className="rounded-[28px] border border-white/[0.07] bg-white/[0.015] p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[16px]" aria-hidden>🧭</span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-300">Confidence that&apos;s earned</p>
            </div>
            <p className="text-zinc-300 text-[14px] leading-relaxed mb-3">
              A teenager who has sat thirty marked papers walks into the exam hall knowing what&apos;s coming. The nerves don&apos;t vanish, but they stop deciding the result. That habit of practising honestly outlasts any single exam.
            </p>
            <p className="text-zinc-500 text-[12.5px]">Endorsements, scholarships and halls of residence all read the same transcript. So does your child, in January.</p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU SEE ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
          <div>
            <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">For you</p>
            <h2 className={`${display.className} text-[26px] sm:text-[38px] font-bold text-white tracking-[-0.02em] mb-4 leading-[1.1]`} style={{ textWrap: "balance" }}>
              No more &ldquo;it went fine.&rdquo;
            </h2>
            <p className="text-zinc-400 text-[14px] sm:text-[15px] leading-relaxed mb-5">
              Open the dashboard together and it&apos;s all there: every paper sat, every topic&apos;s strength, the trend over weeks, and what&apos;s scheduled next. You can see effort and progress at a glance without hovering, and they can show you a real number instead of a shrug.
            </p>
            <ul className="space-y-2.5">
              {[
                "Every exam and every mark, with the examiner-style feedback",
                "Topic-by-topic strength, so \"Maths\" becomes \"Algebra, specifically\"",
                "The week-by-week plan and whether it's being kept",
                "Shareable result cards for the fridge, or the group chat",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-zinc-300">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] border border-white/[0.1] bg-[#0d0d15] p-2 shadow-2xl shadow-black/50">
            <div className="rounded-[22px] bg-[#08080e] border border-white/[0.05] p-4 sm:p-5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-3">Recent papers · sample</p>
              <div className="space-y-2">
                {[
                  { s: "Mathematics · Algebra", d: "Tonight", g: "Merit", pct: 76, tone: "text-amber-400" },
                  { s: "Chemistry · Bonding", d: "Tue", g: "Excellence", pct: 88, tone: "text-emerald-400" },
                  { s: "English · Unfamiliar text", d: "Mon", g: "Achieved", pct: 58, tone: "text-sky-400" },
                  { s: "Mathematics · Probability", d: "Sun", g: "Merit", pct: 71, tone: "text-amber-400" },
                ].map((r) => (
                  <div key={r.s} className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] px-3.5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[12.5px] font-semibold truncate">{r.s}</p>
                      <p className="text-zinc-500 text-[10.5px]">{r.d} · marked in seconds</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[12px] font-black ${r.tone}`}>{r.g}</p>
                      <p className="text-zinc-500 text-[10px] tabular-nums">{r.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-500/[0.08] border border-indigo-500/25 px-3.5 py-2.5">
                <span className="text-[11px] text-zinc-300">Next up · Thu</span>
                <span className="text-[11px] text-indigo-300 font-bold">Algebra · timed set · 20 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOR THE STUDENT ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-10 sm:py-14">
        <div className="rounded-[32px] border border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.08] via-transparent to-violet-500/[0.05] p-6 sm:p-10">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-center">
            <div className="md:col-span-1">
              <p className="font-mono text-indigo-400 text-[12px] font-bold mb-2">For them</p>
              <h2 className={`${display.className} text-[24px] sm:text-[30px] font-bold text-white tracking-[-0.02em] leading-[1.1]`} style={{ textWrap: "balance" }}>
                Built for a phone, after dinner, in 20 minutes.
              </h2>
            </div>
            <div className="md:col-span-2 grid sm:grid-cols-3 gap-3">
              {[
                { t: "Installs like an app", b: "Home-screen icon on iPhone and Android. No laptop required." },
                { t: "A tutor at 10pm", b: "Stuck on a step? The tutor chat explains it, then hands the question back." },
                { t: "Streaks, not lectures", b: "Short sessions, visible progress, a real grade that moves. That's the motivation." },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl bg-[#0a0a11]/70 border border-white/[0.07] px-4 py-4">
                  <p className="text-white font-semibold text-[13.5px] mb-1">{c.t}</p>
                  <p className="text-zinc-400 text-[12.5px] leading-relaxed">{c.b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING STRIP ═══ */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className={`${display.className} text-[28px] sm:text-[44px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            One plan. Everything included.
          </h2>
          <p className="text-zinc-500 text-[14px] sm:text-[16px]">
            Every subject, unlimited papers, honest marking, the tutor and the plan. Just choose how you&apos;d like to pay.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {(["monthly", "quarterly", "yearly"] as const).map((b) => {
            const p = PRO_PRICING[b];
            const best = b === "yearly";
            return (
              <Link key={b} href="/pricing"
                className={`group relative rounded-[24px] border p-5 sm:p-6 transition-all hover:scale-[1.01] ${best ? "border-indigo-400/40 bg-indigo-500/[0.07]" : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.15]"}`}>
                {best && (
                  <span className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider">Best value</span>
                )}
                <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">{p.label}</p>
                <p className="flex items-baseline gap-1 mb-1">
                  <span className="text-zinc-400 text-[14px]">NZ$</span>
                  <span className={`${display.className} text-white font-bold text-[34px] leading-none tracking-[-0.02em]`}>{p.amount}</span>
                </p>
                <p className="text-zinc-500 text-[12px]">{p.per}{b !== "monthly" && <> · ≈ NZ${proMonthlyEquivalent(b).toFixed(2)}/mo</>}</p>
                <p className={`mt-4 text-[13px] font-semibold ${best ? "text-indigo-300" : "text-zinc-300"} group-hover:text-white transition-colors`}>See what&apos;s included →</p>
              </Link>
            );
          })}
        </div>
        <p className="text-center text-zinc-600 text-[11.5px] mt-5">Cancel anytime · 30-day money-back guarantee · Billed in NZD by Stripe · GST included</p>
      </section>

      {/* ═══ EXAM SYSTEMS ═══ */}
      <section className="max-w-4xl mx-auto px-5 py-10 sm:py-14">
        <p className="text-center text-zinc-500 text-[13px] mb-4">Built for NCEA first. Fifteen more exam systems in beta.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            "🇳🇿 NCEA", "🇦🇺 HSC", "🇦🇺 QCE", "🇦🇺 VCE", "🇦🇺 WACE", "🇦🇺 SACE",
            "🏴󠁧󠁢󠁥󠁮󠁧󠁿 GCSE", "🏴󠁧󠁢󠁥󠁮󠁧󠁿 A-Levels", "🏴󠁧󠁢󠁳󠁣󠁴󠁿 SQA Highers",
            "🇺🇸 AP · SAT · ACT", "🇨🇦 Ontario · Alberta · BC",
          ].map((s) => (
            <span key={s} className="text-[12.5px] px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-zinc-400 cursor-default">
              {s}
            </span>
          ))}
          <Link href="/global" className="text-[12.5px] px-3.5 py-1.5 rounded-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/[0.08] transition-colors">
            Find your exam →
          </Link>
        </div>
      </section>

      {/* ═══ BIG CTA ═══ */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-24 text-center">
        <h2 className={`${display.className} text-[32px] sm:text-[54px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-4`} style={{ textWrap: "balance" }}>
          Start with one honest number.
          <br />
          <span className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">The grade they&apos;d get today.</span>
        </h2>
        <p className="text-zinc-500 text-[14px] sm:text-[16px] mb-8 max-w-md mx-auto">
          Sit the free grade check together. Eight questions, marked properly, two minutes. Then decide.
        </p>
        <div className="min-h-[56px]">
          {isLoaded && (
            <Link href={primaryHref}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0f] font-bold px-10 py-4 rounded-full hover:scale-[1.02] transition-all shadow-2xl shadow-indigo-500/20 text-[16px]">
              {primaryLabel}
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
        <p className="font-mono text-zinc-600 text-[11px] mt-5 tracking-tight">
          free grade check · no account · no card · then NZ${PRO_PRICING.monthly.amount}/mo or NZ${PRO_PRICING.yearly.amount}/yr, cancel anytime
        </p>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="max-w-2xl mx-auto px-5 pb-16 sm:pb-24">
        <h2 className={`${display.className} text-center text-[26px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-8`}>
          Questions parents ask
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
        <p className="text-center text-zinc-500 text-[13px] mt-8">
          Something else? <Link href="/contact" className="text-indigo-400 font-semibold hover:underline">Ask us directly</Link> — a person replies.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
