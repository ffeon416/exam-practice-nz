import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | StudyAce",
  description: "Create your StudyAce account.",
  robots: { index: false, follow: true },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
