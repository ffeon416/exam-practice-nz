"use client";

// /cancel?t=… — one-click cancel from a parent email. Opening it shows what
// will be cancelled; the single button does it (email scanners pre-open
// links, so opening alone must never cancel).

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Info = { childName: string; duringTrial: boolean; alreadyCancelled: boolean; trialEnds: string | null; accessUntil: string | null; cancelled?: boolean; error?: string };

function CancelInner() {
  const t = useSearchParams().get("t") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, action: "info" }) })
      .then((r) => r.json())
      .then((d: Info) => setInfo(d))
      .catch(() => setInfo({ error: "No connection. Try the link again." } as Info));
  }, [t]);

  async function cancel() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, action: "cancel" }) });
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
  if (info.error) return shell(<><h1 className="text-[26px] font-bold leading-tight">That link didn&rsquo;t work</h1><p className="mt-3 text-[16px] text-[#4D4F58]">{info.error}</p></>);

  const n = info.childName;
  if (info.cancelled || info.alreadyCancelled) {
    return shell(
      <>
        <h1 className="text-[26px] font-bold leading-tight">Cancelled</h1>
        <p className="mt-3 text-[16px] text-[#4D4F58]">
          {info.duringTrial || !info.accessUntil
            ? `${n}'s free week is cancelled. Nothing has been charged, and nothing will be.`
            : `${n}'s plan won't renew. ${n} keeps access until ${info.accessUntil}.`}
        </p>
        <p className="mt-3 text-[16px] text-[#4D4F58]">We&rsquo;ve emailed you to confirm.</p>
        <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center text-[16px] font-semibold text-[#4A3AC4] underline underline-offset-2">Back to StudyAce</Link>
      </>
    );
  }

  return shell(
    <>
      <h1 className="text-[26px] font-bold leading-tight">{info.duringTrial ? `Cancel ${n}'s free week?` : `Cancel ${n}'s plan?`}</h1>
      <p className="mt-3 text-[16px] text-[#4D4F58]">
        {info.duringTrial
          ? `Nothing has been charged, and nothing will be. ${n} loses access straight away.`
          : `It won't renew.${info.accessUntil ? ` ${n} keeps access until ${info.accessUntil}.` : ""}`}
      </p>
      <button type="button" onClick={cancel} disabled={busy}
        className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] bg-[#15151B] px-5 text-[16px] font-semibold text-white hover:bg-black disabled:opacity-60">
        {busy ? "Cancelling…" : info.duringTrial ? "Cancel the free week" : "Cancel my plan"}
      </button>
      <Link href="/" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center text-[16px] font-semibold text-[#4A3AC4]">Keep it</Link>
    </>
  );
}

export default function CancelPage() {
  return <Suspense fallback={<div className="min-h-[70vh] bg-white" aria-hidden />}><CancelInner /></Suspense>;
}
