"use client";

// Phone navigation for the coach app: four tabs, safe-area aware, hidden
// while a paper is being sat. Desktop keeps the top nav (md and up).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { getDueCount, getReviewsVersion, getServerReviewsVersion, subscribeReviews } from "@/lib/spacedRepetition";

const TABS = [
  { href: "/today", label: "Today", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 7v11H3V10l9-7z" /><path strokeLinecap="round" d="M9 21v-6h6v6" /></svg>
  ) },
  { href: "/subjects", label: "Practise", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a2 2 0 012 2v14l-6-3-6 3V6a2 2 0 012-2z" /></svg>
  ) },
  { href: "/review", label: "Review", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" /><path strokeLinecap="round" strokeLinejoin="round" d="M20 10a8 8 0 00-14.5-4M4 14a8 8 0 0014.5 4" /></svg>
  ) },
  { href: "/dashboard", label: "Progress", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V10M12 16V5M17 16v-8" /></svg>
  ) },
  { href: "/profile", label: "You", icon: (a: boolean) => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0" /></svg>
  ) },
];

const COACH_PREFIX = /^\/(today|subjects|review|dashboard|plan|refer|exam|profile|welcome)(\/|$)/;
const IN_PAPER = /^\/exam\/[^/]+$/;

export default function BottomTabs() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { tier, loading } = useTier();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMounted(true), 0); return () => clearTimeout(id); }, []);
  const version = useSyncExternalStore(subscribeReviews, getReviewsVersion, getServerReviewsVersion);
  const due = useMemo(() => { void version; return mounted ? getDueCount() : 0; }, [version, mounted]);

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
            || (t.href === "/dashboard" && (pathname.startsWith("/plan") || pathname.startsWith("/refer")))
            || (t.href === "/subjects" && pathname.startsWith("/exam"));
          return (
            <Link key={t.href} href={t.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${active ? "text-white" : "text-zinc-500"}`}>
              {t.icon(active)}
              {t.label}
              {t.href === "/review" && due > 0 && (
                <span className="absolute top-2 right-[calc(50%-20px)] min-w-[16px] h-[16px] px-1 rounded-full bg-amber-400 text-[#0a0a0f] text-[10px] font-bold flex items-center justify-center">{due > 99 ? "99+" : due}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
