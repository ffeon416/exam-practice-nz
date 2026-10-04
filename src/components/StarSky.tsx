"use client";

// /streak — the galaxy. One star a night; stars fill a constellation; a
// finished constellation is named, flies into the galaxy and the next one
// starts. Rules live in src/lib/galaxy.ts. Animation is CSS only (transform
// and opacity), and every class is switched off under reduced motion.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { localDateKey, msUntilLocalMidnight } from "@/lib/dailyTask";
import { scopedKey } from "@/lib/userScope";
import { computeGalaxy, constellationAt, type ConstellationDef } from "@/lib/galaxy";

const STEP = 90; // ms between stars as the sky arrives
const STORE = "studyace-galaxy";
type Saved = { names: Record<string, string>; ack: number; starSeen: string; lostSeen: string };
const EMPTY: Saved = { names: {}, ack: 0, starSeen: "", lostSeen: "" };

function loadSaved(): Saved {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(scopedKey(STORE)) || "{}") as Partial<Saved>) }; } catch { return EMPTY; }
}
function writeSaved(s: Saved) { try { localStorage.setItem(scopedKey(STORE), JSON.stringify(s)); } catch { /* storage blocked */ } }

// Background stars: fixed positions (no Math.random → same on server and client).
const DUST = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin((i + 1) * n) * 43758.5453; return x - Math.floor(x); };
  return { left: r(12.9898) * 100, top: r(78.233) * 100, size: r(37.719) > 0.82 ? 2.5 : 1.5, o: 0.18 + r(4.581) * 0.5, tw: r(9.17) > 0.86 };
});

export function Constellation({
  def, lit, tonight = null, arrive = false, ignite = null, fading = 0, small = false, complete = false,
}: {
  def: ConstellationDef;
  lit: number;
  tonight?: number | null;
  /** Stars pop on and lines draw, one after another. */
  arrive?: boolean;
  /** This star was lit tonight: it flashes and its line draws last. */
  ignite?: number | null;
  /** This many stars just went dark: they fade out, last one first. */
  fading?: number;
  small?: boolean;
  complete?: boolean;
}) {
  const c = def.color;
  const pts = (idx: number[]) => idx.map((i) => def.stars[i].join(",")).join(" ");
  const delay = (i: number) => (arrive ? `${(i === ignite ? lit + 3 : i) * STEP}ms` : undefined);
  const sw = small ? 5 : 2;
  return (
    <svg viewBox="-30 -10 600 700" className={small ? "w-full h-auto" : "w-full h-auto max-h-[640px]"} role="img" aria-label={`${def.name}: ${lit} of ${def.stars.length} stars lit`}>
      {complete && def.fill && <polygon points={pts(def.fill)} fill={c} fillOpacity="0.1" className={small ? undefined : "sa-glow-pulse"} />}
      {/* the whole shape, faint */}
      {def.edges.map(([a, b]) => (
        <line key={`o${a}-${b}`} x1={def.stars[a][0]} y1={def.stars[a][1]} x2={def.stars[b][0]} y2={def.stars[b][1]} stroke="#4a4763" strokeWidth={small ? 3 : 1.5} strokeDasharray={small ? "3 12" : "1.5 7"} strokeLinecap="round" />
      ))}
      {/* lit lines */}
      {def.edges.filter(([a, b]) => Math.max(a, b) < lit).map(([a, b]) => {
        const last = Math.max(a, b);
        return (
          <line key={`l${a}-${b}`} x1={def.stars[a][0]} y1={def.stars[a][1]} x2={def.stars[b][0]} y2={def.stars[b][1]} pathLength={1} stroke={c} strokeWidth={sw} strokeLinecap="round"
            className={arrive ? "sa-draw" : undefined}
            style={{ filter: small ? undefined : `drop-shadow(0 0 6px ${c}99)`, animationDelay: delay(last), animationDuration: last === ignite ? "0.8s" : arrive ? "0.45s" : undefined }} />
        );
      })}
      {/* the lines to tonight's star */}
      {tonight != null && def.edges.filter(([a, b]) => Math.max(a, b) === tonight && Math.min(a, b) < lit).map(([a, b]) => (
        <line key={`t${a}-${b}`} x1={def.stars[a][0]} y1={def.stars[a][1]} x2={def.stars[b][0]} y2={def.stars[b][1]} stroke={c} strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" className="sa-dash-flow" />
      ))}
      {def.stars.map(([x, y], i) => {
        if (i < lit) return (
          <g key={i} className={arrive ? (i === ignite ? "sa-star sa-ignite" : "sa-star sa-star-pop") : undefined} style={{ animationDelay: delay(i) }}>
            {i === ignite && <circle cx={x} cy={y} r="18" fill="none" stroke="#ffffff" strokeWidth="2" className="sa-star sa-ripple" style={{ animationDelay: delay(i) }} />}
            <circle cx={x} cy={y} r={small ? 20 : 17} fill={c} opacity="0.28" />
            <circle cx={x} cy={y} r={small ? 9 : 6.5} fill="#ffffff" style={small ? undefined : { filter: "drop-shadow(0 0 8px #ffffff)" }} />
          </g>
        );
        if (i < fading) return (
          <g key={i} className="sa-star sa-star-fade" style={{ animationDelay: `${(fading - 1 - i) * 140}ms` }}>
            <circle cx={x} cy={y} r="17" fill={c} opacity="0.28" />
            <circle cx={x} cy={y} r="6.5" fill="#ffffff" />
          </g>
        );
        if (i === tonight && !small) return (
          <g key={i}>
            <circle cx={x} cy={y} r="22" fill="none" stroke={c} strokeWidth="2" opacity="0.6" className="sa-pulse-ring" />
            <circle cx={x} cy={y} r="22" fill="#0b0a16" stroke={c} strokeWidth="1.5" />
            <circle cx={x} cy={y} r="6" fill={c} />
            <text x={x > 400 ? x - 34 : x + 34} y={y + 4} textAnchor={x > 400 ? "end" : "start"} fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="2.5" fontWeight="700" fill={c}>TONIGHT</text>
          </g>
        );
        return <circle key={i} cx={x} cy={y} r={small ? 7 : 4} fill="#4a4763" />;
      })}
    </svg>
  );
}

function useNow() {
  const [now, setNow] = useState<{ ms: number; today: string } | null>(null);
  useEffect(() => {
    const tick = () => setNow({ ms: msUntilLocalMidnight(), today: localDateKey() });
    const id = setTimeout(tick, 0); const iv = setInterval(tick, 20_000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  return now;
}

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

export default function StarSky({ attemptDates, preview = false }: { attemptDates: string[]; /** Preview (?demo=N): nothing is read from or saved to this device. */ preview?: boolean }) {
  const now = useNow();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [draft, setDraft] = useState("");
  const [flying, setFlying] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [shown, setShown] = useState<number | null>(null); // the count-up number

  useEffect(() => { const id = setTimeout(() => setSaved(preview ? EMPTY : loadSaved()), 0); return () => clearTimeout(id); }, [preview]);
  const save = (patch: Partial<Saved>) => setSaved((s) => { const n = { ...(s ?? EMPTY), ...patch }; if (!preview) writeSaved(n); return n; });

  const today = now?.today ?? "";
  const g = computeGalaxy(attemptDates, today || "0000-00-00", preview ? "0000-00-00" : undefined);
  const ready = !!now && !!saved;

  // A constellation finished since the student last looked: show it, name it.
  const finishing = ready && viewing == null && g.completed.length > saved.ack ? g.completed[saved.ack] : null;
  // Tonight's star was lit and this is the first look at it.
  const igniting = ready && !finishing && g.doneToday && g.lit > 0 && saved.starSeen !== today;
  // Last night was missed and the stars are going dark, shown once.
  const fading = ready && !finishing && g.lostLastNight > 0 && saved.lostSeen !== today ? g.lostLastNight : 0;

  // The headline number counts up as tonight's star lights; then both one-off
  // moments are marked as seen so they don't replay.
  useEffect(() => {
    if (!ready) return;
    if (igniting) {
      const a = setTimeout(() => setShown(g.lit - 1), 0);
      const b = setTimeout(() => setShown(g.lit), (g.lit + 3) * STEP + 500);
      const c = setTimeout(() => save({ starSeen: today }), (g.lit + 3) * STEP + 2500);
      return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
    }
    if (fading) { const c = setTimeout(() => save({ lostSeen: today }), 2500); return () => clearTimeout(c); }
  }, [ready, igniting, fading, g.lit, today]);

  if (!ready) return <div className="rounded-[28px] border border-white/[0.08] bg-[#05050b] min-h-[560px] animate-pulse" />;

  const ms = now.ms;
  const urgent = !g.doneToday && ms < 3 * 3.6e6;
  const till = `${Math.floor(ms / 3.6e6)}h ${String(Math.floor((ms % 3.6e6) / 6e4)).padStart(2, "0")}m till midnight`;
  const dateLine = new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  // Which constellation is on screen, and in what state.
  const viewed = viewing != null ? g.completed.find((x) => x.ordinal === viewing) ?? null : null;
  const onScreen = viewed ?? finishing;
  const def = constellationAt(onScreen ? onScreen.ordinal : g.ordinal);
  const size = def.stars.length;
  const full = !!onScreen;
  const lit = full ? size : g.lit;
  const tonight = !full && !g.doneToday ? g.lit : null;
  const nameOf = (ordinal: number) => saved.names[String(ordinal)] || constellationAt(ordinal).title;
  const accent = urgent && !full ? "#ff6b7a" : def.color;
  const count = shown != null && igniting ? shown : lit;

  const finishName = (skip: boolean) => {
    if (!finishing) return;
    const v = draft.trim().slice(0, 32);
    if (!skip && !v) return;
    setFlying(true);
    setTimeout(() => {
      save({ names: skip ? saved.names : { ...saved.names, [String(finishing.ordinal)]: v }, ack: saved.ack + 1, starSeen: today });
      setDraft(""); setFlying(false);
    }, 950);
  };

  const headline = viewed ? nameOf(viewed.ordinal)
    : finishing ? `${def.title} is lit.`
    : lit === 0 ? (g.doneToday ? `Next: ${def.title}.` : fading ? "It went dark." : "No stars lit yet.")
    : `${count} star${count === 1 ? "" : "s"} lit.`;

  const body = viewed ? `Finished ${fmtDate(viewed.date)}. ${size} nights in a row. It stays in your galaxy for good.`
    : finishing ? `${size} nights in a row. This one is yours to name, and it stays in your galaxy for good.`
    : fading ? `Last night was missed, so ${fading} star${fading === 1 ? "" : "s"} went dark. Your finished constellations are safe. Start this one again tonight.`
    : lit === 0 && g.doneToday ? `A new constellation. Its first star lights tomorrow night.`
    : `Light one star every night. Finish all ${size} and ${def.name} is yours to name.`;

  const slots = Math.max(8, g.ordinal + 3);

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5 sm:mb-6">
        <div>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-zinc-500">Streak · {dateLine}{preview ? " · preview, not your real streak" : ""}</p>
          <h1 className={`${display.className} font-bold text-white text-[34px] sm:text-[44px] leading-none tracking-[-0.04em] mt-2`}>Light up {constellationAt(g.ordinal).name}</h1>
        </div>
        <span className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.18em]" style={{ color: urgent ? "#ff6b7a" : def.color, background: `${urgent ? "#ff6b7a" : def.color}1f` }}>
          <span className={`w-2 h-2 rounded-full ${g.doneToday ? "" : "animate-pulse"}`} style={{ background: urgent ? "#ff6b7a" : def.color }} />{till}
        </span>
      </div>

      {/* The sky */}
      <div className="relative rounded-[28px] border border-white/[0.08] bg-[#05050b] overflow-clip">
        <div className="absolute inset-0 pointer-events-none sa-sky-drift" aria-hidden>
          {DUST.map((d, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, opacity: d.o, animation: d.tw ? `sa-ace-twinkle ${3 + (i % 4)}s ease-in-out ${i % 5}s infinite` : undefined }} />
          ))}
        </div>
        {finishing && !flying && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            {[8, 22, 37, 55, 68, 84].map((l, i) => <span key={l} className="sa-shoot absolute h-px w-24 rounded-full" style={{ left: `${l}%`, top: `${6 + (i % 3) * 9}%`, background: `linear-gradient(90deg, transparent, #fff)`, animationDelay: `${300 + i * 260}ms` }} />)}
          </div>
        )}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-4 p-6 sm:p-10 lg:p-14 lg:min-h-[640px]">
          <div key={`${def.id}-${full}`} className="home-rise">
            <p className="font-mono font-bold text-[12px] sm:text-[13px] uppercase tracking-[0.24em]" style={{ color: accent }}>
              {viewed ? "In your galaxy" : finishing ? "Constellation complete" : `Night ${Math.max(1, lit)} of ${size}`}
            </p>
            <h2 className={`${display.className} font-bold text-white text-[48px] sm:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.05em] mt-4`}>{headline}</h2>
            <p className="text-zinc-300 text-[17px] sm:text-[20px] leading-relaxed mt-6 max-w-md">{body}</p>
            {!full && !fading && <p className="text-zinc-500 text-[15px] mt-5">Miss a night and this one goes dark. Finished ones never do.</p>}

            {viewed ? (
              <button onClick={() => setViewing(null)} className="inline-flex items-center font-bold text-[18px] px-8 rounded-full min-h-[60px] mt-7 text-[#0a0a0f] bg-white transition-transform hover:scale-[1.03]">← Back to tonight</button>
            ) : finishing ? (
              <div className="mt-7">
                <div className="flex flex-wrap gap-3">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") finishName(false); }} maxLength={32} placeholder="Name your constellation" aria-label="Name your constellation" enterKeyHint="done"
                    className="rounded-full bg-white/[0.06] border border-white/[0.14] focus:border-white/40 outline-none text-white text-[17px] px-6 min-h-[60px] w-full max-w-[300px]" />
                  <button onClick={() => finishName(false)} className="font-bold text-[18px] px-8 rounded-full min-h-[60px] text-[#0a0a0f] transition-transform hover:scale-[1.03]" style={{ background: def.color, boxShadow: `0 0 40px ${def.color}55` }}>Name it →</button>
                </div>
                <button onClick={() => finishName(true)} className="text-zinc-500 hover:text-white text-[14px] min-h-[44px] mt-1">Keep it as {def.title}</button>
              </div>
            ) : (
              <Link href="/schedule" className="inline-flex items-center font-bold text-[18px] sm:text-[19px] px-8 sm:px-9 rounded-full min-h-[60px] mt-7 text-[#0a0a0f] transition-transform hover:scale-[1.03]" style={{ background: g.doneToday ? "#ffffff" : accent, boxShadow: g.doneToday ? undefined : `0 0 40px ${accent}55` }}>
                {g.doneToday ? "Tonight's star is lit. See tomorrow →" : urgent ? "Light it before midnight →" : "Light tonight's star →"}
              </Link>
            )}
          </div>
          <div className="lg:pl-8">
            <div key={`${def.id}-${def.lap}-${full}`} className={flying ? "sa-fly" : full ? "sa-zoom-in" : undefined}>
              <Constellation def={def} lit={lit} tonight={tonight} arrive ignite={igniting ? g.lit - 1 : null} fading={fading} complete={full} />
            </div>
          </div>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-4 sm:gap-5 mt-4 sm:mt-5">
        {[
          { v: g.totalNights, l: "stars lit, ever" },
          { v: g.completed.length, l: g.completed.length === 1 ? "constellation finished" : "constellations finished" },
          { v: g.bestRun, l: "nights, longest run" },
        ].map((s) => (
          <div key={s.l} className="rounded-[24px] border border-white/[0.08] bg-[#0e0f13] p-5 sm:p-6">
            <p className={`${display.className} font-bold text-white text-[30px] sm:text-[38px] leading-none tracking-[-0.03em]`}>{s.v}</p>
            <p className="text-zinc-400 text-[13.5px] mt-2">{s.l}</p>
          </div>
        ))}
      </div>

      {/* The galaxy */}
      <div className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-5 sm:p-7 mt-4 sm:mt-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Your galaxy</p>
          <span className="text-zinc-500 text-[12.5px]">{g.completed.length > 0 ? "Tap a finished one to see it" : "Finished constellations live here"}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: slots }, (_, o) => {
            const d = constellationAt(o);
            // A finished one joins the galaxy once it has been named (or kept).
            const finished = g.completed.find((x) => x.ordinal === o) ?? null;
            const done = finished && o < saved.ack + (flying ? 1 : 0) ? finished : null;
            const current = o === g.ordinal || (!!finished && !done);
            const inner = (
              <>
                <Constellation def={d} lit={finished ? d.stars.length : o === g.ordinal ? g.lit : 0} small complete={!!done} />
                <p className={`text-[13px] font-semibold truncate mt-2 ${done ? "text-white" : current ? "text-zinc-200" : "text-zinc-600"}`}>{done ? nameOf(o) : d.title}</p>
                <p className="text-[11.5px] truncate" style={{ color: done ? d.color : undefined }}>
                  {done ? fmtDate(done.date) : o === g.ordinal ? <span className="text-zinc-400">{g.lit} of {d.stars.length}</span> : <span className="text-zinc-600">{d.stars.length} stars</span>}
                </p>
              </>
            );
            const cls = `rounded-2xl border p-3 text-left ${done ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white/[0.012]"} ${o === (viewing ?? g.ordinal) ? "border-white/30" : "border-white/[0.06]"}`;
            return done
              ? <button key={o} onClick={() => { setViewing(o); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`${cls} ${flying && o === saved.ack ? "sa-land" : ""} transition-colors`}>{inner}</button>
              : <div key={o} className={cls}>{inner}</div>;
          })}
        </div>
      </div>
    </>
  );
}
