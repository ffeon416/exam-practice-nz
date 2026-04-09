"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/subjects", label: "Exams" },
  { href: "/practice", label: "Fix Weak Spots" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-5 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold text-white text-[13px] tracking-tight">
          study<span className="text-indigo-400">ace</span>
        </Link>
        <div className="flex gap-0.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                  ? "text-white bg-white/[0.08]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
