"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught error:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-white mb-3">Something went sideways</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Don&apos;t worry — your progress is safe. Try again or head back to the home page.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={reset}
          className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="w-full py-3 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800/50 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
