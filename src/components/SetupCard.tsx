"use client";

// "Your setup" on the dashboard (/profile): what the site is currently built
// around (exam system, year, subject, goal, exam date) and one button to go
// through the questions again. Re-running them never touches billing; it
// rebuilds the schedule from day 1 with a fresh grade check.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { loadOnboarding } from "@/lib/onboarding";
import { goalFor, loadGoals, syncGoals } from "@/lib/goals";
import { resolveCurriculum, LETTER_BANDS } from "@/data/curricula";
import { setScopeUserId } from "@/lib/userScope";
import { examDue } from "@/components/ExamGate";

type Row = { k: string; v: string };

export default function SetupCard() {
  const { user, isLoaded } = useUser();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [due, setDue] = useState(false); // exam day reached → the card glows

  useEffect(() => {
    if (!isLoaded || !user) return;
    setScopeUserId(user.id);
    let cancelled = false;
    const build = (goals: ReturnType<typeof loadGoals>) => {
      const ob = loadOnboarding();
      if (!ob || ob.subjects.length === 0) { setRows([]); return; }
      const c = resolveCurriculum(ob.curriculumId);
      const subject = ob.subjects[0];
      const g = goalFor(goals, subject);
      setDue(examDue(ob.subjects, goals));
      setRows([
        { k: "Exam system", v: `${c.system} · ${c.levels.find((l) => l.value === ob.yearLevel)?.label ?? `Year ${ob.yearLevel}`}` },
        { k: "Subject", v: c.subjects.find((s) => s.value === subject)?.label ?? subject },
        { k: "Goal grade", v: g ? LETTER_BANDS.find((b) => b.id === g.goal)?.label ?? "Not set" : "Not set" },
        { k: "Exam date", v: g?.examDate ? new Date(g.examDate + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Not set" },
      ]);
    };
    const id = setTimeout(() => {
      build(loadGoals());
      syncGoals().then((g) => { if (!cancelled) build(g); }).catch(() => {});
    }, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [isLoaded, user]);

  if (!rows) return <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] min-h-[220px] animate-pulse" />;
  const empty = rows.length === 0;

  return (
    <section id="setup" className={`rounded-[28px] border bg-[#0e0f13] p-5 sm:p-7 scroll-mt-6 ${due ? "sa-attn border-indigo-400/70" : "border-indigo-400/25"}`} style={{ backgroundImage: "linear-gradient(160deg, rgba(139,140,248,0.10) 0%, transparent 55%)" }}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Your setup</p>
      <h2 className={`${display.className} font-bold text-white text-[24px] sm:text-[28px] leading-tight tracking-[-0.03em] mt-3`}>{empty ? "Not set up on this device yet." : due ? "That exam's here. Set your next one." : "What your schedule is built around."}</h2>
      {!empty && (
        <dl className="mt-4 divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-zinc-400 text-[14px]">{r.k}</dt>
              <dd className="text-white text-[15px] font-semibold text-right">{r.v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Link href="/welcome?next=1" className="mt-5 flex items-center justify-center font-bold text-[16px] rounded-full min-h-[52px] text-[#0a0a0f] bg-[#8b8cf8] transition-transform hover:scale-[1.02]">
        {empty ? "Answer the questions →" : due ? "Set my next exam →" : "Change my setup →"}
      </Link>
      <p className="text-zinc-500 text-[13px] leading-relaxed mt-3">
        Wrong subject, wrong date, changed your goal? Go through the questions again. It takes a minute and costs nothing; your plan and payment stay exactly as they are. Your schedule restarts at day 1 with a fresh grade check, and your past papers are kept.
      </p>
    </section>
  );
}
