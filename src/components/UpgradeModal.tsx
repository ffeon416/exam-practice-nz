"use client";

import Link from "next/link";

interface UpgradeModalProps {
  /** What limit they hit, e.g. "You've used your 2 free exams this week" */
  message: string;
  onClose: () => void;
}

export default function UpgradeModal({ message, onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 mx-auto mb-5 flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-[18px] font-semibold text-white text-center mb-2">
          You&apos;ve hit a limit
        </h2>
        <p className="text-zinc-400 text-[14px] text-center mb-6">
          {message}
        </p>

        {/* What upgrading unlocks */}
        <div className="border border-zinc-800 rounded-lg p-4 mb-6">
          <p className="text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
            Upgrade to unlock
          </p>
          <ul className="space-y-2 text-[13px] text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">+</span>
              <span><strong className="text-zinc-200">Student ($9.99/mo)</strong> — 20 exams/week, all subjects, spaced repetition, study planner, deep essay marking (no tutor)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5">+</span>
              <span><strong className="text-zinc-200">Pro ($19.99/mo)</strong> — Unlimited exams, 100 tutor chats/week, adaptive difficulty, plus everything in Student</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/pricing"
            className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium text-[14px] text-center hover:bg-indigo-400 transition-colors"
          >
            View plans
          </Link>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg border border-zinc-800 text-zinc-400 font-medium text-[14px] hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
