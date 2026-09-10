// Stable anchor ids for blog headings, shared by the MDX h2 renderer and the
// table of contents so "#section" links always match what's on the page.
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** H2 headings from raw markdown, skipping fenced code blocks. */
export function extractH2s(markdown: string): { text: string; id: string }[] {
  const out: { text: string; id: string }[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    // Strip inline markdown (links, emphasis, code) so the id matches rendered text.
    const text = m[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .trim();
    out.push({ text, id: headingId(text) });
  }
  return out;
}
