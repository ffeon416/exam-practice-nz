"use client";

import { Fragment, type ReactNode } from "react";

// Minimal markdown renderer for AI-generated content.
// Supports: # ## ### headings, **bold**, *italic*, `code`, - / * bullets,
// 1. numbered lists, blank-line paragraphs, single-line soft breaks.
// Deliberately not a full CommonMark implementation — just the patterns
// Claude actually produces in lessons, feedback, and tutor responses.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  // Order matters: code first (so its contents aren't re-parsed), then bold, then italic.
  // Regex captures the delimiter group so we can split + map in one pass.
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  const parts = text.split(pattern);

  parts.forEach((part, i) => {
    if (!part) return;
    const k = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      tokens.push(
        <strong key={k} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      tokens.push(
        <code
          key={k}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[0.92em] font-mono text-indigo-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      tokens.push(
        <em key={k} className="italic text-zinc-100">
          {part.slice(1, -1)}
        </em>
      );
    } else {
      tokens.push(<Fragment key={k}>{part}</Fragment>);
    }
  });

  return tokens;
}

// Soft-break a line (single \n inside a paragraph stays as <br/>).
function renderLine(line: string, keyPrefix: string): ReactNode[] {
  const segments = line.split("\n");
  const out: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (i > 0) out.push(<br key={`${keyPrefix}-br-${i}`} />);
    out.push(...renderInline(seg, `${keyPrefix}-${i}`));
  });
  return out;
}

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function parseBlocks(src: string): Block[] {
  // Normalise + split on blank lines.
  const chunks = src.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    // Heading: lines starting with #/##/### (only if the whole chunk is one heading line).
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(chunk);
    if (headingMatch && !chunk.includes("\n")) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: headingMatch[2] });
      continue;
    }

    // Bullet list: every non-empty line starts with - or *
    const lines = chunk.split("\n");
    const allBullets = lines.every((l) => /^\s*[-*]\s+/.test(l));
    if (allBullets) {
      blocks.push({
        kind: "ul",
        items: lines.map((l) => l.replace(/^\s*[-*]\s+/, "")),
      });
      continue;
    }

    // Numbered list: every line starts with N.
    const allNumbered = lines.every((l) => /^\s*\d+\.\s+/.test(l));
    if (allNumbered) {
      blocks.push({
        kind: "ol",
        items: lines.map((l) => l.replace(/^\s*\d+\.\s+/, "")),
      });
      continue;
    }

    blocks.push({ kind: "p", text: chunk });
  }

  return blocks;
}

interface MarkdownProps {
  text: string;
  /** Override the default text color (e.g. "text-zinc-300") */
  className?: string;
  /** Tighter spacing for inline-feeling contexts (tutor chat, feedback) */
  compact?: boolean;
}

export function Markdown({ text, className, compact = false }: MarkdownProps) {
  if (!text) return null;
  const blocks = parseBlocks(text);
  const gap = compact ? "space-y-2" : "space-y-3.5";
  const base = className ?? "text-zinc-300 text-[14px] leading-relaxed";

  return (
    <div className={`${base} ${gap}`}>
      {blocks.map((b, i) => {
        const k = `b-${i}`;
        if (b.kind === "heading") {
          if (b.level === 1)
            return (
              <h3 key={k} className="text-white font-extrabold text-[18px] tracking-tight mt-1">
                {renderInline(b.text, k)}
              </h3>
            );
          if (b.level === 2)
            return (
              <h4 key={k} className="text-white font-bold text-[16px] tracking-tight mt-1">
                {renderInline(b.text, k)}
              </h4>
            );
          return (
            <h5 key={k} className="text-zinc-100 font-semibold text-[14px] uppercase tracking-wider mt-1">
              {renderInline(b.text, k)}
            </h5>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={k} className="list-disc pl-5 space-y-1.5 marker:text-indigo-400">
              {b.items.map((item, j) => (
                <li key={`${k}-${j}`}>{renderLine(item, `${k}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={k} className="list-decimal pl-5 space-y-1.5 marker:text-indigo-400 marker:font-bold">
              {b.items.map((item, j) => (
                <li key={`${k}-${j}`} className="pl-1">
                  {renderLine(item, `${k}-${j}`)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={k}>{renderLine(b.text, k)}</p>
        );
      })}
    </div>
  );
}
