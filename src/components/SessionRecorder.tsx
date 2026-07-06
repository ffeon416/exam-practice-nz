"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

// First-party session replay. Records the DOM with rrweb and ships batches to
// /api/rec so recordings can be watched INSIDE /admin — no third party.
//
// Privacy: maskAllInputs means every text field (answers, messages, passwords)
// is recorded as dots, never the real characters. Production-only; never runs
// in dev, and never records the /admin pages themselves.
export default function SessionRecorder() {
  const { user } = useUser();
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    // Don't record the admin watching their own dashboard.
    if (window.location.pathname.startsWith("/admin")) return;

    let stop: (() => void) | undefined;
    let buffer: unknown[] = [];
    let seq = 0;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const sessionId =
      window.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let visitorId: string | null = null;
    try {
      visitorId = localStorage.getItem("studyace-visitor-id");
    } catch {
      /* localStorage blocked — recording still works without a visitor id */
    }

    function flush(final = false) {
      if (buffer.length === 0) return;
      const events = buffer;
      buffer = [];
      const payload = JSON.stringify({
        sessionId,
        visitorId,
        userId: userIdRef.current,
        seq: seq++,
        events,
        path: window.location.pathname,
      });
      try {
        // sendBeacon (and fetch keepalive) cap the body at ~64KB in Chromium,
        // and a full-page rrweb snapshot is far bigger — so the beacon is used
        // ONLY for small final flushes on page unload. Every normal flush goes
        // via a plain fetch, which has no such size limit.
        if (final && navigator.sendBeacon && payload.length < 60_000) {
          navigator.sendBeacon("/api/rec", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/rec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          }).catch(() => {});
        }
      } catch {
        /* never let recording break the app */
      }
    }

    (async () => {
      try {
        const { record } = await import("rrweb");
        if (disposed) return;
        stop = record({
          emit(event) {
            buffer.push(event);
            // Send the initial full snapshot (rrweb event type 2) promptly so
            // even a short visit produces a playable recording. A tiny delay
            // lets same-tick events ride along in the same batch.
            if ((event as { type?: number }).type === 2) setTimeout(() => flush(), 300);
            // Safety valve: flush early if a burst fills the buffer.
            if (buffer.length >= 200) flush();
          },
          maskAllInputs: true,
          maskTextClass: "sa-mask",
          blockClass: "sa-no-record",
          sampling: { mousemove: 50, scroll: 150, media: 800 },
          recordCanvas: false,
        });
        // Land the initial full-snapshot batch quickly (in case the visitor
        // leaves within a few seconds), then flush on a steady interval.
        setTimeout(() => flush(), 1500);
        timer = setInterval(() => flush(), 4000);
      } catch {
        /* rrweb failed to load — skip recording silently */
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
      try {
        stop?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return null;
}
