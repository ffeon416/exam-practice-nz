"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
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
];

export default function Navbar() {
  const pathname = usePathname();

  // useSyncExternalStore is the React-19-blessed way to read from external
  // stores like localStorage. The version counter changes whenever a review
  // is written, which re-triggers the getSnapshot -> getDueCount read.
  const version = useSyncExternalStore(
    subscribeReviews,
    getReviewsVersion,
    getServerReviewsVersion
  );
  // `version` is only referenced so useMemo re-runs; the actual value is
  // irrelevant — getDueCount reads fresh from localStorage each call.
  const dueCount = useMemo(() => {
    void version;
    if (typeof window === "undefined") return 0;
    return getDueCount();
  }, [version]);

  return (
    <nav className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-5 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold text-white text-[13px] tracking-tight">
          study<span className="text-indigo-400">ace</span>
        </Link>
        <div className="flex gap-0.5">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            const showBadge = link.href === "/review" && dueCount > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
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
      </div>
    </nav>
  );
}
