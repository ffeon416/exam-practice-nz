"use client";

// /keep?t=… — "Keep the plan going" from the day-5 email. The parent chooses
// to be charged on day 7 even if their child hasn't done the grade check yet,
// which switches the auto-cancel off for this family. One clear button.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Info = { childName: string; trialEnds: string | null; kept: boolean; gradeCheckDone: boolean; ended: boolean; parentCancelled: boolean; error?: string };

function KeepInner() {
  const t = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/keep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, action: "info" }) })
      .then((r) => r.json())
      .then((d: Info) => setInfo(d))
      .catch(() => setInfo({ error: "No connection. Try the link again." } as Info));
  }, [t]);

  async function keep() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/keep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, action: "keep" }) });
      setInfo((await r.json()) as Info);
    } catch {
      setInfo((i) => ({ ...(i as Info), error: "No connection. Tap again." }));
    }
    setBusy(false);
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-[calc(100vh-3rem)] bg-white px-4 py-16 text-[#15151B]"><div className="mx-auto max-w-[480px]">{children}</div></div>
  );
  if (!info) return shell(<div className="h-40 animate-pulse rounded-2xl bg-[#F6F6F8]" aria-hidden />);
  if (info.error) return shell(<><h1 className="text-[26px] font-bold leading-tight">That didn&rsquo;t work</h1><p className="mt-3 text-[16px] text-[#4D4F58]">{info.error}</p></>);

  const n = info.childName;
  const day = info.trialEnds ?? "the end of the free week";
  if (info.kept || info.gradeCheckDone) {
    return shell(
      <>
        <h1 className="text-[26px] font-bold leading-tight">The plan keeps going</h1>
        <p className="mt-3 text-[16px] text-[#4D4F58]">
          {info.gradeCheckDone ? `${n} has done the grade check, so there's nothing to cancel.` : `We won't cancel ${n}'s free week. Your plan starts on ${day}.`}
        </p>
        <p className="mt-3 text-[16px] text-[#4D4F58]">Changed your mind? The cancel link in our email still works until then.</p>
        <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center text-[16px] font-semibold text-[#4A3AC4] underline underline-offset-2">Back to StudyAce</Link>
      </>
    );
  }
  return shell(
    <>
      <h1 className="text-[26px] font-bold leading-tight">Keep {n}&rsquo;s plan going?</h1>
      <p className="mt-3 text-[16px] text-[#4D4F58]">
        {n} hasn&rsquo;t started yet. Normally we&rsquo;d cancel the free week so you&rsquo;re not charged. If you know {n} will start,
        keep it going and your plan starts on {day}, even if the grade check isn&rsquo;t done.
      </p>
      <button type="button" onClick={keep} disabled={busy}
        className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] bg-[#5B47E0] px-5 text-[16px] font-semibold text-white hover:bg-[#4A3AC4] disabled:opacity-60">
        {busy ? "Saving…" : `Keep the plan going and charge me on ${day}`}
      </button>
      <Link href="/" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center text-[16px] font-semibold text-[#62646D]">No, leave it as it is</Link>
    </>
  );
}

export default function KeepPage() {
  return <Suspense fallback={<div className="min-h-[70vh] bg-white" aria-hidden />}><KeepInner /></Suspense>;
}
