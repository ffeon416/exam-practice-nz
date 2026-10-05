"use client";

// /global — every exam system StudyAce covers, by country. StudyAce is
// global: no system is presented as the "home" one. Each card leads to the
// free grade check (which asks for country, system and year itself).
// Systems not yet checked by students who sit them carry a small Beta tag;
// that label is an honesty guard, keep it until a system is validated.

import Link from "next/link";
import { display } from "@/lib/displayFont";
import { COUNTRIES, curriculaForCountry } from "@/data/curricula";

const GREEN = "#3ee6a0", VIOLET = "#8b8cf8";

export default function GlobalPage() {
  const groups = COUNTRIES.map((c) => ({ ...c, systems: curriculaForCountry(c.code).filter((s) => s.status !== "coming-soon") })).filter((g) => g.systems.length > 0);
  const total = groups.reduce((n, g) => n + g.systems.length, 0);

  return (
    <div className="relative overflow-x-clip bg-[#06060a] isolate">
      <div className="absolute inset-x-0 top-0 h-[700px] -z-10 pointer-events-none" aria-hidden
        style={{ background: `radial-gradient(60% 55% at 50% 0%, ${GREEN}1c 0%, transparent 70%), radial-gradient(40% 40% at 85% 30%, ${VIOLET}14 0%, transparent 70%)` }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 pb-20">
        <div className="text-center">
          <p className="home-rise inline-flex items-center gap-2.5 rounded-full px-4 py-2 font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.16em]" style={{ color: GREEN, background: `${GREEN}1a` }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />{total} exam systems · {groups.length} countries
          </p>
          <h1 className={`${display.className} home-rise font-bold text-white text-[44px] sm:text-[72px] leading-[0.98] tracking-[-0.045em] mt-6`} style={{ animationDelay: "80ms", textWrap: "balance" }}>
            StudyAce is{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${GREEN}, ${VIOLET})` }}>global.</span>
          </h1>
          <p className="home-rise text-zinc-300 text-[17px] sm:text-[20px] leading-relaxed max-w-2xl mx-auto mt-6" style={{ animationDelay: "160ms" }}>
            Wherever your child sits their exams, the questions, difficulty and style follow their own exam system. The marking is the same everywhere: honest.
          </p>
          <div className="home-rise mt-8" style={{ animationDelay: "240ms" }}>
            <Link href="/grade" className="inline-flex items-center justify-center font-bold rounded-full text-[#07120d] text-[18px] sm:text-[20px] px-9 sm:px-11 min-h-[64px] transition-transform hover:scale-[1.03]" style={{ background: GREEN, boxShadow: `0 0 44px ${GREEN}55` }}>
              Check their grade — free →
            </Link>
          </div>
        </div>

        <div className="mt-12 sm:mt-16 space-y-10">
          {groups.map((g) => (
            <section key={g.code}>
              <h2 className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-zinc-400 mb-4">
                <span className="text-[22px]" aria-hidden>{g.flag}</span>{g.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {g.systems.map((c) => (
                  <Link key={c.id} href="/grade" className="group rounded-[24px] border border-white/[0.08] bg-[#0e0f13] hover:border-white/25 p-6 flex flex-col transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={`${display.className} font-bold text-white text-[26px] leading-none tracking-[-0.03em]`}>{c.system}</h3>
                      {c.status === "early-access" && <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400 border border-white/[0.12] rounded-full px-2.5 py-1">Beta</span>}
                    </div>
                    <p className="text-zinc-400 text-[14.5px] mt-2">{c.label}</p>
                    <p className="text-zinc-500 text-[13.5px] mt-1">{c.subjects.length} subjects</p>
                    <p className="mt-auto pt-5 text-[14.5px] font-semibold group-hover:text-white transition-colors" style={{ color: GREEN }}>Check a {c.system} grade →</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-zinc-500 text-[13px] leading-relaxed text-center max-w-2xl mx-auto mt-12">
          Beta means the system works today and is still being checked against real students who sit it. If a question ever feels off for your exam, tell us from the Contact page and it gets fixed.
        </p>
      </div>
    </div>
  );
}
