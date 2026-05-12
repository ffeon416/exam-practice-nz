import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ReactNode } from "react";

type CalloutType = "info" | "tip" | "warning";

function Callout({ children, type = "info" }: { children: ReactNode; type?: CalloutType }) {
  const styles: Record<CalloutType, string> = {
    info: "border-indigo-400/40 bg-indigo-500/[0.06]",
    tip: "border-emerald-400/40 bg-emerald-500/[0.06]",
    warning: "border-amber-400/40 bg-amber-500/[0.06]",
  };
  const icons: Record<CalloutType, string> = { info: "💡", tip: "✅", warning: "⚠️" };
  return (
    <div className={`my-6 rounded-xl border-l-4 px-4 py-3 text-zinc-200 ${styles[type]}`}>
      <span className="mr-2" aria-hidden>
        {icons[type]}
      </span>
      {children}
    </div>
  );
}

export const blogMdxComponents: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-10 mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight text-white">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-3 text-xl font-semibold text-white">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2 text-lg font-semibold text-white">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-4 leading-7 text-zinc-300">{children}</p>,
  a: ({ href, children }) => {
    const url = href || "#";
    const isExternal = /^https?:\/\//.test(url);
    const className =
      "text-indigo-400 underline underline-offset-4 hover:text-indigo-300 transition-colors";
    if (isExternal) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      );
    }
    return (
      <Link href={url} className={className}>
        {children}
      </Link>
    );
  },
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6 text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-6 text-zinc-300">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-300 leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-8 border-l-4 border-indigo-400/50 pl-6 italic text-zinc-400">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-100">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 font-mono text-sm text-zinc-100">
      {children}
    </pre>
  ),
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt || ""}
      className="my-8 rounded-xl border border-white/[0.06]"
    />
  ),
  hr: () => <hr className="my-10 border-white/[0.06]" />,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
  Callout,
};
