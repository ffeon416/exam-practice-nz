"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import {
  getDueCount,
  getReviewsVersion,
  getServerReviewsVersion,
  subscribeReviews,
} from "@/lib/spacedRepetition";

const links = [
  { href: "/subjects", label: "Exams" },
  { href: "/practice", label: "Fix Weak Spots" },
  { href: "/review", label: "Review" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  // useSyncExternalStore is the React-19-blessed way to read from external
  // stores like localStorage. The version counter changes whenever a review
  // is written, which re-triggers the getSnapshot -> getDueCount read.
  const version = useSyncExternalStore(
    subscribeReviews,
    getReviewsVersion,
    getServerReviewsVersion
  );
  // `mounted` keeps the initial client render in lockstep with the server
  // render (both show 0) to avoid a hydration mismatch when the user already
  // has reviews queued in localStorage. After mount, we read the real count.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const dueCount = useMemo(() => {
    void version;
    if (!mounted) return 0;
    return getDueCount();
  }, [version, mounted]);

  return (
    <nav className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold text-white text-[13px] tracking-tight shrink-0">
          study<span className="text-indigo-400">ace</span>
        </Link>
        <div className="flex gap-0.5 flex-1 justify-center overflow-x-auto">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            const showBadge = link.href === "/review" && dueCount > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-white bg-white/[0.08]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {link.label}
                {showBadge && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center border border-[#0a0a0f]"
                    aria-label={`${dueCount} reviews due`}
                  >
                    {dueCount > 99 ? "99+" : dueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7",
                },
              }}
            />
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-[12px] text-zinc-400 hover:text-white transition-colors px-2 py-1"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-[12px] font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition-colors px-3 py-1.5 rounded-md"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
