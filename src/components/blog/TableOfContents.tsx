"use client";

import { useEffect, useState } from "react";

interface Section {
  text: string;
  id: string;
}

interface TableOfContentsProps {
  sections: Section[];
  variant: "mobile" | "desktop";
}

/**
 * "In this guide" for long posts. Two placements:
 *   - mobile: collapsible <details> above the article body
 *   - desktop: sticky aside beside the article
 * Both track scroll and highlight the section currently in view. Sections
 * come from lib/headingId.ts extractH2s, so the ids match the h2 renderer.
 */
export function TableOfContents({ sections, variant }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (sections.length === 0) return;
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  const handleClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileOpen(false);
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
  };

  if (variant === "mobile") {
    return (
      <details
        open={mobileOpen}
        onToggle={(e) => setMobileOpen(e.currentTarget.open)}
        className="lg:hidden mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
      >
        <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.18em] font-bold text-indigo-400">
          In this guide
        </summary>
        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2 text-sm">
          {sections.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="text-zinc-600 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <a
                href={`#${s.id}`}
                onClick={(e) => handleClick(s.id, e)}
                className={
                  activeId === s.id
                    ? "text-white font-medium"
                    : "text-zinc-400 hover:text-white transition-colors"
                }
              >
                {s.text}
              </a>
            </li>
          ))}
        </ol>
      </details>
    );
  }

  return (
    <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-indigo-400 mb-3">
        In this guide
      </p>
      <nav className="pl-3 border-l border-white/[0.08]">
        {sections.map((s) => {
          const active = activeId === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => handleClick(s.id, e)}
              className={
                "block py-1.5 text-sm leading-snug transition-colors " +
                (active
                  ? "text-indigo-300 font-medium -ml-[13px] pl-3 border-l-2 border-indigo-400"
                  : "text-zinc-500 hover:text-zinc-200")
              }
            >
              {s.text}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
