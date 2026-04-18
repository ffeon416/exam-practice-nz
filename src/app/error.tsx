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
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-5 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-zinc-400 text-[14px] mb-6 max-w-sm mx-auto">
            Don&apos;t worry — your progress is saved. Try refreshing the page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-lg transition-all text-[14px]"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-white font-medium px-6 py-3 rounded-lg border border-white/[0.1] transition-all text-[14px]"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
