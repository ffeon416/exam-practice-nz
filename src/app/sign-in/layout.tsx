import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | StudyAce",
  description: "Sign in to your StudyAce account.",
  robots: { index: false, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
