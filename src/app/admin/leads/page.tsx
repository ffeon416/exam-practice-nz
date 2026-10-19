"use client";

// /admin/leads — every email typed into the grade check, newest first, on a
// phone. Tap an email to write to them. Admin only (the API enforces it).

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";

type Lead = { at: string; email: string; name: string; subject: string; curriculum: string; grade: string; pct: number | null; source: string; campaign: string; kind: "parent" | "student"; teen: string; current: string; goal: string };

const SOURCE_LABEL: Record<string, string> = { meta: "Meta ad", facebook: "Facebook", instagram: "Instagram", direct: "Direct", google: "Google", unknown: "Unknown source", ai: "ChatGPT / AI" };
const title = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function when(isoStr: string): string {
  const d = new Date(isoStr);
  const m = Math.round((Date.now() - d.getTime()) / 6e4);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/leads", { cache: "no-store" });
        if (res.status === 401) { window.location.href = "/sign-in?redirect_url=/admin/leads"; return; }
        if (!res.ok) { setError(res.status === 403 ? "This page is for the StudyAce admin account." : "Couldn't load the leads."); return; }
        setLeads(((await res.json()) as { leads: Lead[] }).leads);
      } catch { setError("No connection."); }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#06060a]" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="max-w-md mx-auto px-4 pt-6 pb-12">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/admin/pulse" className="text-zinc-500 text-[12.5px]">← Pulse</Link>
            <h1 className={`${display.className} text-white font-bold text-[30px] tracking-[-0.03em] leading-tight mt-1`}>Leads</h1>
            <p className="text-zinc-500 text-[12.5px] mt-0.5">{leads ? `${leads.length} emails · ${leads.filter((l) => l.kind === "parent").length} parents from the parent check, ${leads.filter((l) => l.kind === "student").length} from the grade check` : "Loading…"}</p>
          </div>
          <a href="/api/admin/leads?format=csv" className="rounded-full border border-white/[0.14] text-white text-[13px] font-semibold px-4 min-h-[40px] inline-flex items-center shrink-0">Download CSV</a>
        </div>

        {error && <p role="alert" className="text-amber-200 text-[14px] rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 px-4 py-3 mt-5">{error}</p>}
        {!leads && !error && <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.015] min-h-[300px] animate-pulse mt-5" />}

        {leads && leads.length === 0 && <p className="text-zinc-500 text-[14.5px] mt-6">No leads yet. The first email typed into the grade check shows up here.</p>}

        {leads && leads.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {leads.map((l) => (
              <li key={l.email} className="rounded-[20px] border border-white/[0.08] bg-[#0e0f13] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-[15.5px] font-bold truncate">{l.name || "No name"}{l.kind === "parent" && <span className="ml-2 align-middle rounded-full bg-[#ff6b7a]/15 text-[#ff6b7a] text-[10.5px] font-bold px-2 py-0.5 tracking-wide">PARENT{l.teen ? ` of ${l.teen}` : ""}</span>}</p>
                    <a href={`mailto:${l.email}`} className="block text-[#8b8cf8] text-[14px] truncate underline-offset-4 hover:underline">{l.email}</a>
                  </div>
                  {l.grade && <span className={`${display.className} shrink-0 rounded-full border border-white/[0.1] px-3 py-1 text-white text-[15px] font-bold`}>{l.grade}{l.pct != null ? <span className="text-zinc-500 text-[11px] font-medium ml-1">{l.pct}%</span> : null}</span>}
                </div>
                <p className="text-zinc-400 text-[12.5px] mt-2">
                  {[l.subject && title(l.subject), l.curriculum && l.curriculum.toUpperCase().replace("-", " "), l.kind === "parent" && l.current && l.goal && `${l.current} now → wants ${l.goal}`, l.kind === "student" && !l.grade && "didn't finish the questions"].filter(Boolean).join(" · ")}
                </p>
                <p className="text-zinc-600 text-[12px] mt-1">{when(l.at)} · via {SOURCE_LABEL[l.source] ?? l.source}{l.campaign ? ` (${l.campaign})` : ""}</p>
              </li>
            ))}
          </ul>
        )}

        <p className="text-zinc-600 text-[12px] mt-8 leading-relaxed">Stored in the Supabase <code>events</code> table as <code>diagnostic_lead</code> rows (email, name, subject, grade, source). Each lead also received their grade report by email from grades@studyace.co.</p>
      </div>
    </div>
  );
}
