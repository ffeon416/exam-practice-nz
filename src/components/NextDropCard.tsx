"use client";

// Top of the right column: the clock to midnight, the student's own time.
// Before today's paper is done it's the time left on it; after, it's the
// wait until tomorrow's drops, built and ready.

import { useEffect, useState } from "react";
import { display } from "@/lib/displayFont";
import { msUntilLocalMidnight } from "@/lib/dailyTask";

function useMidnightClock() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilLocalMidnight());
    const id = setTimeout(tick, 0); const iv = setInterval(tick, 1000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  return ms;
}

export default function NextDropCard({ done }: { done: boolean }) {
  const ms = useMidnightClock();
  const h = ms == null ? null : Math.floor(ms / 3.6e6), m = ms == null ? null : Math.floor((ms % 3.6e6) / 6e4), s = ms == null ? null : Math.floor((ms % 6e4) / 1000);
  const pad = (n: number | null) => (n == null ? "--" : String(n).padStart(2, "0"));
  const urgent = !done && ms != null && ms < 3 * 3.6e6;
  const accent = done ? "#3ee6a0" : urgent ? "#ff6b7a" : "#e8c46a";

  return (
    <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
      <div className="bg-[#0e0f13] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: accent }}>
          {done ? "Tomorrow's task drops in" : "Time left on today's task"}
        </p>
        <p className={`${display.className} font-bold leading-none tracking-[-0.04em] text-white mt-2 tabular-nums`}>
          <span className="text-[56px]">{pad(h)}</span><span className="text-[28px] text-zinc-500 mx-0.5">:</span>
          <span className="text-[56px]">{pad(m)}</span><span className="text-[28px] text-zinc-500 mx-0.5">:</span>
          <span className="text-[56px]">{pad(s)}</span>
        </p>
        <div className="flex gap-6 font-mono text-[9.5px] uppercase tracking-[0.2em] text-zinc-600 mt-1 pl-1">
          <span className="w-[72px]">hours</span><span className="w-[72px]">mins</span><span>secs</span>
        </div>
        <p className="text-zinc-400 text-[13px] leading-relaxed mt-3">
          {done
            ? <>Midnight, your time. Tomorrow&apos;s task is being built now, so it&apos;s <span className="text-white font-semibold">waiting when you wake up</span>.</>
            : urgent
              ? <>At midnight today&apos;s task is gone and tomorrow&apos;s takes its place. <span className="text-rose-300 font-semibold">Sit it now or the streak breaks.</span></>
              : <>At midnight, your time, today&apos;s task is replaced by tomorrow&apos;s. <span className="text-white font-semibold">Sit it before then to keep your streak.</span></>}
        </p>
      </div>
    </div>
  );
}
