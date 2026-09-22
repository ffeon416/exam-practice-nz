"use client";

// A small calendar of our own. Native <input type="date"> is inconsistent
// (Brave/Safari desktop hide the picker behind a tiny icon; iOS pops a
// wheel), so this renders a month grid with big tap targets and returns an
// ISO date. Weeks start on Monday.

import { useState } from "react";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function DatePicker({ value, min, onChange }: { value: string; min?: string; onChange: (isoDate: string) => void }) {
  const start = value ? new Date(value + "T12:00:00") : new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const monthLabel = first.toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
  const minIso = min ?? iso(new Date());

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
          className="w-10 h-10 rounded-full text-zinc-300 hover:bg-white/[0.06] text-[18px]" aria-label="Previous month">‹</button>
        <p className="text-white font-semibold text-[14px]">{monthLabel}</p>
        <button type="button" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
          className="w-10 h-10 rounded-full text-zinc-300 hover:bg-white/[0.06] text-[18px]" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d) => <span key={d} className="text-center font-mono text-[10px] uppercase tracking-wider text-zinc-500 py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d == null) return <span key={`e${i}`} />;
          const dIso = iso(new Date(view.y, view.m, d));
          const disabled = dIso < minIso;
          const selected = dIso === value;
          return (
            <button key={dIso} type="button" disabled={disabled} onClick={() => onChange(dIso)}
              className={`h-10 rounded-xl text-[13.5px] font-semibold tabular-nums transition-colors ${
                selected ? "bg-white text-[#0a0a0f]"
                : disabled ? "text-zinc-700 cursor-default"
                : "text-zinc-200 hover:bg-indigo-500/20"
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
