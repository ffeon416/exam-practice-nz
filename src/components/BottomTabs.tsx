"use client";

// Phone navigation for the coach app: five tabs (You = the dashboard), safe-area aware, hidden
// while a paper is being sat. Desktop keeps the top nav (md and up).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { useExamDue } from "@/components/ExamGate";

const TABS = [
  { href: "/schedule", label: "Schedule", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 7v11H3V10l9-7z" /><path strokeLinecap="round" d="M9 21v-6h6v6" /></svg>
  ) },
  { href: "/pace", label: "Pace", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 3 5-7 4 4" /><path strokeLinecap="round" d="M17 11h4v4" /></svg>
  ) },
  { href: "/streak", label: "Streak", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-6 1-8.5z" /></svg>
  ) },
  { href: "/subjects", label: "Practise", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a2 2 0 012 2v14l-6-3-6 3V6a2 2 0 012-2z" /></svg>
  ) },
  { href: "/profile", label: "You", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0" /></svg>
  ) },
];

const COACH_PREFIX = /^\/(today|schedule|lesson|pace|streak|subjects|review|dashboard|plan|refer|exam|profile|welcome)(\/|$)/;
const IN_PAPER = /^\/exam\/[^/]+$/;

export default function BottomTabs() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { tier, loading } = useTier();
  const examDue = useExamDue(); // exam day reached → a glowing dot on "You" until the next exam is set

  const isPaid = isLoaded && !!isSignedIn && !loading && tier !== "free";
  const visible = isPaid && COACH_PREFIX.test(pathname) && !IN_PAPER.test(pathname) && pathname !== "/welcome";

  // Reserve room under the page content for the bar (phone only, see globals.css).
  useEffect(() => {
    document.body.classList.toggle("has-tabs", visible);
    return () => document.body.classList.remove("has-tabs");
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#06060a]/95 backdrop-blur-md border-t border-white/[0.08]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-[60px]">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/")
            || (t.href === "/schedule" && (pathname.startsWith("/review") || pathname.startsWith("/lesson")))
            || (t.href === "/subjects" && pathname.startsWith("/exam"));
          return (
            <Link key={t.href} href={t.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${active ? "text-white" : "text-zinc-500"}`}>
              {t.icon(active)}
              {t.label}
              {examDue && t.href === "/profile" && <span className="sa-attn absolute top-1.5 left-1/2 ml-2 w-2.5 h-2.5 rounded-full bg-indigo-400" aria-label="Set your next exam" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
