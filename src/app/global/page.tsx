"use client";

import { useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { CURRICULA, COMING_CURRICULA, EARLY_ACCESS_CURRICULA, type Curriculum } from "@/data/curricula";

// StudyAce Global — public waitlist for not-yet-launched exam systems.
// Visitors from AU/UK/US/CA land here (linked from the homepage) and leave
// an email against the system they want. Signups land in the `events` table
// and double as our validator-recruitment pool for each market.

function WaitlistCard({ curriculum }: { curriculum: Curriculum }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), curriculum: curriculum.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus("done");
      } else {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl" aria-hidden>{curriculum.flag}</span>
        <div>
          <h3 className="text-white font-extrabold text-[15px] leading-tight">
            {curriculum.system}
            <span className="text-zinc-500 font-medium"> · {curriculum.countryLabel}</span>
          </h3>
          <p className="text-zinc-500 text-[12px]">{curriculum.label}</p>
        </div>
      </div>
      <p className="text-zinc-400 text-[13px] mb-4">{curriculum.blurb}</p>

      {status === "done" ? (
        <div className="mt-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-emerald-400 text-[13px] font-semibold">
          You&apos;re on the list — we&apos;ll email you the moment {curriculum.system} opens.
        </div>
      ) : (
        <form onSubmit={join} className="mt-auto">
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-60"
            >
              {status === "loading" ? "…" : "Join waitlist"}
            </button>
          </div>
          {status === "error" && (
            <p className="mt-2 text-rose-400 text-[12px]">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}

export default function GlobalPage() {
  const liveCount = CURRICULA.length - COMING_CURRICULA.length;
  void liveCount;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-12 sm:pt-20 pb-20">
        <div className="text-center mb-10">
          <h1 className={`${display.className} home-rise text-[36px] sm:text-[52px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-4`}
            style={{ textWrap: "balance" }}>
            StudyAce is{" "}
            <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent pr-1">
              going global.
            </em>
          </h1>
          <p className="home-rise text-zinc-400 text-[15px] sm:text-[17px] max-w-xl mx-auto"
            style={{ animationDelay: "80ms" }}>
            Unlimited AI practice exams, marked honestly — live in New Zealand today,
            and coming to your exam system next. Join your waitlist and you&apos;ll be
            first in (and first to help shape it).
          </p>
        </div>

        {/* Live now */}
        <div className="rounded-2xl bg-white/[0.015] border border-emerald-500/20 p-5 mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🇳🇿</span>
            <div>
              <h3 className="text-white font-extrabold text-[15px]">
                NCEA · New Zealand
                <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  Live now
                </span>
              </h3>
              <p className="text-zinc-500 text-[12px]">Levels 1–3 + Year 10 · 19 subjects</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white text-[#0a0a0f] px-5 py-2.5 text-[13px] font-bold transition-all hover:scale-[1.02] shadow-2xl shadow-indigo-500/20"
          >
            Start practising free
          </Link>
        </div>

        {/* Early access — usable today */}
        <h2 className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider mb-3">
          Early access — try it today
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {EARLY_ACCESS_CURRICULA.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white/[0.015] border border-amber-500/20 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl" aria-hidden>{c.flag}</span>
                <div>
                  <h3 className="text-white font-extrabold text-[15px] leading-tight">
                    {c.system}
                    <span className="text-zinc-500 font-medium"> · {c.countryLabel}</span>
                    <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                      Beta
                    </span>
                  </h3>
                  <p className="text-zinc-500 text-[12px]">{c.label}</p>
                </div>
              </div>
              <p className="text-zinc-400 text-[13px] mb-4">{c.blurb}</p>
              <Link
                href={`/subjects?curriculum=${c.id}`}
                className="mt-auto inline-flex justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]"
              >
                Try {c.system} practice →
              </Link>
            </div>
          ))}
        </div>

        {/* Coming soon grid — hidden while every defined system is usable */}
        {COMING_CURRICULA.length > 0 && (
          <>
            <h2 className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider mb-3">
              Coming next — join your waitlist
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {COMING_CURRICULA.map((c) => (
                <WaitlistCard key={c.id} curriculum={c} />
              ))}
            </div>
          </>
        )}

        <p className="text-zinc-600 text-[12px] text-center mt-10">
          Your email is only used to tell you when your system launches — nothing else.
        </p>
      </div>
    </div>
  );
}
