"use client";

// /admin/pulse — the numbers on a phone. One screen: paying customers
// against the goal of 50, grade-check leads, checkouts, visitors, and what
// just happened. Admin only (the API enforces it). Refreshes itself every
// minute while open. Saved to the home screen it opens straight here: the
// page swaps in its own web-app manifest for that.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";

type Pulse = {
  paying: number; goal: number; accounts: number;
  leads: { total: number; last24h: number; last7d: number };
  checkouts7d: number; paid30d: number; visitors24h: number; views24h: number;
  days: { date: string; leads: number }[];
  feed: { kind: "paid" | "checkout" | "lead"; at: string; who: string; detail: string }[];
  at: string;
};

const GREEN = "#3ee6a0", VIOLET = "#8b8cf8", AMBER = "#fbbf24", SKY = "#7dd3fc";
const KIND = { paid: { c: GREEN, t: "Paid" }, checkout: { c: AMBER, t: "Started checkout" }, lead: { c: VIOLET, t: "Grade check lead" } } as const;

function ago(isoStr: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(isoStr).getTime()) / 6e4));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

export default function PulsePage() {
  const [data, setData] = useState<Pulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

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

            {/* Leads, last 14 days */}
            <div className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] p-4 mt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Leads · last 14 days</p>
              <div className="flex items-end gap-1.5 h-20 mt-3">
                {data.days.map((d) => (
                  <div key={d.date} className="flex-1 rounded-t-md" title={`${d.date}: ${d.leads}`} style={{ height: `${Math.max(4, (d.leads / maxLeads) * 100)}%`, background: d.leads ? VIOLET : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
              <div className="flex justify-between text-zinc-600 text-[11px] mt-1.5"><span>2 weeks ago</span><span>today</span></div>
            </div>

            {/* What just happened */}
            <div className="rounded-[22px] border border-white/[0.08] bg-[#0e0f13] p-4 mt-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Latest</p>
              {data.feed.length === 0 ? <p className="text-zinc-500 text-[14px] mt-3">Nothing in the last 30 days yet.</p> : (
                <ul className="mt-2 divide-y divide-white/[0.06]">
                  {data.feed.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: KIND[f.kind].c, boxShadow: `0 0 10px ${KIND[f.kind].c}` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-white text-[14.5px] font-semibold truncate">{KIND[f.kind].t}{f.who ? ` · ${f.who}` : ""}</span>
                        {f.detail && <span className="block text-zinc-500 text-[12.5px] truncate">{f.detail}</span>}
                      </span>
                      <span className="text-zinc-500 text-[12px] shrink-0">{ago(f.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-zinc-600 text-[12px] text-center mt-5">{data.accounts} accounts in total · <Link href="/admin" className="underline underline-offset-4">Full admin →</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
