import Link from "next/link";
import type { Metadata } from "next";
import { subjectGuides, guideSubjects } from "@/lib/learnContent";

export const metadata: Metadata = {
  title: "Study Guides | StudyAce",
  description:
    "Learn the concepts before you practise. Study guides, formula sheets, worked examples, and exam tips for NCEA subjects.",
};

const topicCounts: Record<string, number> = Object.fromEntries(
  Object.entries(subjectGuides).map(([key, g]) => [key, g.keyConcepts.length])
);

export default function LearnPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <section className="max-w-4xl mx-auto px-5 pt-12 sm:pt-16 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-6">
            <svg
              className="w-3.5 h-3.5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            Study Guides
          </div>
          <h1 className="text-[28px] sm:text-[40px] md:text-[48px] font-bold text-white tracking-tight leading-tight mb-4">
            Study Guides
          </h1>
          <p className="text-zinc-400 text-[15px] sm:text-[17px] max-w-lg mx-auto leading-relaxed">
            Learn the concepts before you practise. Key topics, formula sheets,
            common mistakes, and exam tips for every subject.
          </p>
        </div>

        {/* Subject grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {guideSubjects.map((key) => {
            const guide = subjectGuides[key];
            if (!guide) return null;
            const count = topicCounts[key] ?? 0;
            const hasFormulas = !!guide.formulas && guide.formulas.length > 0;

            return (
              <Link
                key={key}
                href={`/learn/${key}`}
                className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.04] hover:border-white/[0.14] transition-all"
              >
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-lg font-semibold mb-4 group-hover:bg-indigo-500/15 transition-colors">
                  {guide.icon}
                </div>

                {/* Name */}
                <h2 className="text-white font-semibold text-[15px] mb-1">
                  {guide.label}
                </h2>

                {/* Meta */}
                <p className="text-zinc-500 text-[12px] mb-3">
                  {count} topics covered
                  {hasFormulas ? " \u00B7 Formula sheet" : ""}
                </p>

                {/* Description */}
                <p className="text-zinc-500 text-[13px] leading-relaxed line-clamp-2">
                  {guide.description}
                </p>

                {/* Arrow */}
                <div className="mt-4 flex items-center gap-1 text-indigo-400 text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View guide
                  <svg
                    className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
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
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <p className="text-zinc-500 text-[13px] mb-4">
            Ready to test yourself?
          </p>
          <Link
            href="/subjects"
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-lg transition-all hover:scale-[1.02] text-[14px]"
          >
            Build my exam
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
        </div>
      </section>
    </div>
  );
}
