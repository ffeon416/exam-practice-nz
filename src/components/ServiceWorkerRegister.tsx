"use client";

import { useEffect } from "react";

// Registers the PWA service worker (production only — avoids interfering with
// the dev server's hot reload). Safe no-op where service workers are
// unsupported. iOS "Add to Home Screen" works without this; it mainly enables
// Android's "Install app" prompt and offline fallback.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed:", err));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
