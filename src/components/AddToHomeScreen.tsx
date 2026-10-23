"use client";

// "Add StudyAce to your home screen" — one tap on Android/Chrome (the
// browser's own install prompt), short instructions on iPhone (Safari has no
// prompt), nothing at all once it's already installed.

import { useEffect, useState } from "react";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

function standalone(): boolean {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; }
}

export default function AddToHomeScreen() {
  const [env, setEnv] = useState<{ installed: boolean; ios: boolean } | null>(null);
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEnv({ installed: standalone(), ios: /iPhone|iPad|iPod/.test(navigator.userAgent) }), 0);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { clearTimeout(id); window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  if (!env || env.installed || done) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDone(true);
    setPrompt(null);
  }

  return (
    <div className="rounded-2xl border border-[#E2E2E8] bg-white p-4">
      <p className="text-[16px] font-semibold">Put StudyAce on your home screen</p>
      <p className="mt-1 text-[15px] text-[#4D4F58]">One tap tomorrow night, like any other app.</p>
      {prompt ? (
        <button type="button" onClick={install}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] border border-[#E2E2E8] px-4 text-[16px] font-semibold hover:bg-[#F6F6F8]">
          Add to home screen
        </button>
      ) : env.ios ? (
        <p className="mt-2 text-[15px] text-[#4D4F58]">
          In Safari, tap <strong className="text-[#15151B]">Share</strong>, then <strong className="text-[#15151B]">Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="mt-2 text-[15px] text-[#4D4F58]">Open your browser menu and tap <strong className="text-[#15151B]">Add to Home screen</strong> or <strong className="text-[#15151B]">Install app</strong>.</p>
      )}
    </div>
  );
}
