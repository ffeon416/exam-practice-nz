"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { loadOnboarding, saveOnboarding } from "@/lib/onboarding";

const YEAR_LEVELS = [
  { value: 10 as const, label: "Year 10", hint: "Pre-NCEA / CAA" },
  { value: 11 as const, label: "Year 11", hint: "NCEA Level 1" },
  { value: 12 as const, label: "Year 12", hint: "NCEA Level 2" },
  { value: 13 as const, label: "Year 13", hint: "NCEA Level 3" },
];

const SUBJECTS = [
  { value: "mathematics", label: "Mathematics", years: [10, 11, 12, 13] },
  { value: "english", label: "English", years: [10, 11, 12, 13] },
  { value: "science", label: "Science", years: [10, 11] },
  { value: "statistics", label: "Statistics", years: [11, 12, 13] },
  { value: "biology", label: "Biology", years: [11, 12, 13] },
  { value: "chemistry", label: "Chemistry", years: [12, 13] },
  { value: "physics", label: "Physics", years: [12, 13] },
  { value: "history", label: "History", years: [11, 13] },
  { value: "geography", label: "Geography", years: [11, 12, 13] },
  { value: "te-reo", label: "Te Reo Māori", years: [11, 12, 13] },
  { value: "economics", label: "Economics", years: [11, 12, 13] },
  { value: "accounting", label: "Accounting", years: [11, 12, 13] },
  { value: "health", label: "Health", years: [10, 11] },
  { value: "digital-tech", label: "Digital Technologies", years: [10] },
  { value: "social-studies", label: "Social Studies", years: [10] },
  { value: "media-studies", label: "Media Studies", years: [12, 13] },
  { value: "classical-studies", label: "Classical Studies", years: [12, 13] },
  { value: "art-history", label: "Art History", years: [12, 13] },
  { value: "business-studies", label: "Business Studies", years: [13] },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<1 | 2>(1);
  const [yearLevel, setYearLevel] = useState<10 | 11 | 12 | 13 | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [checkedExisting, setCheckedExisting] = useState(false);

  // Skip welcome if already onboarded
  useEffect(() => {
    const existing = loadOnboarding();
    if (existing) {
      router.replace("/dashboard");
      return;
    }
    setCheckedExisting(true);
  }, [router]);

  // Claim a pending referral once Clerk has finished loading + we know
  // the user is signed in. Fire-and-forget — the API is idempotent for
  // the second-claim case (rejected as duplicate) so retries are safe.
  useEffect(() => {
    if (!isLoaded || !user) return;
    let pending: string | null = null;
    try {
      pending = window.localStorage.getItem("studyace-pending-ref");
    } catch {
      return;
    }
    if (!pending) return;
    fetch("/api/refer/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrerId: pending }),
    })
      .catch(() => {
        /* network errors are non-fatal — user can still use the app */
      })
      .finally(() => {
        try {
          window.localStorage.removeItem("studyace-pending-ref");
        } catch {
          /* ignore */
        }
      });
  }, [isLoaded, user]);

  const availableSubjects = yearLevel != null
    ? SUBJECTS.filter((s) => s.years.includes(yearLevel))
    : [];

  function toggleSubject(v: string) {
    setSubjects((prev) =>
      prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]
    );
  }

  function handleFinish() {
    if (!yearLevel || subjects.length === 0) return;
    saveOnboarding({ yearLevel, subjects });
    router.push("/dashboard");
  }

  function handleSkip() {
    // Save minimal prefs so user isn't bounced back here next time
    saveOnboarding({
      yearLevel: yearLevel ?? 12,
      subjects: subjects.length > 0 ? subjects : ["mathematics"],
    });
    router.push("/dashboard");
  }

  if (!checkedExisting || !isLoaded) {
    return (
      <div className="max-w-xl mx-auto px-5 pt-16 pb-20 bg-[#06060a] min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
          <div className="h-4 bg-white/[0.04] rounded-lg w-64" />
        </div>
      </div>
    );
  }

  const firstName = user?.firstName?.trim() || null;

  return (
    <div className="relative overflow-hidden bg-[#06060a] min-h-screen">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
        <div className="absolute top-[200px] right-0 w-[500px] h-[400px] bg-purple-500/[0.05] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-10 sm:pt-16 pb-16">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className={`h-1.5 rounded-full transition-all ${step === 1 ? "w-8 bg-indigo-400" : "w-1.5 bg-indigo-500"}`} />
          <div className={`h-1.5 rounded-full transition-all ${step === 2 ? "w-8 bg-indigo-400" : "w-1.5 bg-white/10"}`} />
        </div>

        {step === 1 && (
          <>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight text-center mb-2">
              {firstName ? `Welcome, ${firstName}` : "Welcome to StudyAce"}
            </h1>
            <p className="text-zinc-400 text-center text-[15px] mb-10">
              Let&apos;s set you up. What year are you in?
            </p>

            <div className="grid grid-cols-1 gap-2.5 mb-8">
              {YEAR_LEVELS.map((yl) => (
                <button
                  key={yl.value}
                  onClick={() => setYearLevel(yl.value)}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl text-left transition-all border ${
                    yearLevel === yl.value
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                      : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <p className="text-white font-semibold text-[16px]">{yl.label}</p>
                    <p className="text-zinc-500 text-[12px]">{yl.hint}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    yearLevel === yl.value ? "border-indigo-400 bg-indigo-500" : "border-white/20"
                  }`}>
                    {yearLevel === yl.value && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => yearLevel && setStep(2)}
              disabled={yearLevel === null}
              className={`w-full py-4 rounded-xl text-[16px] font-bold transition-all ${
                yearLevel !== null
                  ? "bg-white text-[#06060a] hover:bg-zinc-100 hover:scale-[1.01] shadow-2xl shadow-white/10"
                  : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
              }`}
            >
              Continue &rarr;
            </button>
          </>
        )}

        {step === 2 && yearLevel && (
          <>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold text-white tracking-tight text-center mb-2">
              Pick your subjects
            </h1>
            <p className="text-zinc-400 text-center text-[15px] mb-8">
              Choose the ones you want to practise. You can change these later.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {availableSubjects.map((s) => {
                const picked = subjects.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSubject(s.value)}
                    className={`min-h-[52px] px-4 py-3 rounded-lg text-[13px] font-medium text-left transition-all border ${
                      picked
                        ? "bg-gradient-to-r from-indigo-500/25 to-purple-500/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{s.label}</span>
                      {picked && (
                        <svg className="w-4 h-4 text-indigo-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mb-4 text-center text-[12px] text-zinc-500">
              {subjects.length === 0
                ? "Pick at least one subject"
                : `${subjects.length} subject${subjects.length === 1 ? "" : "s"} selected`}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setStep(1)}
                className="py-4 rounded-xl text-[15px] font-medium text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                &larr; Back
              </button>
              <button
                onClick={handleFinish}
                disabled={subjects.length === 0}
                className={`py-4 rounded-xl text-[16px] font-bold transition-all ${
                  subjects.length > 0
                    ? "bg-white text-[#06060a] hover:bg-zinc-100 hover:scale-[1.01] shadow-2xl shadow-white/10"
                    : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
                }`}
              >
                Let&apos;s go &rarr;
              </button>
            </div>
          </>
        )}

        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Skip for now
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-700 mt-8">
          Already set up? <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 underline">Go to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
