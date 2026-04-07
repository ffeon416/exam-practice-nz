"use client";

import { useEffect, useState } from "react";

interface TimerProps {
  totalMinutes: number;
  onTimeUp: () => void;
  running: boolean;
}

export default function Timer({ totalMinutes, onTimeUp, running }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalMinutes * 60);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          onTimeUp();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, secondsLeft, onTimeUp]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isLow = secondsLeft < 300; // under 5 minutes

  return (
    <div
      className={`font-mono text-lg font-bold tabular-nums ${
        isLow ? "text-red-400" : "text-slate-300"
      }`}
    >
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}
