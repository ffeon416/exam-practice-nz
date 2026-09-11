/**
 * Outbound Citation Injector
 *
 * Sister script to interlink-posts.ts. Where that one injects INTERNAL links
 * (to other blog posts), this injects OUTBOUND citations to authoritative
 * external sources (NZQA, cognitive-science references on Wikipedia, etc.).
 *
 * Why: authoritative outbound links signal quality to Google and to the AI
 * systems that summarise the web. Posts written quickly tend to have none.
 *
 * How it works:
 *   1. Load content/interlinking/citation-map.json (phrase → URL)
 *   2. For each blog post:
 *      a. Skip URLs already cited anywhere in the post
 *      b. Find the first natural occurrence of a phrase (outside headings,
 *         code blocks, Callouts, existing links, frontmatter)
 *      c. Wrap it in [phrase](url)
 *      d. Cap at MAX_CITATIONS_PER_POST per file
 *
 * Safety rules:
 *   - Phrases under 2 words are skipped
 *   - Keys prefixed with "_" are comments / source markers, skipped
 *   - Each URL is cited at most once per post
 *   - Existing manual citations are preserved
 *   - Every URL must sit on the allowlist in scripts/validate-blog.py — the
 *     validator rejects anything else, so keep the map on those domains.
 *
 * Usage:
 *   npx tsx scripts/inject-citations.ts          # apply
 *   npx tsx scripts/inject-citations.ts --dry    # preview without writing
 *
 * Runs automatically in `npm run process-blog` and the `prebuild` hook.
 */

import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const CITATION_MAP_PATH = path.join(process.cwd(), "content/interlinking/citation-map.json");
const MAX_CITATIONS_PER_POST = 3;
// Citation phrases can be 2 words (lower than the internal-link 3-word
// minimum) because citations fire once per URL per post — no over-firing risk.
const MIN_PHRASE_WORDS = 2;

interface CitationMap {
  [phrase: string]: string;
}

interface Injection {
  postSlug: string;
  phrase: string;
  url: string;
  position: number; // % through the post
}

function isInCodeBlock(content: string, position: number): boolean {
  const before = content.substring(0, position);
  return (before.match(/```/g) || []).length % 2 === 1;
}

function isInHeading(content: string, position: number): boolean {
  const lineStart = content.lastIndexOf("\n", position - 1) + 1;
  return /^#{1,6}\s/.test(content.substring(lineStart, position + 50));
}

function isInCallout(content: string, position: number): boolean {
  const before = content.substring(0, position);
  const after = content.substring(position);
  const open = before.lastIndexOf("<Callout");
  const close = before.lastIndexOf("</Callout>");
  if (open === -1 || close > open) return false;
  return after.includes("</Callout>");
}

function getLinkRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  // Match [text](url) AND bare [text] placeholders — skip both
  const re = /\[([^\[\]]+)\](\([^()\s]+\))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isInExistingLink(content: string, position: number): boolean {
  for (const [start, end] of getLinkRanges(content)) {
    if (position >= start && position < end) return true;
  }
  return false;
}

function isInFrontmatter(content: string, position: number): boolean {
  const first = content.indexOf("---");
  if (first === -1) return false;
  const second = content.indexOf("---", first + 3);
  if (second === -1) return false;
  return position >= first && position <= second + 3;
}

function isInUrl(content: string, position: number): boolean {
  const before = content.substring(Math.max(0, position - 100), position);
  return /https?:\/\/[^\s]*$/.test(before) || /\]\([^\)]*$/.test(before);
}

function findFirstValidOccurrence(phrase: string, content: string): number | null {
  const lower = phrase.toLowerCase();
  const lowerContent = content.toLowerCase();
  let start = 0;
  while (start < content.length) {
    const idx = lowerContent.indexOf(lower, start);
    if (idx === -1) return null;
    if (
      !isInFrontmatter(content, idx) &&
      !isInCodeBlock(content, idx) &&
      !isInHeading(content, idx) &&
      !isInCallout(content, idx) &&
      !isInExistingLink(content, idx) &&
      !isInUrl(content, idx)
    ) {
      const before = idx > 0 ? content[idx - 1] : " ";
      const after = content[idx + phrase.length] || " ";
      const validBoundary = /[\s.,;:!?'"()\[\]{}<>-]|^|$/;
      if (validBoundary.test(before) && validBoundary.test(after)) {
        return idx;
      }
    }
    start = idx + 1;
  }
  return null;
}

function injectCitation(content: string, position: number, phrase: string, url: string): string {
  const original = content.substring(position, position + phrase.length);
  return (
    content.substring(0, position) +
    `[${original}](${url})` +
    content.substring(position + phrase.length)
  );
}

function extractSlug(filename: string): string {
  const noExt = filename.replace(".mdx", "");
  return /^\d{4}-\d{2}-\d{2}-/.test(noExt) ? noExt.replace(/^\d{4}-\d{2}-\d{2}-/, "") : noExt;
}

/**
 * Split a post into its raw frontmatter block and body WITHOUT re-serialising
 * the YAML. gray-matter's stringify rewrites quotes, folds long strings and
 * expands arrays, which breaks scripts/validate-blog.py's regex parsing (it
 * saw `date: '2026-09-14'` and `description: >-`). We only ever change the
 * body, so the frontmatter goes back byte-for-byte.
 */
function splitFrontmatter(fileContent: string): { head: string; body: string } {
  const m = fileContent.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!m) return { head: "", body: fileContent };
  return { head: m[0], body: fileContent.slice(m[0].length) };
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).length;
}

function processPost(filename: string, citationMap: CitationMap, dryRun: boolean) {
  const filePath = path.join(BLOG_DIR, filename);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { head, body } = splitFrontmatter(fileContent);
  const postSlug = extractSlug(filename);

  let modifiedContent = body;
  let citationsAdded = 0;
  const injections: Injection[] = [];
  const citedUrls = new Set<string>();

  // Pre-populate with URLs already present in the post
  const existingExternalLinks = modifiedContent.match(/\]\((https?:\/\/[^)]+)\)/g) || [];
  existingExternalLinks.forEach((link) => {
    const m = link.match(/\]\((https?:\/\/[^)]+)\)/);
    if (m) citedUrls.add(m[1]);
  });

  // Longer phrases first — specificity wins
  const sortedPhrases = Object.entries(citationMap)
    .filter(([phrase]) => !phrase.startsWith("_"))
    .filter(([phrase, url]) => countWords(phrase) >= MIN_PHRASE_WORDS && !citedUrls.has(url))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, url] of sortedPhrases) {
    if (citationsAdded >= MAX_CITATIONS_PER_POST) break;
    if (citedUrls.has(url)) continue;

    const position = findFirstValidOccurrence(phrase, modifiedContent);
    if (position !== null) {
      const percent = Math.round((position / modifiedContent.length) * 100);
      modifiedContent = injectCitation(modifiedContent, position, phrase, url);
      citationsAdded++;
      citedUrls.add(url);
      injections.push({ postSlug, phrase, url, position: percent });
    }
  }

  if (injections.length > 0 && !dryRun) {
    fs.writeFileSync(filePath, head + modifiedContent);
  }

  return { modified: injections.length > 0, injections };
}

async function main() {
  const dryRun = process.argv.includes("--dry");

  console.log("=".repeat(60));
  console.log("Outbound Citation Injector");
  console.log("=".repeat(60));
  if (dryRun) console.log("[DRY RUN — no files will be modified]");
  console.log("");

  if (!fs.existsSync(CITATION_MAP_PATH)) {
    console.error(`Citation map not found at: ${CITATION_MAP_PATH}`);
    process.exit(1);
  }

  const citationMap: CitationMap = JSON.parse(fs.readFileSync(CITATION_MAP_PATH, "utf-8"));
  const phraseCount = Object.keys(citationMap).filter((k) => !k.startsWith("_")).length;
  console.log(`Loaded ${phraseCount} citation phrases`);

  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`Blog directory not found: ${BLOG_DIR}`);
    process.exit(1);
  }

  const postFiles = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${postFiles.length} blog posts\n`);

  let totalModified = 0;
  let totalInjections = 0;
  const urlCounts: Record<string, number> = {};

  for (const filename of postFiles) {
    const result = processPost(filename, citationMap, dryRun);
    if (result.modified) {
      totalModified++;
      totalInjections += result.injections.length;
      console.log(`  ${extractSlug(filename)}: +${result.injections.length} citations`);
      result.injections.forEach((inj) => {
        const host = new URL(inj.url).host;
        console.log(`    → "${inj.phrase}" → ${host} (at ${inj.position}%)`);
        urlCounts[inj.url] = (urlCounts[inj.url] || 0) + 1;
      });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Posts modified: ${totalModified}`);
  console.log(`Total citations injected: ${totalInjections}`);

  const topUrls = Object.entries(urlCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topUrls.length > 0) {
    console.log("\nTop-cited sources:");
    topUrls.forEach(([url, count]) => console.log(`  ${count} → ${new URL(url).host}`));
  }

  if (dryRun) console.log("\n[DRY RUN] No files written. Re-run without --dry to apply.");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
