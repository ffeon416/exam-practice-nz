"use client";

import { useEffect, useRef, useState } from "react";

interface TimerProps {
  totalMinutes: number;
  onTimeUp: () => void;
  running: boolean;
  compact?: boolean;
}

// Wall-clock timer: counts down to a fixed end time rather than ticking a
// counter, so backgrounding the phone (which throttles/kills intervals) can't
// make it drift. Re-syncs on every tick and whenever the tab becomes visible.
export default function Timer({ totalMinutes, onTimeUp, running, compact }: TimerProps) {
  const endAt = useRef<number | null>(null);
  const fired = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(totalMinutes * 60);

  useEffect(() => {
    if (!running) return;
    if (endAt.current == null) endAt.current = Date.now() + totalMinutes * 60_000;
    const sync = () => {
      const left = Math.max(0, Math.ceil(((endAt.current ?? 0) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !fired.current) { fired.current = true; onTimeUp(); }
    };
    sync();
    const iv = setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", sync); };
  }, [running, onTimeUp, totalMinutes]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isLow = secondsLeft < 300;

  return (
    <div className={`font-mono font-bold tabular-nums ${compact ? "text-[14px]" : "text-lg"} ${isLow ? "text-red-400" : "text-zinc-300"}`}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}
