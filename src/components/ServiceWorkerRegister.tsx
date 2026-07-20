"use client";

import { useEffect } from "react";

// Registers the PWA service worker (production only — avoids interfering with
// the dev server's hot reload). Safe no-op where service workers are
// unsupported.
//
// It ALSO keeps the installed app up to date. Standalone iOS/Android PWAs
// resume their existing JS context instead of re-navigating, so a home-screen
// app can keep running a build from days ago no matter how many times we
// deploy — the classic "my fix isn't showing up" bug. To defeat that we:
//   1. re-check for a new service worker on load, when the app is refocused,
//      and on an interval while it's open (`registration.update()`), and
//   2. reload exactly once when a NEW worker takes control
//      (`controllerchange`). The new worker calls skipWaiting()+clients.claim()
//      (see public/sw.js), so bumping the SW version on a deploy makes every
//      open app quietly reload itself into the fresh build.
// The controller guard avoids a spurious reload on the very first install
// (when there was no previous controller, a controllerchange is not an update).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    // Only treat controllerchange as "an update happened" if a worker already
    // controlled this page. First-ever install has no prior controller.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let onVisible: (() => void) | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registration = reg;
          reg.update().catch(() => {});
          // Poll for a new deploy while the app stays open...
          interval = setInterval(() => reg.update().catch(() => {}), 60_000);
          // ...and the moment the user brings the app back to the foreground.
          onVisible = () => {
            if (document.visibilityState === "visible") reg.update().catch(() => {});
          };
          document.addEventListener("visibilitychange", onVisible);
        })
        .catch((err) => console.error("Service worker registration failed:", err));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (interval) clearInterval(interval);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      void registration;
    };
  }, []);

  return null;
}
