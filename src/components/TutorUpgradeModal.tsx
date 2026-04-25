"use client";

import Link from "next/link";

interface TutorUpgradeModalProps {
  onClose: () => void;
}

export default function TutorUpgradeModal({ onClose }: TutorUpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-zinc-900 to-[#0c0c12] border border-indigo-500/25 rounded-2xl shadow-2xl shadow-indigo-500/10 max-w-md w-full p-6 sm:p-8">
        {/* Icon + accent */}
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto mb-5 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-1.5 py-0.5 rounded-md shadow-md">
            Pro
          </span>
        </div>

        <h2 className="text-[22px] font-extrabold text-white text-center tracking-tight mb-2">
          Stuck? Meet your personal tutor.
        </h2>
        <p className="text-zinc-400 text-[13.5px] text-center mb-6 leading-relaxed max-w-sm mx-auto">
          It&apos;s like having a maths tutor in your pocket — walks you through the tricky questions so you actually <em>get</em> them, not just cram them.
        </p>

        {/* Benefits */}
        <ul className="space-y-2.5 mb-6">
          <Benefit text="Guides you to the answer with hints, never just gives it away" />
          <Benefit text="Instant help on any question, any subject" />
          <Benefit text="100 tutor chats every week" />
          <Benefit text="Plus everything in Student — unlimited exams, adaptive difficulty, essay marking" />
        </ul>

        {/* Price */}
        <div className="rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 px-5 py-4 mb-5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Pro plan</p>
          <p className="text-white">
            <span className="text-[28px] font-extrabold tracking-tight">$19.99</span>
            <span className="text-zinc-400 text-[13px] ml-1">/month</span>
          </p>
          <p className="text-zinc-500 text-[11px] mt-1">Cancel anytime · 30-day money-back guarantee</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/pricing"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold text-[14px] text-center transition-all shadow-lg shadow-indigo-500/20"
          >
            Unlock Pro
          </Link>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg text-zinc-500 font-medium text-[13px] hover:text-zinc-300 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[13px] text-zinc-300 leading-snug">{text}</span>
    </li>
  );
}
