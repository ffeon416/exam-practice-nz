"use client";

// The coach app's left sidebar (desktop). Logo, the four pages, and at the
// bottom the link to the dashboard (/profile: progress, plan, refer,
// account). No header anywhere. On phones this collapses into BottomTabs.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTier } from "@/hooks/useTier";
import { useExamDue } from "@/components/ExamGate";

export const COACH_ROUTE = /^\/(today|schedule|lesson|pace|streak|subjects|review|dashboard|plan|refer|exam|profile|welcome)(\/|$)/;
export const IN_PAPER = /^\/exam\/[^/]+$/;

const sw = (a: boolean) => (a ? 2.1 : 1.7);
const ITEMS: { href: string; label: string; icon: (a: boolean) => React.ReactNode; match?: RegExp }[] = [
  { href: "/schedule", label: "Schedule", icon: (a) => (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={sw(a)} stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" /></svg>
  ), match: /^\/(schedule|today|lesson)/ },
  { href: "/pace", label: "Pace", icon: (a) => (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={sw(a)} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 3 5-7 4 4" /><path strokeLinecap="round" d="M17 11h4v4" /></svg>
  ) },
  { href: "/streak", label: "Streak", icon: (a) => (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={sw(a)} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c1 4 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-6 1-8.5z" /></svg>
  ) },
  { href: "/subjects", label: "Practise", icon: (a) => (
    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" strokeWidth={sw(a)} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5c-1.5-1.3-3.5-2-6-2v13c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2v-13c-2.5 0-4.5.7-6 2zM12 6.5v13" /></svg>
  ), match: /^\/(subjects|exam)/ },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { tier, loading } = useTier();
  const examDue = useExamDue(); // exam day reached → the account link glows until the next exam is set

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
      <div className="px-6 pt-7 pb-6">
        <Link href="/schedule" className="font-bold text-white tracking-tight text-[24px]">
          study<span className="text-indigo-400">ace</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3" aria-label="Main">
        {ITEMS.map((it) => {
          const active = it.match ? it.match.test(pathname) : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 mb-1 transition-colors ${active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"}`}>
              <span className={`shrink-0 ${active ? "text-white" : "text-zinc-500"}`}>{it.icon(active)}</span>
              <span className={`flex-1 text-[16px] ${active ? "font-semibold text-white" : "font-medium"}`}>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Plan + account */}
      <div className="p-4 pt-2">
        <Link href={examDue ? "/profile#setup" : "/profile"} className={`flex items-center gap-3.5 rounded-2xl border px-3.5 py-3.5 transition-colors ${examDue ? "sa-attn " : ""}${/^\/(profile|dashboard|refer)/.test(pathname) ? "border-indigo-400/60 bg-indigo-500/[0.16]" : "border-indigo-400/30 bg-indigo-500/[0.08] hover:bg-indigo-500/[0.14] hover:border-indigo-400/50"}`}>
          <span className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-indigo-500/30 ring-2 ring-indigo-400/40 flex items-center justify-center text-indigo-100 text-[18px] font-bold">
            {user?.imageUrl && !user.imageUrl.includes("default") ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" /> : (name[0] ?? "?").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold text-white truncate">{name}</span>
            <span className={`block text-[13px] ${examDue ? "text-white font-semibold" : "text-indigo-200/90"}`}>{examDue ? "Set your next exam" : <>Dashboard &amp; account</>}</span>
          </span>
          <span className="text-indigo-200 text-[18px] shrink-0" aria-hidden>→</span>
        </Link>
      </div>
    </aside>
  );
}
