// ── Homepage: the free-week door (rebuilt 2026-10, Phase 5) ──
// The buyer is a parent; the user is their child. One job: start a free week.
// Server-rendered so the exam names and prices are the visitor's own from the
// first paint (Vercel geo header → lib/homeCopy.ts, lib/funnelPricing.ts).
// House rules: "your child" / "they"; never "teen" or "track"; no invented
// statistics or testimonials (placeholders are marked); exam-style, never
// past-paper claims; cost figures labelled as typical.

import Link from "next/link";
import { headers } from "next/headers";
import { Figtree } from "next/font/google";
import FreeWeekButton from "@/components/FreeWeekButton";
import HomePaidRedirect from "@/components/HomePaidRedirect";
import { EXAMPLE_CHILD, EXAMPLE_SUBJECTS, homeCopy, homePrices, type HomeCopy } from "@/lib/homeCopy";
import "./home.css";

const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-figtree" });

export const dynamic = "force-dynamic";

const wrap = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
const h2 = "text-[30px] sm:text-[40px] font-bold leading-[1.1] tracking-[-0.02em]";
const eyebrow = "text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--purple-text)]";
const isDev = process.env.NODE_ENV !== "production";

// ── Small pieces ──

function Spark({ values, className = "" }: { values: number[]; className?: string }) {
  const w = 72, h = 26, min = Math.min(...values) - 2, max = Math.max(...values) + 2;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden>
      <path d={d} pathLength={1} fill="none" stroke="var(--purple)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="draw" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden className="mt-0.5 shrink-0">
      <circle cx="10" cy="10" r="10" fill="var(--good-soft)" />
      <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="var(--good)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TestimonialPlaceholder({ id }: { id: string }) {
  // PLACEHOLDER: real parent testimonial goes here (name, child's year, what changed).
  // Never invent one. Hidden in production until a real one is added.
  if (!isDev) return null;
  return (
    <div className={`${wrap} py-6`} data-placeholder={`testimonial-${id}`}>
      <div className="rounded-2xl border-2 border-dashed border-[var(--line)] p-6 text-center text-[15px] text-[var(--muted)]">
        Testimonial placeholder ({id}): a real parent&rsquo;s words go here. Dev only — hidden in production.
      </div>
    </div>
  );
}

function ForecastCard({ copy }: { copy: HomeCopy }) {
  return (
    <div className="card rise rise-3 w-full max-w-[440px] p-5 sm:p-6 shadow-[0_1px_2px_rgba(21,21,27,0.04)]">
      <div className="flex items-baseline justify-between">
        <p className="text-[17px] font-bold">Where {EXAMPLE_CHILD} stands</p>
        <p className="text-[13px] text-[var(--muted)]">Example</p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-3 text-[15px]">
        <span className="text-[13px] text-[var(--muted)]">Subject</span>
        <span className="text-[13px] text-[var(--muted)]">Now</span>
        <span className="text-[13px] text-[var(--muted)]">Heading for</span>
        <span className="text-[13px] text-[var(--muted)]">6 weeks</span>
        {EXAMPLE_SUBJECTS.map((s) => (
          <div key={s.name} className="contents">
            <span className="font-semibold">{s.name}</span>
            <span className="text-center font-semibold">{s.now}</span>
            <span className="text-center font-bold text-[var(--good)]">{s.heading}</span>
            <Spark values={s.trend} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-[10px] bg-[var(--good-soft)] px-3 py-2.5 text-[15px] font-semibold text-[var(--good)]">
        <Check /> {copy.onPaceFor}
      </div>
    </div>
  );
}

function PhoneTask() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[36px] border-[10px] border-[var(--ink)] bg-white p-4 shadow-[0_1px_2px_rgba(21,21,27,0.06)]" aria-label="Tonight's task on a phone">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[var(--line-2)]" aria-hidden />
      <p className="text-[13px] font-semibold text-[var(--muted)]">Tonight · Chemistry · 20 min</p>
      <div className="mt-3 rounded-2xl border border-[var(--line)] p-3">
        <p className="text-[14px] leading-snug">Q1. How many moles are in 4.0 g of sodium hydroxide? (M<sub>r</sub> = 40)</p>
        <p className="mt-2 rounded-lg bg-[var(--band)] px-2.5 py-1.5 font-mono text-[13px]">4.0 ÷ 40 = 0.10 mol</p>
        <p className="mt-2 inline-flex rounded-full bg-[var(--good-soft)] px-2.5 py-1 text-[13px] font-semibold text-[var(--good)]">2 out of 2</p>
      </div>
      <div className="mt-2.5 rounded-2xl border border-[var(--line)] p-3">
        <p className="text-[14px] leading-snug">Q2. 0.10 mol is dissolved to make 250 cm³. What is the concentration?</p>
        <p className="mt-2 rounded-lg bg-[var(--band)] px-2.5 py-1.5 font-mono text-[13px]">0.4 mol/dm³</p>
        <p className="mt-2 inline-flex rounded-full bg-[var(--purple-soft)] px-2.5 py-1 text-[13px] font-semibold text-[var(--purple-text)]">1 out of 2: right answer, no working</p>
      </div>
    </div>
  );
}

// ── Page ──

export default async function HomePage() {
  const country = (await headers()).get("x-vercel-ip-country");
  const copy = homeCopy(country);
  const prices = homePrices(country);
  const perMonthOfYear = `${prices.yearly.label.replace(/[\d,.]+$/, "")}${(prices.yearly.amount / 12).toFixed(2)}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StudyAce",
    applicationCategory: "EducationalApplication",
    description: "Exam practice app: exam-style questions on your child's phone, marked like the real exam, with a forecast of the grade they're heading for.",
    operatingSystem: "Web",
    url: "https://studyace.co",
    offers: { "@type": "Offer", price: String(prices.yearly.amount), priceCurrency: prices.currency.toUpperCase() },
  };

  const freeWeekNote = "7 days free. Cancel in one click. 30-day money back.";

  return (
    <div className={`sa-home ${figtree.variable}`}>
      <HomePaidRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Header */}
      <header className="border-b border-[var(--line-2)] bg-white">
        <div className={`${wrap} flex h-16 items-center justify-between gap-3`}>
          <Link href="/" className="text-[19px] font-extrabold tracking-[-0.02em]" aria-label="StudyAce home">study<span className="text-[var(--purple-text)]">ace</span></Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-[15px] font-semibold">
            <a href="#how" className="hidden sm:inline-flex min-h-[44px] items-center px-3 text-[var(--ink-2)] hover:text-[var(--ink)]">How it works</a>
            <a href="#pricing" className="hidden sm:inline-flex min-h-[44px] items-center px-3 text-[var(--ink-2)] hover:text-[var(--ink)]">Pricing</a>
            <Link href="/sign-in" className="inline-flex min-h-[44px] items-center px-3 text-[var(--ink-2)] hover:text-[var(--ink)]">Sign in</Link>
            <a href="#pricing" className="btn btn-primary !min-h-[44px] !px-4 !text-[15px]">Start a free week</a>
          </nav>
        </div>
      </header>

      {/* 1. Hero */}
      <section className={`${wrap} grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_1fr]`}>
        <div>
          <p className={`${eyebrow} rise`}>For parents of {copy.exams} students</p>
          <h1 className="rise rise-2 mt-3 text-[40px] sm:text-[56px] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Don&rsquo;t guess. Know where they stand.
          </h1>
          <p className="rise rise-3 mt-4 text-[19px] sm:text-[21px] leading-snug text-[var(--ink-2)]">
            Then follow the steps to get the results they want.
          </p>
          <p className="rise rise-3 mt-5 max-w-[560px] text-[16px] leading-relaxed text-[var(--ink-2)]">
            StudyAce is an exam practice app for {copy.exams} students. Exam-style questions on their phone, marked like the
            real exam, with a forecast of the grade they&rsquo;re heading for.
          </p>
          <div className="rise rise-4 mt-7 flex flex-wrap gap-3">
            <FreeWeekButton billing="yearly" className="btn btn-primary" />
            <a href="#pricing" className="btn btn-secondary">See pricing</a>
          </div>
          <p className="rise rise-4 mt-3 text-[14px] text-[var(--muted)]">{freeWeekNote}</p>
        </div>
        <div className="flex justify-center lg:justify-end"><ForecastCard copy={copy} /></div>
      </section>

      {/* 2. What StudyAce is */}
      <section id="how" className="bg-[var(--band)] py-14 sm:py-20">
        <div className={`${wrap} grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]`}>
          <div className="reveal order-2 lg:order-1"><PhoneTask /></div>
          <div className="reveal order-1 lg:order-2">
            <p className={eyebrow}>What StudyAce is</p>
            <h2 className={`${h2} mt-2`}>Exam practice on their phone. Marked like the real thing.</h2>
            <ul className="mt-6 grid gap-3 text-[16px]">
              {[
                "Exam-style questions in every subject",
                "Full mocks",
                "Examiner-style marking: a mark for the working, a mark for the answer",
                "Short lessons on what they got wrong",
                "A grade forecast",
                "Works on any phone. Add it to the home screen",
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check /><span>{t}</span></li>
              ))}
            </ul>
            {copy.earlyAccess && (
              <p className="mt-5 text-[14px] leading-relaxed text-[var(--muted)]">
                {copy.exams === "high-school exam" ? "Outside New Zealand, StudyAce" : `StudyAce for ${copy.exams}`} is in early access: questions are written for
                those exams and marked the same honest way, and we&rsquo;re still fine-tuning them.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3. Step 1 · No surprises on results day */}
      <section className={`${wrap} py-14 sm:py-20`}>
        <div className="reveal max-w-[720px]">
          <p className={eyebrow}>Step 1 · No surprises on results day</p>
          <h2 className={`${h2} mt-2`}>Know their grade now. Not on results day.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card reveal p-5 sm:p-6">
            <p className="text-[15px] font-semibold text-[var(--muted)]">Without StudyAce</p>
            <ol className="mt-4 grid gap-3">
              {[["Term 1", "Working hard."], ["Mocks", "B. Maybe."], ["Results day", "C. Too late."]].map(([when, what], i) => (
                <li key={when} className="flex items-baseline justify-between gap-4 border-t border-[var(--line-2)] pt-3 first:border-0 first:pt-0">
                  <span className="text-[14px] text-[var(--muted)]">{when}</span>
                  <span className={`text-[17px] font-semibold ${i === 2 ? "text-[var(--lost)]" : ""}`}>{what}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="card reveal border-[var(--purple)]/30 bg-[var(--purple-soft)] p-5 sm:p-6">
            <p className="text-[15px] font-semibold text-[var(--purple-text)]">With StudyAce</p>
            <ol className="mt-4 grid gap-3">
              {[["Week 1", "C. Plan set."], ["Week 6", "B. Gap closing."], ["Mocks", "A. On pace."], ["Results day", "A. As forecast."]].map(([when, what], i) => (
                <li key={when} className="flex items-baseline justify-between gap-4 border-t border-[var(--purple)]/15 pt-3 first:border-0 first:pt-0">
                  <span className="text-[14px] text-[var(--muted)]">{when}</span>
                  <span className={`text-[17px] font-semibold ${i === 3 ? "text-[var(--good)]" : ""}`}>{what}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            ["A full mock. A real grade.", "Full exam-style mocks, marked the way an examiner marks them. A grade you can act on, not a guess."],
            ["Updated every night.", "Every task they do moves the forecast, and it's saved every night, so you see which way it's heading."],
            ["Time to fix it.", "Find out while there's still time to close the gap, not when the envelope arrives."],
          ].map(([t, d]) => (
            <div key={t} className="reveal">
              <p className="text-[18px] font-bold">{t}</p>
              <p className="mt-1.5 text-[16px] leading-relaxed text-[var(--ink-2)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Strip */}
      <section className="border-y border-[var(--line-2)] bg-[var(--band)] py-8">
        <div className={`${wrap} reveal flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-[16px] font-bold">Top courses go to top grades</p>
          <ul className="flex flex-wrap gap-2 text-[14px] font-semibold text-[var(--ink-2)]">
            {["Medicine", "Law", "Engineering", "Veterinary Science", "Architecture"].map((c) => (
              <li key={c} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Step 2 · Know what to do */}
      <section className={`${wrap} py-14 sm:py-20`}>
        <div className="reveal max-w-[720px]">
          <p className={eyebrow}>Step 2 · Know what to do</p>
          <h2 className={`${h2} mt-2`}>One task a night. That&rsquo;s the plan.</h2>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["9:00pm", "Task set", "Twenty minutes, aimed at what's costing them marks right now."],
            ["9:20pm", "Marked", "Every answer marked like the real exam, with what was missing."],
            ["9:21pm", "Forecast updated", "The grade they're heading for moves with what they just did."],
          ].map(([time, title, d]) => (
            <li key={time} className="card reveal p-5">
              <p className="font-mono text-[14px] font-semibold text-[var(--purple-text)]">{time}</p>
              <p className="mt-1 text-[18px] font-bold">{title}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-2)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Step 3 · Get the marks back */}
      <section className="bg-[var(--band)] py-14 sm:py-20">
        <div className={`${wrap} grid items-center gap-10 lg:grid-cols-2`}>
          <div className="reveal">
            <p className={eyebrow}>Step 3 · Get the marks back</p>
            <h2 className={`${h2} mt-2`}>Every lost mark, explained.</h2>
            <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-[var(--ink-2)]">
              Not just right or wrong. They see exactly which mark they dropped and why, the way an examiner would write it.
            </p>
          </div>
          <div className="card reveal p-5 sm:p-6">
            <p className="text-[13px] font-semibold text-[var(--muted)]">Chemistry · Question 4</p>
            <p className="mt-2 text-[16px]">Calculate the mass of 0.25 mol of calcium carbonate. (M<sub>r</sub> = 100)</p>
            <p className="mt-3 rounded-lg bg-[var(--band)] px-3 py-2 font-mono text-[14px]">0.25 × 100 = 25</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[15px]">
              <div className="rounded-[10px] bg-[var(--good-soft)] px-3 py-2"><span className="text-[var(--muted)]">Working</span> <strong className="float-right text-[var(--good)]">1/1</strong></div>
              <div className="rounded-[10px] bg-[#FBEFEB] px-3 py-2"><span className="text-[var(--muted)]">Answer</span> <strong className="float-right text-[var(--lost)]">0/1</strong></div>
            </div>
            <p className="mt-4 text-[16px] font-semibold">Right number. No unit. An examiner takes the mark.</p>
          </div>
        </div>
      </section>

      <TestimonialPlaceholder id="after-marking" />

      {/* 7. Side by side */}
      <section className={`${wrap} py-14 sm:py-20`}>
        <h2 className={`${h2} reveal`}>Side by side.</h2>
        <div className="reveal mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[15px]">
            <thead>
              <tr>
                <th className="w-[26%] p-3" />
                <th className="rounded-t-2xl bg-[var(--purple-soft)] p-3 font-bold text-[var(--purple-text)]">StudyAce</th>
                <th className="p-3 font-semibold">Private tutor</th>
                <th className="p-3 font-semibold">Revision guides</th>
                <th className="p-3 font-semibold">Free sites and YouTube</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["Cost a year", prices.yearly.label, copy.tutorYear, copy.guidesYear, "Free"],
                ["How often", "Every night", "Once a week", "When they open it", "Whenever"],
                ["Marked like the real exam", "Yes", "Depends on the tutor", "Answers in the back", "No"],
                ["Know the grade they're heading for", "Yes", "Tutor's opinion", "No", "No"],
                ["Know what to do next", "Yes, every night", "Yes, weekly", "No", "No"],
                ["There at 9pm on a Tuesday", "Yes", "No", "Yes", "Yes"],
              ] as const).map((row, r, all) => (
                <tr key={row[0]}>
                  <th scope="row" className="border-t border-[var(--line-2)] p-3 font-semibold">{row[0]}</th>
                  <td className={`border-t border-[var(--purple)]/10 bg-[var(--purple-soft)] p-3 font-semibold ${r === all.length - 1 ? "rounded-b-2xl" : ""}`}>{row[1]}</td>
                  <td className="border-t border-[var(--line-2)] p-3 text-[var(--ink-2)]">{row[2]}</td>
                  <td className="border-t border-[var(--line-2)] p-3 text-[var(--ink-2)]">{row[3]}</td>
                  <td className="border-t border-[var(--line-2)] p-3 text-[var(--ink-2)]">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          Figures are typical, not quotes: a tutor at a common local rate for one hour a week over a school year; a few revision guides across their subjects.
        </p>
      </section>

      {/* 8. Pricing */}
      <section id="pricing" className="scroll-mt-4 bg-[var(--band)] py-14 sm:py-20">
        <div className={wrap}>
          <div className="reveal max-w-[680px]">
            <h2 className={h2}>One price. Every subject.</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-[var(--ink-2)]">
              Seven days free, then one price. Cancel in one click. Not working? Full refund within 30 days.
            </p>
          </div>
          <div className="mt-8 grid max-w-[760px] gap-4 sm:grid-cols-2">
            <div className="card reveal relative border-2 border-[var(--purple)] p-6">
              <p className="absolute -top-3 left-5 rounded-full bg-[var(--purple)] px-2.5 py-0.5 text-[13px] font-semibold text-white">Best value</p>
              <p className="text-[16px] font-semibold">Yearly</p>
              <p className="mt-2 text-[36px] font-extrabold tracking-[-0.02em]">{prices.yearly.label}<span className="text-[17px] font-semibold text-[var(--muted)]"> a year</span></p>
              <p className="text-[14px] text-[var(--muted)]">After your free week. About {perMonthOfYear} a month.</p>
              <div className="mt-5"><FreeWeekButton billing="yearly" label="Start free week" className="btn btn-primary w-full" confirmClassName="text-left text-[15px]" /></div>
            </div>
            <div className="card reveal p-6">
              <p className="text-[16px] font-semibold">Monthly</p>
              <p className="mt-2 text-[36px] font-extrabold tracking-[-0.02em]">{prices.monthly.label}<span className="text-[17px] font-semibold text-[var(--muted)]"> a month</span></p>
              <p className="text-[14px] text-[var(--muted)]">After your free week.</p>
              <div className="mt-5"><FreeWeekButton billing="monthly" label="Start free week" className="btn btn-secondary w-full" confirmClassName="text-left text-[15px]" /></div>
            </div>
          </div>
          <p className="mt-4 text-[14px] text-[var(--muted)]">
            If your child hasn&rsquo;t done their first grade check by day 6, we cancel the free week for you and nothing is charged.
          </p>
        </div>
      </section>

      <TestimonialPlaceholder id="after-pricing" />

      {/* 9. Closing band */}
      <section className="bg-[var(--ink)] py-16 sm:py-20 text-white">
        <div className={`${wrap} reveal text-center`}>
          <h2 className="text-[32px] sm:text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em]">Don&rsquo;t leave exam day to luck.</h2>
          <p className="mt-3 text-[19px] text-white/80">Know where they stand. Tonight.</p>
          <div className="mt-7 flex justify-center">
            <FreeWeekButton billing="yearly" className="btn btn-primary" confirmClassName="max-w-[420px] text-left text-[15px] text-white" />
          </div>
          <p className="mt-3 text-[14px] text-white/70">7 days free. Cancel in one click.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8">
        <div className={`${wrap} flex flex-col gap-3 text-[14px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between`}>
          <p>© {new Date().getFullYear()} StudyAce</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1">
            {[["/blog", "Blog"], ["/schools", "For schools"], ["/contact", "Contact"], ["/privacy", "Privacy"], ["/terms", "Terms"]].map(([href, label]) => (
              <Link key={href} href={href} className="inline-flex min-h-[44px] items-center hover:text-[var(--ink)]">{label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
