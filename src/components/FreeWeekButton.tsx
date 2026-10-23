"use client";

// "Start a free week" — opens the free-week Stripe Checkout in the visitor's
// currency (the server decides it). If this person has already had a free
// week, it says so here, BEFORE any payment, and only goes on to a paid
// checkout if they choose to. Used on the homepage, /on-track and /start.

import { useState } from "react";
import { fireCheckoutPixel } from "@/lib/metaPixel";

type Reply = { url?: string; metaEventId?: string | null; alreadyTrialed?: boolean; price?: string; error?: string };

export default function FreeWeekButton({
  billing,
  label = "Start a free week",
  className,
  confirmClassName,
}: {
  billing: "yearly" | "monthly";
  label?: string;
  className: string;
  /** Styling for the "already had a free week" panel text. */
  confirmClassName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<string | null>(null);

  async function go(confirmPaid = false) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/checkout/trial", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing, ...(confirmPaid ? { confirmPaid: true } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as Reply;
      if (data.alreadyTrialed) { setRepeat(data.price ?? ""); setBusy(false); return; }
      if (res.ok && data.url) {
        fireCheckoutPixel(data.metaEventId);
        // Mobile Safari can drop a location change after an await; an anchor click always navigates.
        const a = document.createElement("a");
        a.href = data.url; a.rel = "noopener";
        document.body.appendChild(a); a.click();
        setTimeout(() => window.location.assign(data.url!), 100);
        return;
      }
      setError(data.error ?? "Couldn't open checkout. Try again.");
    } catch {
      setError("No connection. Try again.");
    }
    setBusy(false);
  }

  if (repeat !== null) {
    return (
      <div className={confirmClassName ?? "text-left"} role="status">
        <p className="font-semibold">You&rsquo;ve already had your free week.</p>
        <p className="mt-1 opacity-80">Your plan would start today{repeat ? ` at ${repeat}` : ""}. Cancel any time. Full refund within 30 days.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => go(true)} disabled={busy} className={className}>{busy ? "Opening…" : "Start my plan"}</button>
          <button type="button" onClick={() => setRepeat(null)} className="min-h-[44px] px-3 font-semibold underline underline-offset-2">Not now</button>
        </div>
        {error && <p className="mt-2 text-[#A2381B]" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => go()} disabled={busy} className={className}>
        {busy ? "Opening checkout…" : label}
      </button>
      {error && <p className="mt-2 text-[14px] text-[#A2381B]" role="alert">{error}</p>}
    </>
  );
}
