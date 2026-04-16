"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { subjectGuides, hasGuide } from "@/lib/learnContent";

export default function SubjectGuidePage() {
  const params = useParams<{ subject: string }>();
  const subject = params.subject;

  if (!hasGuide(subject)) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Guide not found
        </h1>
        <p className="text-zinc-400 mb-6">
          We don&apos;t have a study guide for that subject yet.
        </p>
        <Link
          href="/learn"
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
        >
          &larr; Back to all guides
        </Link>
      </div>
    );
  }

  const guide = subjectGuides[subject]!;

  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/[0.06] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-10 sm:pt-14 pb-20">
        {/* Breadcrumb */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-[12px] font-medium mb-6 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          All Study Guides
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xl font-semibold mb-4">
            {guide.icon}
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-3">
            {guide.label}
          </h1>
          <p className="text-zinc-400 text-[15px] leading-relaxed max-w-xl">
            {guide.description}
          </p>
        </div>

        {/* Key Concepts */}
        <Section title="Key Concepts" id="concepts">
          <div className="space-y-2">
            {guide.keyConcepts.map((concept, i) => (
              <ConceptCard key={i} concept={concept} />
            ))}
          </div>
        </Section>

        {/* Formula Sheet */}
        {guide.formulas && guide.formulas.length > 0 && (
          <Section title="Formula Sheet" id="formulas">
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                        Formula
                      </th>
                      <th className="px-4 py-3 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider hidden sm:table-cell">
                        When to use
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {guide.formulas.map((f, i) => (
                      <tr
                        key={i}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-[13px] text-zinc-300 font-medium whitespace-nowrap">
                          {f.name}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-indigo-300 font-mono whitespace-nowrap">
                          {f.formula}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-zinc-500 hidden sm:table-cell">
                          {f.when}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* Common Mistakes */}
        <Section title="Common Mistakes" id="mistakes">
          <div className="space-y-3">
            {guide.commonMistakes.map((m, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <svg
                        className="w-3.5 h-3.5 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-white text-[14px] font-medium mb-1">
                      {m.mistake}
                    </p>
                    <div className="flex items-start gap-2 mt-2">
                      <div className="shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-[13px] leading-relaxed">
                        {m.fix}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Exam Tips */}
        <Section title="Exam Tips" id="tips">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/[0.06] to-purple-500/[0.03] border border-indigo-500/15 p-5 sm:p-6">
            <ul className="space-y-3">
              {guide.examTips.map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-zinc-300 text-[14px] leading-relaxed">
                    {tip}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-14 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link
            href={`/subjects`}
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-lg transition-all hover:scale-[1.02] text-[14px]"
          >
            Practise {guide.label}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <Link
            href="/learn"
            className="text-zinc-400 hover:text-zinc-300 text-[13px] font-medium transition-colors"
          >
            View other guides
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight mb-4 flex items-center gap-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ── Expandable concept card ── */
function ConceptCard({
  concept,
}: {
  concept: { title: string; explanation: string; example?: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-colors hover:border-white/[0.1]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left"
      >
        <span className="text-white text-[14px] font-medium pr-4">
          {concept.title}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 border-t border-white/[0.04]">
          <p className="text-zinc-300 text-[13px] leading-relaxed mt-4">
            {concept.explanation}
          </p>
          {concept.example && (
            <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-4 py-3">
              <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider mb-1">
                Example
              </p>
              <p className="text-zinc-400 text-[13px] leading-relaxed">
                {concept.example}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
