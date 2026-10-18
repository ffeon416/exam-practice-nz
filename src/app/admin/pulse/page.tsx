"use client";

// /admin/pulse — the numbers on a phone. One screen: paying customers
// against the goal of 50, grade-check leads, checkouts, visitors, the ad
// funnel step by step (everyone / Meta only), where visitors came from, where
// the grade check loses people, what Google Analytics sees, and what just
// happened. Admin only (the API enforces it). Refreshes itself every minute
// while open. Saved to the home screen it opens straight here: the page
// swaps in its own web-app manifest for that.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";

type Funnel = { sessions: number; opened: number; started: number; leads: number; revealed: number; pricing: number; checkouts: number; paid: number };
type Ga =
  | { configured: false }
  | { configured: true; error: string }
  | { configured: true; activeNow: number; users7d: number; sessions7d: number; users24h: number; sources7d: { source: string; medium: string; sessions: number; users: number }[]; countries7d: { country: string; users: number }[]; pages7d: { path: string; views: number }[] };
type Pulse = {
  paying: number; goal: number; accounts: number;
  leads: { total: number; last24h: number; last7d: number };
  checkouts7d: number; paid30d: number; visitors24h: number; views24h: number;
  days: { date: string; leads: number }[];
  feed: { kind: "paid" | "checkout" | "lead"; at: string; who: string; source: string; detail: string }[];
  tracking: boolean;
  sources7d: { source: string; sessions: number; leads: number; checkouts: number; paid: number }[];
  funnel: { all24h: Funnel; all7d: Funnel; meta24h: Funnel; meta7d: Funnel };
  gradeSteps7d: Record<string, number>;
  ga: Ga;
  at: string;
};

const GREEN = "#3ee6a0", VIOLET = "#8b8cf8", AMBER = "#fbbf24", SKY = "#7dd3fc", ROSE = "#ff6b7a";
const KIND = { paid: { c: GREEN, t: "Paid" }, checkout: { c: AMBER, t: "Started checkout" }, lead: { c: VIOLET, t: "Grade check lead" } } as const;
const FUNNEL_ROWS: { k: keyof Funnel; l: string }[] = [
  { k: "sessions", l: "Visits" },
  { k: "opened", l: "Opened grade check" },
  { k: "started", l: "Started the questions" },
  { k: "leads", l: "Gave their email" },
  { k: "revealed", l: "Saw the grade" },
  { k: "pricing", l: "Tapped pricing" },
  { k: "checkouts", l: "Reached checkout" },
  { k: "paid", l: "Paid" },
];
const STEP_LABEL: Record<string, string> = { name: "Name", country: "Country", system: "Exam system", year: "Year", subject: "Subject", contact: "Email", loading: "Paper built", test: "Questions", revealed: "Result" };
const SOURCE_LABEL: Record<string, string> = { meta: "Meta ad", facebook: "Facebook", instagram: "Instagram", direct: "Direct / typed in", google: "Google", unknown: "Unknown", ai: "ChatGPT / AI" };

function ago(isoStr: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(isoStr).getTime()) / 6e4));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}
const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "—");

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] p-4 mt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Toggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-white/[0.1] p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`rounded-full px-3 min-h-[30px] text-[12px] font-semibold ${value === o.v ? "bg-white text-[#0a0a0f]" : "text-zinc-400"}`}>{o.l}</button>
      ))}
    </div>
  );
}

export default function PulsePage() {
  const [data, setData] = useState<Pulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);
  const [who, setWho] = useState<"meta" | "all">("meta");
  const [span, setSpan] = useState<"24h" | "7d">("7d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pulse", { cache: "no-store" });
      if (res.status === 401) { window.location.href = "/sign-in?redirect_url=/admin/pulse"; return; }
      if (res.status === 403) { setError("This page is for the StudyAce admin account. Sign in with that one."); return; }
      if (!res.ok) { setError("Couldn't load the numbers. Pull down or tap refresh."); return; }
      setData((await res.json()) as Pulse); setError(null);
    } catch { setError("No connection. Tap refresh to try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Home-screen installs should open here, not the student app.
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const old = link?.href;
    if (link) link.href = "/pulse.webmanifest";
    const first = setTimeout(load, 0);
    const iv = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60_000);
    const tick = setInterval(() => setTick((t) => t + 1), 30_000); // keeps "x min ago" fresh
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(first); clearInterval(iv); clearInterval(tick); document.removeEventListener("visibilitychange", onVis); if (link && old) link.href = old; };
  }, [load]);

  const maxLeads = Math.max(1, ...(data?.days.map((d) => d.leads) ?? [1]));
  const funnel = data ? data.funnel[`${who}${span}` as keyof Pulse["funnel"]] : null;
  const maxStep = Math.max(1, ...Object.values(data?.gradeSteps7d ?? { a: 1 }));
  const maxSrc = Math.max(1, ...(data?.sources7d.map((s) => s.sessions) ?? [1]));
  const ga = data?.ga;

  return (
    <div className="min-h-screen bg-[#06060a]" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">StudyAce · Pulse</p>
            <p className="text-zinc-500 text-[12.5px] mt-1">{data ? `Updated ${ago(data.at)}` : "Loading…"}</p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-full border border-white/[0.14] text-white text-[14px] font-semibold px-5 min-h-[44px] disabled:opacity-50">{loading ? "…" : "Refresh"}</button>
        </div>

        {error && <p role="alert" className="text-amber-200 text-[14px] rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3 mt-5">{error}</p>}

        {!data && !error && <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] min-h-[420px] animate-pulse mt-5" />}

        {data && (
          <>
            {/* The number */}
            <div className="relative rounded-[28px] border-2 bg-[#0e0f13] p-7 mt-5 overflow-clip text-center" style={{ borderColor: `${GREEN}66`, backgroundImage: `radial-gradient(80% 90% at 50% 0%, ${GREEN}26 0%, transparent 70%)`, boxShadow: `0 24px 80px -28px ${GREEN}59` }}>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: GREEN }}>Paying customers</p>
              <p className={`${display.className} font-bold text-white text-[112px] leading-[0.9] tracking-[-0.05em] mt-2`}>{data.paying}</p>
              <p className="text-zinc-400 text-[15px] mt-2">of {data.goal} by 12 Sept 2027</p>
              <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden mt-4"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, (data.paying / data.goal) * 100))}%`, background: GREEN, boxShadow: `0 0 16px ${GREEN}` }} /></div>
              <p className="text-zinc-500 text-[12.5px] mt-3">On a paid plan right now. Free passes and test accounts aren&apos;t counted.</p>
            </div>

            {/* Four numbers */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                { e: "Leads today", v: data.leads.last24h, l: `${data.leads.last7d} this week · ${data.leads.total} ever`, c: VIOLET },
                { e: "Visitors today", v: data.visitors24h, l: `${data.views24h} pages viewed`, c: SKY },
                { e: "Checkouts", v: data.checkouts7d, l: "started this week", c: AMBER },
                { e: "Payments", v: data.paid30d, l: "in the last 30 days", c: GREEN },
              ].map((s) => (
                <div key={s.e} className="relative rounded-[22px] border bg-[#0e0f13] p-4 overflow-clip" style={{ borderColor: `${s.c}40`, backgroundImage: `linear-gradient(160deg, ${s.c}1c 0%, transparent 55%)` }}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: s.c }}>{s.e}</p>
                  <p className={`${display.className} font-bold text-white text-[44px] leading-none tracking-[-0.04em] mt-2`}>{s.v}</p>
                  <p className="text-zinc-400 text-[12.5px] mt-1.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* The ad funnel */}
            <Card title={who === "meta" ? "Meta ad · step by step" : "Everyone · step by step"} right={<Toggle value={span} onChange={setSpan} options={[{ v: "24h", l: "24 h" }, { v: "7d", l: "7 days" }]} />}>
              <div className="mt-3"><Toggle value={who} onChange={setWho} options={[{ v: "meta", l: "Meta ad" }, { v: "all", l: "Everyone" }]} /></div>
              {!data.tracking ? (
                <p className="text-zinc-500 text-[13.5px] mt-3 leading-relaxed">No visits recorded yet. Source tracking went live with this deploy, so this fills from the next visitor on.</p>
              ) : funnel && (
                <ul className="mt-3">
                  {FUNNEL_ROWS.map((r, i) => {
                    const v = funnel[r.k];
                    const base = funnel.sessions || funnel.opened;
                    const prev = i === 0 ? v : funnel[FUNNEL_ROWS[i - 1].k];
                    const c = r.k === "paid" ? GREEN : r.k === "checkouts" ? AMBER : r.k === "leads" ? VIOLET : SKY;
                    return (
                      <li key={r.k} className="py-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-zinc-300 text-[13.5px]">{r.l}</span>
                          <span className="text-white text-[15px] font-bold tabular-nums">{v}<span className="text-zinc-500 text-[11.5px] font-medium ml-1.5">{i === 0 ? "" : `${pct(v, prev)} of previous`}</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${base ? Math.max(v ? 2 : 0, (v / base) * 100) : 0}%`, background: c }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {data.tracking && funnel && (
                <p className="text-zinc-600 text-[11.5px] mt-2 leading-relaxed">{who === "meta" ? "A visit counts as the ad when the link carried fbclid or utm_source=meta, and stays with that person for a year, so a lead or payment days later still counts." : "Every browser session, whatever the source."}</p>
              )}
            </Card>

            {/* Where visitors came from */}
            <Card title="Where they came from · 7 days">
              {data.sources7d.length === 0 ? <p className="text-zinc-500 text-[14px] mt-3">Nothing yet.</p> : (
                <ul className="mt-2">
                  {data.sources7d.map((s) => (
                    <li key={s.source} className="py-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-zinc-200 text-[13.5px] font-semibold truncate">{SOURCE_LABEL[s.source] ?? s.source}</span>
                        <span className="text-zinc-400 text-[12px] tabular-nums shrink-0"><b className="text-white text-[14px]">{s.sessions}</b> visits · {s.leads} leads{s.paid ? <span style={{ color: GREEN }}> · {s.paid} paid</span> : ""}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (s.sessions / maxSrc) * 100)}%`, background: META_COLOUR(s.source) }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Grade check drop-off */}
            <Card title="Grade check · who gets how far · 7 days">
              <div className="flex items-end gap-1 h-24 mt-3">
                {Object.entries(data.gradeSteps7d).map(([k, v]) => (
                  <div key={k} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-zinc-300 text-[10.5px] tabular-nums">{v}</span>
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max(3, (v / maxStep) * 72)}px`, background: k === "revealed" ? GREEN : k === "contact" ? VIOLET : SKY }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-1.5">
                {Object.keys(data.gradeSteps7d).map((k) => <span key={k} className="flex-1 text-center text-zinc-600 text-[8.5px] leading-tight truncate">{STEP_LABEL[k] ?? k}</span>)}
              </div>
              <p className="text-zinc-600 text-[11.5px] mt-2">The step after the biggest drop is the one to fix.</p>
            </Card>

            {/* Google Analytics */}
            <Card title="Google Analytics" right={ga && ga.configured && !("error" in ga) ? <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: GREEN }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />live</span> : undefined}>
              {!ga || !ga.configured ? (
                <div className="mt-3">
                  <p className="text-zinc-300 text-[13.5px] leading-relaxed">Not connected yet. The GA tag is on the site and collecting; this card needs read access to show it here. Three env vars on Vercel: <code className="text-zinc-400">GA_PROPERTY_ID</code>, <code className="text-zinc-400">GA_CLIENT_EMAIL</code>, <code className="text-zinc-400">GA_PRIVATE_KEY</code> (a Google service account added to the property as Viewer).</p>
                </div>
              ) : "error" in ga ? (
                <p className="text-amber-200 text-[13.5px] mt-3 leading-relaxed">Connected but Google answered with an error: {ga.error}</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[{ l: "On the site now", v: ga.activeNow, c: GREEN }, { l: "Users · 24 h", v: ga.users24h, c: SKY }, { l: "Users · 7 days", v: ga.users7d, c: VIOLET }].map((s) => (
                      <div key={s.l} className="rounded-2xl border border-white/[0.07] p-3">
                        <p className={`${display.className} font-bold text-white text-[30px] leading-none tracking-[-0.04em]`} style={{ color: s.c }}>{s.v}</p>
                        <p className="text-zinc-500 text-[10.5px] mt-1.5 leading-tight">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-zinc-500 text-[11.5px] mt-3 font-mono uppercase tracking-[0.14em]">Sources · 7 days</p>
                  <ul className="mt-1 divide-y divide-white/[0.05]">
                    {ga.sources7d.map((s) => (
                      <li key={`${s.source}/${s.medium}`} className="flex items-center justify-between py-1.5 text-[13px]"><span className="text-zinc-300 truncate">{s.source} <span className="text-zinc-600">/ {s.medium}</span></span><span className="text-white font-semibold tabular-nums shrink-0">{s.sessions}</span></li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-zinc-500 text-[11.5px] font-mono uppercase tracking-[0.14em]">Countries</p>
                      <ul className="mt-1">{ga.countries7d.map((c) => <li key={c.country} className="flex justify-between py-1 text-[12.5px]"><span className="text-zinc-300 truncate">{c.country}</span><span className="text-white tabular-nums">{c.users}</span></li>)}</ul>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-[11.5px] font-mono uppercase tracking-[0.14em]">Pages</p>
                      <ul className="mt-1">{ga.pages7d.map((p) => <li key={p.path} className="flex justify-between gap-2 py-1 text-[12.5px]"><span className="text-zinc-300 truncate">{p.path}</span><span className="text-white tabular-nums">{p.views}</span></li>)}</ul>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Leads, last 14 days */}
            <Card title="Leads · last 14 days">
              <div className="flex items-end gap-1.5 h-20 mt-3">
                {data.days.map((d) => (
                  <div key={d.date} className="flex-1 rounded-t-md" title={`${d.date}: ${d.leads}`} style={{ height: `${Math.max(4, (d.leads / maxLeads) * 100)}%`, background: d.leads ? VIOLET : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
              <div className="flex justify-between text-zinc-600 text-[11px] mt-1.5"><span>2 weeks ago</span><span>today</span></div>
            </Card>

            {/* What just happened */}
            <Card title="Latest">
              {data.feed.length === 0 ? <p className="text-zinc-500 text-[14px] mt-3">Nothing in the last 30 days yet.</p> : (
                <ul className="mt-2 divide-y divide-white/[0.06]">
                  {data.feed.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: KIND[f.kind].c, boxShadow: `0 0 10px ${KIND[f.kind].c}` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-white text-[14.5px] font-semibold truncate">{KIND[f.kind].t}{f.who ? ` · ${f.who}` : ""}</span>
                        <span className="block text-zinc-500 text-[12.5px] truncate">{[f.source !== "unknown" && `via ${SOURCE_LABEL[f.source] ?? f.source}`, f.detail].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-zinc-500 text-[12px] shrink-0">{ago(f.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <p className="text-zinc-600 text-[12px] text-center mt-5">{data.accounts} accounts in total · <Link href="/admin" className="underline underline-offset-4">Full admin →</Link></p>
          </>
        )}
      </div>
    </div>
  );
}

function META_COLOUR(source: string): string {
  if (["meta", "facebook", "instagram", "fb", "ig"].includes(source)) return ROSE;
  if (source === "google") return AMBER;
  if (source === "direct") return SKY;
  return VIOLET;
}
