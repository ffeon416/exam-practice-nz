import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | StudyAce",
  description: "Start your StudyAce free trial.",
  robots: { index: false, follow: true },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
