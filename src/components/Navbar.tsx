"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  getDueCount,
  getReviewsVersion,
  getServerReviewsVersion,
  subscribeReviews,
} from "@/lib/spacedRepetition";
import { useTier } from "@/hooks/useTier";

// Signed-in: the four things a student does. Pricing lives behind the
// Upgrade pill (free accounts) and the profile page (paid), not in the nav.
const authedLinks = [
  { href: "/today", label: "Today" },
  { href: "/subjects", label: "Practise" },
  { href: "/review", label: "Review" },
  { href: "/dashboard", label: "Progress" },
];

// Signed-out: one path to a sale. Grade check → pricing, with the blog for
// trust. Schools, contact, Discord and legal all live in the footer.
const publicLinks = [
  { href: "/grade", label: "Grade check" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { tier, loading: tierLoading } = useTier();
  const [menuOpen, setMenuOpen] = useState(false);
  const showUpgrade =
    isSignedIn &&
    !tierLoading &&
    tier === "free" &&
    pathname !== "/pricing";

  // Door split: only PAID accounts get the coach nav. A signed-in unpaid
  // account (a lead) sees the visitor nav — its whole app is /start. While
  // the tier is unknown for a signed-in user, render nothing (no flicker).
  const isPaid = !!isSignedIn && !tierLoading && tier !== "free";
  const links = !isLoaded || (isSignedIn && tierLoading) ? [] : isPaid ? authedLinks : publicLinks;

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
    if (!mounted || !isPaid) return 0;
    return getDueCount();
  }, [version, mounted, isPaid]);

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The header CTA always points at the next step of the funnel: the free
  // grade check everywhere, and pricing once they're already on the check.
  const cta = pathname.startsWith("/grade")
    ? { href: "/pricing", label: "See pricing" }
    : { href: "/grade", label: "Free grade check" };

  // Mid-paper there is no chrome at all — the exam screen owns the viewport.
  if (isPaid && /^\/exam\/[^/]+$/.test(pathname)) return null;

  return (
    <>
      <nav className="bg-[#06060a]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 flex items-center justify-between gap-3 h-[68px]">
          {/* Logo */}
          <Link
            href="/"
            className="font-semibold text-white tracking-tight shrink-0 text-[18px]"
          >
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
                  className={`relative rounded-md font-medium transition-colors whitespace-nowrap px-3.5 py-2 text-[14px] ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {link.label}
                  {showBadge && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center border border-[#0a0a0f]"
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
              {showUpgrade && (
                <Link
                  href="/pricing"
                  className="text-[12px] font-semibold text-indigo-200 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 hover:from-indigo-500/25 hover:to-violet-500/25 border border-indigo-500/30 px-3 py-1.5 rounded-full transition-all"
                >
                  Get Pro
                </Link>
              )}
              {!isLoaded ? (
                <div className="w-9 h-9" aria-hidden />
              ) : isSignedIn ? (
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.1] hover:border-indigo-500/50 transition-colors shrink-0"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[13px] font-bold">
                      {(user?.firstName?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-[14px] text-zinc-400 hover:text-white transition-colors px-3 py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={cta.href}
                    className="text-[14px] font-semibold text-[#0a0a0f] bg-white hover:bg-zinc-200 transition-colors px-5 py-2 rounded-full shadow-lg shadow-indigo-500/10"
                  >
                    {cta.label}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: user button (when signed in) */}
            <div className="md:hidden flex items-center gap-2">
              {isSignedIn && (
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.1] hover:border-indigo-500/50 transition-colors shrink-0"
                >
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-[13px] font-bold">
                      {(user?.firstName?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                </Link>
              )}

              {/* Hamburger button — paid accounts use the bottom tabs instead */}
              {!isPaid && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="relative w-10 h-10 flex items-center justify-center rounded-md text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
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
              )}
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
          <div className="md:hidden fixed left-0 right-0 bg-[#0a0a0f] border-b border-white/[0.08] z-50 shadow-2xl top-[68px]">
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

            {showUpgrade && (
              <div className="px-5 pb-4">
                <Link
                  href="/pricing"
                  className="block w-full text-center py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-[14px] hover:from-indigo-400 hover:to-violet-500 transition-all"
                >
                  Upgrade to unlock everything
                </Link>
              </div>
            )}

            {isLoaded && !isSignedIn && (
              <div className="px-5 py-4 border-t border-white/[0.06] flex flex-col gap-2">
                <Link
                  href={cta.href}
                  className="block w-full text-center py-3 rounded-full bg-white text-[#0a0a0f] font-semibold text-[14px] hover:bg-zinc-200 transition-colors"
                >
                  {cta.label}
                </Link>
                <Link
                  href="/sign-in"
                  className="block w-full text-center py-3 rounded-full border border-white/[0.12] text-zinc-300 font-medium text-[14px] hover:bg-white/[0.04] transition-colors"
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
