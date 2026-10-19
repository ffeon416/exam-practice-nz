import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Is your teen on track? — StudyAce parent check",
  description: "Nine quick questions for parents. Pick the grade you want your teen to reach, tell us where they are now and how they study, and get a straight answer: on track, borderline, or not — and what would change it.",
  alternates: { canonical: "https://studyace.co/on-track" },
};

export default function OnTrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
