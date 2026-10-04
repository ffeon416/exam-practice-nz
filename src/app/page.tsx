"use client";

// ── Homepage: the Convert door (rebuilt 2026-10-05) ──
// The buyer is a parent; the user is their teenager. This page has one job:
// get the parent to the free grade check, then to Pro. It is deliberately
// short — hero, what it does, what it costs against a tutor, what the grade
// is worth, the price, five questions — in the same design language as the
// paid app (dark cards, one accent per idea, big display type).
// House rules: no invented statistics, no fake testimonials, no past-paper
// claims; cost figures are labelled as typical rates; nothing is promised
// that the product can't do. CSS keyframes only, no blur filters.

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { display } from "@/lib/displayFont";
import SiteFooter from "@/components/SiteFooter";
import { PRO_PRICING, proMonthlyEquivalent } from "@/lib/tierLimits";

// Typical private tutoring sits at NZ$60–80 an hour; the comparison uses the
// middle of that range and a school year of weekly sessions. Workbooks are
// NZ$25–40 each; five subjects is a normal senior load.
const TUTOR_HOURLY = 70;
const TUTOR_WEEKS = 40;
const TUTOR_YEAR = TUTOR_HOURLY * TUTOR_WEEKS; // 2,800
const WORKBOOKS_YEAR = 5 * 32; // ~160
const STUDYACE_YEAR = PRO_PRICING.yearly.amount; // 149

const GREEN = "#3ee6a0", VIOLET = "#8b8cf8", AMBER = "#fbbf24", ROSE = "#ff6b7a";
const nz = (n: number) => `NZ$${n.toLocaleString("en-NZ")}`;

const FAQS: { q: string; a: string }[] = [
  { q: "Is the marking actually honest, or does it just encourage them?", a: "Honest, deliberately. Every answer is marked the way an examiner marks it: one mark for the working, one for the answer, scored separately, with exactly what was missing. A hedge like \"not sure, maybe 4?\" scores zero, the same as it would on the day. Encouraging in tone, truthful in content." },
  { q: "Can it replace a tutor?", a: "For the part that moves grades, daily exam-style practice with honest marking and a plan, yes, and it's there every night instead of one hour a week. If your child needs a person to re-teach a topic from scratch, a tutor still earns their fee. Many families use both." },
  { q: "Which exams does it cover?", a: "NCEA Levels 1 to 3 plus Year 10, and 15 more systems in beta: Australia's HSC, QCE, VCE, WACE and SACE, the UK's GCSE, A-Levels and SQA Highers, US AP, SAT, ACT and state exams, and Canada's Ontario, Alberta and BC. Questions and difficulty follow each system's own style." },
  { q: "How much time does it take, and is it safe?", a: "About 20 minutes a day on a phone: one task, marked in seconds, with tomorrow's already planned. It's built for 13 to 18 year olds: no ads inside the app, no selling data, no public profiles. Everything your child types stays in their account." },
  { q: "What does it cost, and what if they don't use it?", a: `NZ$${PRO_PRICING.monthly.amount} a month, NZ$${PRO_PRICING.quarterly.amount} for three months, or NZ$${PRO_PRICING.yearly.amount} for the whole year. Cancel any time, and there's a 30-day money-back guarantee, so if it doesn't get used, you're not out of pocket.` },
];

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { tier, loading: tierLoading } = useTier();

  // Door split: a paying student has no business on the sales page.
  useEffect(() => {
    if (isSignedIn && !tierLoading && tier !== "free") router.replace("/schedule");
  }, [isSignedIn, tier, tierLoading, router]);

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StudyAce",
    applicationCategory: "EducationalApplication",
    description:
      "Unlimited AI-generated, exam-style practice for high-school students, marked honestly like an examiner, with a day-by-day schedule to a target grade. NCEA, HSC, QCE, GCSE, A-Levels, AP and more.",
    operatingSystem: "Web",
    url: "https://studyace.co",
    offers: { "@type": "Offer", price: String(PRO_PRICING.monthly.amount), priceCurrency: "NZD" },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  // Signed-in here means a lead (paid users are redirected above).
  const lead = isLoaded && !!isSignedIn;
  const cta = lead ? { href: "/start", label: "Get Pro →" } : { href: "/grade", label: "Check their grade — free →" };
  const ctaButton = (big = false) => (
    <Link href={cta.href}
      className={`inline-flex items-center justify-center font-bold rounded-full text-[#07120d] transition-transform hover:scale-[1.03] ${big ? "text-[18px] sm:text-[20px] px-9 sm:px-11 min-h-[64px]" : "text-[16px] px-7 min-h-[54px]"}`}
      style={{ background: GREEN, boxShadow: `0 0 44px ${GREEN}55` }}>
      {cta.label}
    </Link>
  );

  const steps = [
    { n: "01", color: GREEN, title: "Find the real grade", body: "A free grade check: 8 questions, marked like an examiner. You get a letter, from A+ to F, and the topics costing the most marks." },
    { n: "02", color: VIOLET, title: "One task, every day", body: "They set a goal grade and their exam date. StudyAce builds the road there: a paper, a lesson on what they got wrong, or a mock. About 20 minutes." },
    { n: "03", color: AMBER, title: "Marking that doesn't flatter", body: "One mark for the working, one for the answer. A guess scores zero, as it would on the day. A weekly grade check shows whether they're on pace." },
  ];

  const bars = [
    { label: "A tutor, one hour a week", note: `${nz(TUTOR_HOURLY)} an hour × ${TUTOR_WEEKS} school weeks`, amount: TUTOR_YEAR, color: ROSE },
    { label: "Workbooks, five subjects", note: "about NZ$32 each", amount: WORKBOOKS_YEAR, color: AMBER },
    { label: "StudyAce, the whole year", note: `every subject · every night · about ${nz(Number(proMonthlyEquivalent("yearly").toFixed(2)))} a month`, amount: STUDYACE_YEAR, color: GREEN },
  ];

  return (
    <div className="relative overflow-x-clip bg-[#06060a] isolate">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Ground: gradients only */}
      <div className="absolute inset-x-0 top-0 h-[900px] -z-10 pointer-events-none" aria-hidden
        style={{ background: `radial-gradient(60% 55% at 50% 0%, ${GREEN}1c 0%, transparent 70%), radial-gradient(40% 40% at 85% 30%, ${VIOLET}14 0%, transparent 70%)` }} />

      {/* ═══ HERO ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 pb-10 sm:pb-14 text-center">
        <p className="home-rise inline-flex items-center gap-2.5 rounded-full px-4 py-2 font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.16em]" style={{ color: GREEN, background: `${GREEN}1a` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />For parents of high-school students
        </p>
        <h1 className={`${display.className} home-rise font-bold text-white text-[44px] sm:text-[72px] lg:text-[88px] leading-[0.98] tracking-[-0.045em] mt-6`} style={{ animationDelay: "80ms", textWrap: "balance" }}>
          Know exactly where your child stands.{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${GREEN}, ${VIOLET})` }}>Then fix it.</span>
        </h1>
        <p className="home-rise text-zinc-300 text-[17px] sm:text-[20px] leading-relaxed max-w-2xl mx-auto mt-6" style={{ animationDelay: "160ms" }}>
          StudyAce finds your teenager&apos;s real grade, gives them one task a day to raise it, and marks every answer as strictly as an examiner. For less than the cost of three tutor sessions a year.
        </p>
        <div className="home-rise flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 min-h-[64px]" style={{ animationDelay: "240ms" }}>
          {isLoaded && ctaButton(true)}
          {isLoaded && (
            <Link href={lead ? "/grade" : "/pricing"} className="inline-flex items-center justify-center font-semibold text-[16px] text-white px-7 min-h-[54px] rounded-full border border-white/[0.14] hover:border-white/40 transition-colors">
              {lead ? "Free grade check" : "See pricing"}
            </Link>
          )}
        </div>
        <p className="home-rise text-zinc-500 text-[13.5px] mt-4" style={{ animationDelay: "300ms" }}>
          8 questions · no account · no card · then {nz(PRO_PRICING.yearly.amount)} a year, 30-day money back
        </p>

        {/* Sample of the product: the same card and line the student sees. */}
        <div className="home-rise relative mt-10 sm:mt-14 rounded-[28px] border-2 bg-[#0e0f13] p-6 sm:p-9 text-left overflow-clip"
          style={{ animationDelay: "380ms", borderColor: `${GREEN}66`, backgroundImage: `linear-gradient(135deg, ${GREEN}1f 0%, ${GREEN}08 34%, transparent 62%)`, boxShadow: `0 28px 90px -28px ${GREEN}59` }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8 items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Sample · what your child sees</p>
              <div className="flex flex-wrap items-center gap-3 mt-4 font-mono uppercase">
                <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-[0.16em] text-[#0a0a0f]" style={{ background: GREEN }}>Today&apos;s task</span>
                <span className="text-[13px] tracking-[0.18em] text-zinc-300">Mathematics</span>
              </div>
              <p className={`${display.className} font-bold text-white text-[44px] sm:text-[60px] leading-[0.95] tracking-[-0.045em] mt-3`}>Grade check</p>
              <p className="text-zinc-300 text-[16px] sm:text-[17px] leading-relaxed mt-3 max-w-sm">8 questions, marked properly, so everyone knows exactly where they are. About 15 minutes.</p>
            </div>
            <div className="rounded-[22px] border border-white/[0.08] bg-[#0b0b10] p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Are they on track?</p>
                  <p className={`${display.className} font-bold text-white text-[24px] sm:text-[28px] leading-tight tracking-[-0.03em] mt-1`}>At a B. <span style={{ color: GREEN }}>A is 6 weeks away.</span></p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold rounded-full px-3 py-1.5" style={{ color: GREEN, background: `${GREEN}1a` }}>On track</span>
              </div>
              <svg viewBox="0 0 520 170" className="w-full h-auto mt-3" role="img" aria-label="Sample pace line rising from a B to an A by exam day">
                {[["A", 34], ["B", 84], ["C", 134]].map(([l, y]) => (
                  <g key={l as string}>
                    <line x1="34" x2="500" y1={y as number} y2={y as number} stroke={l === "A" ? GREEN : "rgba(255,255,255,0.08)"} strokeOpacity={l === "A" ? 0.5 : 1} strokeDasharray={l === "A" ? "2 5" : undefined} />
                    <text x="20" y={(y as number) + 4} textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" fill={l === "A" ? GREEN : "#71717a"}>{l}</text>
                  </g>
                ))}
                <path d="M40 112 Q260 100 480 34" pathLength={1} fill="none" stroke={GREEN} strokeWidth="3.5" strokeLinecap="round" className="sa-draw" />
                <polyline points="40,112 110,104 180,98 250,88" fill="none" stroke={VIOLET} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="250" cy="88" r="16" fill="#1c1a30" /><circle cx="250" cy="88" r="7.5" fill={VIOLET} />
                <text x="272" y="110" fontFamily="ui-sans-serif, system-ui" fontSize="13" fontWeight="800" fill="#fff">Now · B</text>
                <line x1="480" y1="34" x2="480" y2="8" stroke={GREEN} strokeWidth="2" strokeLinecap="round" /><path d="M480 6 L502 12 L480 20 Z" fill={GREEN} /><circle cx="480" cy="34" r="6" fill={GREEN} />
                <text x="480" y="160" textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="1.5" fill={ROSE}>EXAM DAY</text>
                <text x="40" y="160" fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="1.5" fill="#52525b">DAY 1</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IT DOES ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <h2 className={`${display.className} font-bold text-white text-[32px] sm:text-[48px] leading-[1.02] tracking-[-0.04em] text-center`} style={{ textWrap: "balance" }}>Three things. Nothing else.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mt-8 sm:mt-10">
          {steps.map((s, i) => (
            // Each card lights up in turn (01 → 02 → 03, on a loop), so the three read as a process.
            <div key={s.n} className="relative">
              <div className="sa-step-glow absolute inset-0 rounded-[24px] pointer-events-none" aria-hidden
                style={{ animationDelay: `${i * 2}s`, border: `2px solid ${s.color}`, boxShadow: `0 0 0 1px ${s.color}55, 0 0 46px 2px ${s.color}73, inset 0 0 40px ${s.color}1f` }} />
              <div className="relative h-full rounded-[24px] border bg-[#0e0f13] p-6 sm:p-7 overflow-clip" style={{ borderColor: `${s.color}40`, backgroundImage: `linear-gradient(160deg, ${s.color}1c 0%, transparent 55%)` }}>
                <span className="absolute left-6 right-6 top-0 h-[3px] rounded-b-full" style={{ background: s.color, boxShadow: `0 0 16px ${s.color}` }} aria-hidden />
                <p className="font-mono text-[12px] font-bold tracking-[0.2em]" style={{ color: s.color }}>{s.n}</p>
                <h3 className={`${display.className} font-bold text-white text-[24px] sm:text-[28px] leading-tight tracking-[-0.03em] mt-3`}>{s.title}</h3>
                <p className="text-zinc-300 text-[15.5px] leading-relaxed mt-3">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ THE COST ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <div className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-6 sm:p-10 lg:p-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">The cost, side by side</p>
          <h2 className={`${display.className} font-bold text-white text-[32px] sm:text-[52px] leading-[1] tracking-[-0.04em] mt-3`} style={{ textWrap: "balance" }}>
            A tutor is about {nz(TUTOR_YEAR)} a year. <span style={{ color: GREEN }}>StudyAce is {nz(STUDYACE_YEAR)}.</span>
          </h2>
          <div className="mt-8 space-y-5">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-white font-semibold text-[16px] sm:text-[17px]">{b.label} <span className="block sm:inline text-zinc-500 font-normal text-[13.5px] sm:ml-2">{b.note}</span></p>
                  <p className={`${display.className} font-bold text-[24px] sm:text-[30px] leading-none tracking-[-0.03em] shrink-0`} style={{ color: b.color }}>{nz(b.amount)}</p>
                </div>
                <div className="h-3.5 rounded-full bg-white/[0.05] overflow-hidden mt-2.5">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2.5, (b.amount / TUTOR_YEAR) * 100)}%`, background: b.color, boxShadow: `0 0 18px ${b.color}80` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-9">
            {[
              { v: `${Math.round(TUTOR_YEAR / STUDYACE_YEAR)}×`, l: "what a weekly tutor costs, compared with StudyAce for the year" },
              { v: "1 hr a week", l: "is what the tutor money buys. StudyAce is there every night" },
              { v: "Every answer", l: "marked on the spot, so effort turns into a number you can both see" },
            ].map((x) => (
              <div key={x.v} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                <p className={`${display.className} font-bold text-white text-[26px] sm:text-[30px] leading-none tracking-[-0.03em]`}>{x.v}</p>
                <p className="text-zinc-400 text-[14px] leading-relaxed mt-2">{x.l}</p>
              </div>
            ))}
          </div>
          <p className="text-zinc-600 text-[12.5px] mt-6">Tutor and workbook figures are typical rates, shown for comparison; yours may differ. A good tutor is still worth it for re-teaching a topic from scratch.</p>
        </div>
      </section>

      {/* ═══ WHAT THE GRADE IS WORTH ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <h2 className={`${display.className} font-bold text-white text-[32px] sm:text-[52px] leading-[1] tracking-[-0.04em] text-center`} style={{ textWrap: "balance" }}>
          The real cost isn&apos;t the tutor. <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${ROSE}, ${AMBER})` }}>It&apos;s the grade they miss.</span>
        </h2>
        <p className="text-zinc-400 text-[16px] sm:text-[18px] leading-relaxed max-w-2xl mx-auto text-center mt-5">
          Universities fill their competitive courses on grades. A few marks either way decides which side of the line your child lands on.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-8 sm:mt-10">
          <div className="rounded-[24px] border bg-[#0e0f13] p-6 sm:p-8" style={{ borderColor: `${ROSE}40`, backgroundImage: `linear-gradient(160deg, ${ROSE}17 0%, transparent 55%)` }}>
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: ROSE }}>A few marks short</p>
            <ul className="mt-4 space-y-3.5 text-zinc-300 text-[16px] leading-relaxed">
              <li>The course they wanted goes to someone else, and they take the one that had room.</li>
              <li>A different course is often a different city, a different first job, a different start.</li>
              <li>Nobody saw it coming, because &ldquo;it went fine&rdquo; was the only report all year.</li>
            </ul>
          </div>
          <div className="rounded-[24px] border bg-[#0e0f13] p-6 sm:p-8" style={{ borderColor: `${GREEN}40`, backgroundImage: `linear-gradient(160deg, ${GREEN}17 0%, transparent 55%)` }}>
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: GREEN }}>On the right side of the line</p>
            <ul className="mt-4 space-y-3.5 text-zinc-300 text-[16px] leading-relaxed">
              <li>Their first-choice course at the university they actually want.</li>
              <li>The qualifications that open the jobs they&apos;re aiming for.</li>
              <li>You both knew the real grade months out, and had time to move it.</li>
            </ul>
          </div>
        </div>
        <p className="text-zinc-500 text-[13.5px] leading-relaxed max-w-3xl mx-auto text-center mt-6">
          Government earnings data consistently shows people with a degree earning more across a career than those who finish with school qualifications alone (<a href="https://www.educationcounts.govt.nz/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-white">Education Counts</a> publishes the figures). No app can promise a grade or a place. What StudyAce does is make sure nobody is guessing.
        </p>
        <div className="text-center mt-8">{isLoaded && ctaButton()}</div>
      </section>

      {/* ═══ PRICE ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <h2 className={`${display.className} font-bold text-white text-[32px] sm:text-[48px] leading-[1.02] tracking-[-0.04em] text-center`}>One plan. Everything included.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-8 sm:mt-10">
          {(["monthly", "quarterly", "yearly"] as const).map((b) => {
            const p = PRO_PRICING[b];
            const best = b === "yearly";
            return (
              <Link key={b} href="/pricing" className="group relative rounded-[24px] border bg-[#0e0f13] p-6 sm:p-7 transition-transform hover:-translate-y-0.5"
                style={best ? { borderColor: `${GREEN}8c`, backgroundImage: `linear-gradient(160deg, ${GREEN}1f 0%, transparent 60%)`, boxShadow: `0 24px 70px -28px ${GREEN}66` } : { borderColor: "rgba(255,255,255,0.08)" }}>
                {best && <span className="absolute -top-3 left-6 px-3 py-1 rounded-full font-mono font-bold text-[10px] uppercase tracking-[0.16em] text-[#07120d]" style={{ background: GREEN }}>Best value</span>}
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">{p.label}</p>
                <p className="flex items-baseline gap-1.5 mt-3">
                  <span className="text-zinc-400 text-[15px]">NZ$</span>
                  <span className={`${display.className} font-bold text-white text-[48px] leading-none tracking-[-0.04em]`}>{p.amount}</span>
                </p>
                <p className="text-zinc-500 text-[13.5px] mt-2">{p.per}{b !== "monthly" && <> · about NZ${proMonthlyEquivalent(b).toFixed(2)} a month</>}</p>
                <p className="mt-5 text-[14.5px] font-semibold group-hover:text-white transition-colors" style={{ color: best ? GREEN : "#d4d4d8" }}>Choose {p.label.toLowerCase()} →</p>
              </Link>
            );
          })}
        </div>
        <p className="text-center text-zinc-500 text-[13px] mt-5">Cancel anytime · 30-day money-back guarantee · Billed in NZD by Stripe · No ads in the app, your child&apos;s data is never sold</p>
      </section>

      {/* ═══ QUESTIONS ═══ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className={`${display.className} font-bold text-white text-[32px] sm:text-[44px] leading-[1.02] tracking-[-0.04em] text-center`}>What parents ask</h2>
        <div className="mt-8 rounded-[28px] border border-white/[0.08] bg-[#0e0f13] divide-y divide-white/[0.06]">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-5 sm:px-7">
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-white font-semibold text-[16px] sm:text-[17px] min-h-[56px]">
                {f.q}
                <span className="shrink-0 text-zinc-500 text-[22px] leading-none transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="text-zinc-400 text-[15px] leading-relaxed pb-5 -mt-1">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ LAST WORD ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-16 sm:pb-24">
        <div className="relative rounded-[28px] border-2 bg-[#0e0f13] px-6 py-12 sm:py-16 text-center overflow-clip"
          style={{ borderColor: `${GREEN}66`, backgroundImage: `radial-gradient(70% 90% at 50% 0%, ${GREEN}24 0%, transparent 70%)`, boxShadow: `0 28px 90px -28px ${GREEN}59` }}>
          <h2 className={`${display.className} font-bold text-white text-[36px] sm:text-[60px] leading-[0.98] tracking-[-0.045em]`} style={{ textWrap: "balance" }}>Start with one honest number.</h2>
          <p className="text-zinc-300 text-[16px] sm:text-[18px] max-w-xl mx-auto mt-4">Sit the free grade check with your child tonight. 8 questions, no account, no card. Then decide.</p>
          <div className="mt-7">{isLoaded && ctaButton(true)}</div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
