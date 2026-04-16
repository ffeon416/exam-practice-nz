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
  { href: "/learn", label: "Learn" },
  { href: "/practice", label: "Fix Weak Spots" },
  { href: "/review", label: "Review" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/pricing", label: "Pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const version = useSyncExternalStore(
    subscribeReviews,
    getReviewsVersion,
    getServerReviewsVersion
  );
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const dueCount = useMemo(() => {
    void version;
    if (!mounted) return 0;
    return getDueCount();
  }, [version, mounted]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="font-semibold text-white text-[15px] tracking-tight shrink-0">
            study<span className="text-indigo-400">ace</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-0.5 flex-1 justify-center">
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

          {/* Right side: auth + mobile hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auth (desktop) */}
            <div className="hidden md:flex items-center gap-2">
              {isSignedIn ? (
                <UserButton
                  appearance={{
                    elements: { avatarBox: "w-7 h-7" },
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

            {/* Mobile: user button (when signed in) */}
            <div className="md:hidden flex items-center gap-2">
              {isSignedIn && (
                <UserButton
                  appearance={{
                    elements: { avatarBox: "w-7 h-7" },
                  }}
                />
              )}

              {/* Hamburger button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="relative w-9 h-9 flex items-center justify-center rounded-md text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </svg>
                )}
                {dueCount > 0 && !menuOpen && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 bg-[#0a0a0f] border-b border-white/[0.08] z-50 shadow-2xl">
            <div className="px-5 py-4 space-y-1">
              {links.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                const showBadge = link.href === "/review" && dueCount > 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center justify-between px-4 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/[0.08]"
                        : "text-zinc-300 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{link.label}</span>
                    {showBadge && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                        {dueCount > 99 ? "99+" : dueCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {!isSignedIn && (
              <div className="px-5 py-4 border-t border-white/[0.06] flex flex-col gap-2">
                <Link
                  href="/sign-up"
                  className="block w-full text-center py-3 rounded-lg bg-indigo-500 text-white font-medium text-[14px] hover:bg-indigo-400 transition-colors"
                >
                  Sign up free
                </Link>
                <Link
                  href="/sign-in"
                  className="block w-full text-center py-3 rounded-lg border border-white/[0.08] text-zinc-300 font-medium text-[14px] hover:bg-white/[0.04] transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
