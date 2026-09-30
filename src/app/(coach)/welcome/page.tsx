"use client";

// /welcome — a paying student's first five minutes (the ExamSetup wizard in
// "first" mode). With ?next=1 it's the same wizard for the next exam, though
// that normally happens inline on /schedule.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ExamSetup from "@/components/ExamSetup";

function WelcomeInner() {
  const nextExam = useSearchParams().get("next") === "1";
  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-16">
      <ExamSetup mode={nextExam ? "next" : "first"} />
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <WelcomeInner />
    </Suspense>
  );
}
