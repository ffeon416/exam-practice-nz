"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

// Shared footer for the public/sales pages. Signed-out visitors get the
// conversion links up front (grade check, pricing); everything that used to
// crowd the header (schools, contact, Discord, redeem, legal) lives here.
export default function SiteFooter() {
  const { isSignedIn, isLoaded } = useAuth();
  const authed = isLoaded && isSignedIn;
  const year = new Date().getFullYear();

  const product = authed
    ? [
        { href: "/subjects", label: "Practice exams" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/review", label: "Review" },
        { href: "/plan", label: "Study plan" },
      ]
    : [
        { href: "/grade", label: "Free grade check" },
        { href: "/pricing", label: "Pricing" },
        { href: "/global", label: "Exam systems" },
        { href: "/schools", label: "For schools" },
      ];

  const resources = [
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
    { href: "/refer", label: "Refer a friend", authedOnly: true },
    { href: "/redeem", label: "Redeem a code" },
  ].filter((l) => !l.authedOnly || authed);

  return (
    <footer className="border-t border-white/[0.06] bg-[#06060a]">
      <div className="max-w-5xl mx-auto px-5 py-12 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-6">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="font-semibold text-white tracking-tight text-[18px]">
              study<span className="text-indigo-400">ace</span>
            </Link>
            <p className="text-zinc-500 text-[13px] leading-relaxed mt-3 max-w-xs">
              Unlimited exam-style practice, marked as honestly as an examiner would, with a plan to the target grade. For NCEA, HSC, QCE, GCSE and more.
            </p>
            {!authed && (
              <Link href="/grade"
                className="inline-flex items-center gap-2 mt-5 text-[13px] font-semibold text-indigo-300 hover:text-white transition-colors">
                See the grade they&apos;d get today <span aria-hidden>→</span>
              </Link>
            )}
          </div>

          <FooterCol title="Product" links={product} />
          <FooterCol title="Resources" links={resources} />
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">Company</p>
            <ul className="space-y-2">
              <li><a href="https://discord.gg/3sGUANx7uW" target="_blank" rel="noopener noreferrer" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Discord community</a></li>
              <li><Link href="/privacy" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px] text-zinc-600">
          <p>© {year} StudyAce</p>
          <p className="font-mono tracking-tight">cancel anytime · 30-day money back · billed in NZD by Stripe</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[13px] text-zinc-400 hover:text-white transition-colors">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
