"use client";

// The coach app's left sidebar (desktop). Little Nudge-style: the navigation
// IS the list of what your plan gives you, with the plan named at the top and
// your account at the bottom. No header anywhere — everything lives here. On
// phones this collapses into BottomTabs.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { getDueCount, getReviewsVersion, getServerReviewsVersion, subscribeReviews } from "@/lib/spacedRepetition";

export const COACH_ROUTE = /^\/(today|subjects|review|dashboard|plan|refer|exam|profile|welcome)(\/|$)/;
export const IN_PAPER = /^\/exam\/[^/]+$/;

const ITEMS: { href: string; label: string; sub: string; icon: (a: boolean) => React.ReactNode; match?: RegExp }[] = [
  { href: "/today", label: "Today", sub: "Your grade, tonight's paper", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 7v11H3V10l9-7z" /><path strokeLinecap="round" d="M9 21v-6h6v6" /></svg>
  ) },
  { href: "/subjects", label: "Practise", sub: "Unlimited papers, every subject", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8a2 2 0 012 2v14l-6-3-6 3V6a2 2 0 012-2z" /></svg>
  ), match: /^\/(subjects|exam)/ },
  { href: "/review", label: "Review", sub: "What you got wrong, until it sticks", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" /><path strokeLinecap="round" strokeLinejoin="round" d="M20 10a8 8 0 00-14.5-4M4 14a8 8 0 0014.5 4" /></svg>
  ) },
  { href: "/dashboard", label: "Progress", sub: "Every paper, every topic", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V10M12 16V5M17 16v-8" /></svg>
  ) },
  { href: "/plan", label: "Plan", sub: "Week by week to exam day", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" /></svg>
  ) },
  { href: "/refer", label: "Refer a friend", sub: "14 days free when they join", icon: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0" /><path strokeLinecap="round" d="M19 8h4M21 6v4" /></svg>
  ) },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { tier, loading } = useTier();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMounted(true), 0); return () => clearTimeout(id); }, []);
  const version = useSyncExternalStore(subscribeReviews, getReviewsVersion, getServerReviewsVersion);
  const due = useMemo(() => { void version; return mounted ? getDueCount() : 0; }, [version, mounted]);

  const isPaid = isLoaded && !!isSignedIn && !loading && tier !== "free";
  const visible = isPaid && COACH_ROUTE.test(pathname) && !IN_PAPER.test(pathname) && pathname !== "/welcome";

  useEffect(() => {
    document.body.classList.toggle("has-sidebar", visible);
    return () => document.body.classList.remove("has-sidebar");
  }, [visible]);

  if (!visible) return null;

  const name = user?.firstName?.trim() || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "You";

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[248px] z-40 flex-col bg-[#08080e] border-r border-white/[0.06]">
      <div className="px-5 pt-6 pb-4">
        <Link href="/today" className="font-semibold text-white tracking-tight text-[18px]">
          study<span className="text-indigo-400">ace</span>
        </Link>
      </div>

      {/* Your plan */}
      <div className="mx-4 mb-3 rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.08] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-indigo-300">Your plan</p>
        <p className="text-white font-bold text-[14px] leading-tight mt-0.5">Pro · everything included</p>
      </div>

      {/* What you get = where you go */}
      <nav className="flex-1 overflow-y-auto px-2" aria-label="Main">
        {ITEMS.map((it) => {
          const active = it.match ? it.match.test(pathname) : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 mb-0.5 transition-colors ${active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"}`}>
              <span className={`mt-0.5 shrink-0 ${active ? "text-indigo-300" : "text-zinc-500"}`}>{it.icon(active)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-[14px] font-semibold ${active ? "text-white" : ""}`}>{it.label}</span>
                  {it.href === "/review" && due > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-amber-400 text-[#0a0a0f] text-[10.5px] font-bold flex items-center justify-center">{due > 99 ? "99+" : due}</span>
                  )}
                </span>
                <span className="block text-[11.5px] text-zinc-500 leading-snug">{it.sub}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="border-t border-white/[0.06] p-3">
        <Link href="/profile" className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${pathname.startsWith("/profile") ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}>
          <span className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.1] shrink-0 bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[13px] font-bold">
            {user?.imageUrl ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" /> : (name[0] ?? "?").toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-white truncate">{name}</span>
            <span className="block text-[11.5px] text-zinc-500">Account &amp; billing</span>
          </span>
        </Link>
        <button onClick={() => signOut({ redirectUrl: "/" })} className="mt-1 w-full text-left px-2 py-2 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  );
}
