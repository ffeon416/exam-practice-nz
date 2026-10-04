"use client";

// Refer a friend, as a card on the dashboard (/profile). Was its own /refer
// page. The reward is what the server actually does: when a friend pays and
// sits their first marked paper, 14 days are added to this account's
// `student_until` — free days that apply if the subscription ever ends.

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";

interface ReferralStats { referralsCount: number; studentUntil: string | null; pendingReferrals: number }

export default function ReferCard() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [daysBanked, setDaysBanked] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const id = setTimeout(() => setCanShare(typeof navigator !== "undefined" && !!navigator.share), 0);
    fetch("/api/refer/stats").then((r) => (r.ok ? r.json() : null)).then((d: ReferralStats | null) => {
      if (!d) return;
      setStats(d);
      setDaysBanked(d.studentUntil ? Math.max(0, Math.ceil((new Date(d.studentUntil).getTime() - Date.now()) / 864e5)) : 0);
    }).catch(() => {});
    return () => clearTimeout(id);
  }, [isLoaded, user]);

  if (!isLoaded || !user) return null;

  const link = `https://studyace.co/grade?ref=${user.id}`;
  const pending = stats?.pendingReferrals ?? 0;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {
      const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    try { await navigator.share({ title: "StudyAce", text: `See what grade you'd get if you sat your exam today: ${link}` }); } catch { /* cancelled */ }
  };

  return (
    <section id="refer" className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-5 sm:p-7 scroll-mt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Refer a friend</p>
      <h2 className={`${display.className} font-bold text-white text-[24px] sm:text-[28px] leading-tight tracking-[-0.03em] mt-3`}>Give a friend their real grade.</h2>
      <p className="text-zinc-400 text-[14.5px] leading-relaxed mt-2">
        Send your link. When a friend joins Pro and sits their first marked paper, <span className="text-white font-semibold">14 free days</span> are banked on your account, for every friend. Banked days are used if your plan ever ends.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Friends counted</p>
          <p className={`${display.className} font-bold text-white text-[30px] leading-none mt-2`}>{stats ? stats.referralsCount : "–"}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Free days banked</p>
          <p className={`${display.className} font-bold text-white text-[30px] leading-none mt-2`}>{stats ? daysBanked : "–"}</p>
        </div>
      </div>
      {pending > 0 && (
        <p className="text-amber-200 text-[13.5px] rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3 mt-3">
          {pending === 1 ? "1 friend has joined" : `${pending} friends have joined`} but {pending === 1 ? "hasn't" : "haven't"} sat a first paper yet.
        </p>
      )}

      <p className="text-zinc-300 text-[13px] font-mono break-all select-all rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 mt-4">{link}</p>
      <div className="flex gap-3 mt-3">
        <button onClick={copy} className="flex-1 font-bold text-[15px] rounded-full min-h-[52px] text-[#0a0a0f] bg-[#a78bfa] transition-transform hover:scale-[1.02]">{copied ? "Copied" : "Copy link"}</button>
        {canShare && <button onClick={share} className="flex-1 font-semibold text-[15px] rounded-full min-h-[52px] border border-white/[0.14] hover:border-white/40 text-white transition-colors">Share</button>}
      </div>
    </section>
  );
}
