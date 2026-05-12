// Scans every .mdx in content/blog/, looks up keywords in content/interlinking/keyword-map.json,
// and injects up to MAX_LINKS_PER_POST internal links per post (to canonical destinations).
// Idempotent: skips occurrences inside frontmatter, code blocks, headings, callouts, existing
// links, or raw URLs; also skips if a link to the same target already exists in the post.
//
// Run after publishing new posts:
//   npx tsx scripts/interlink-posts.ts

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const KEYWORD_MAP_PATH = path.join(process.cwd(), "content/interlinking/keyword-map.json");
const MAX_LINKS_PER_POST = 3;
const MIN_KEYWORD_WORDS = 3;

interface KeywordMap {
  [keyword: string]: string;
}
interface LinkInjection {
  sourcePost: string;
  targetSlug: string;
  keyword: string;
  position: number;
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

function isInExistingLink(content: string, position: number): boolean {
  const before = content.substring(Math.max(0, position - 200), position);
  const after = content.substring(position, position + 200);
  const openBracket = before.lastIndexOf("[");
  const closeBracket = before.lastIndexOf("]");
  if (openBracket > closeBracket && /^\s*\]\s*\(/.test(after)) return true;
  const parenOpen = before.lastIndexOf("](");
  const parenClose = before.lastIndexOf(")");
  return parenOpen > parenClose;
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
  return /https?:\/\/[^\s]*$/.test(before) || /\]\([^)]*$/.test(before);
}

function findFirstValidOccurrence(keyword: string, content: string): number | null {
  const lower = keyword.toLowerCase();
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
      const after = content[idx + keyword.length] || " ";
      const valid = /[\s.,;:!?'"()\[\]{}<>-]|^|$/;
      if (valid.test(before) && valid.test(after)) return idx;
    }
    start = idx + 1;
  }
  return null;
}

function injectLink(
  content: string,
  position: number,
  keyword: string,
  targetSlug: string
): string {
  const original = content.substring(position, position + keyword.length);
  return (
    content.substring(0, position) +
    `[${original}](/blog/${targetSlug})` +
    content.substring(position + keyword.length)
  );
}

function extractSlug(filename: string): string {
  const noExt = filename.replace(/\.mdx$/, "");
  return /^\d{4}-\d{2}-\d{2}-/.test(noExt) ? noExt.replace(/^\d{4}-\d{2}-\d{2}-/, "") : noExt;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).length;
}

function processPost(filename: string, keywordMap: KeywordMap, allSlugs: Set<string>) {
  const filePath = path.join(BLOG_DIR, filename);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const postSlug = extractSlug(filename);

  let modifiedContent = content;
  let linksAdded = 0;
  const injections: LinkInjection[] = [];
  const linkedDestinations = new Set<string>();

  (modifiedContent.match(/\]\(\/blog\/([^)]+)\)/g) || []).forEach((link) => {
    const m = link.match(/\]\(\/blog\/([^)]+)\)/);
    if (m) linkedDestinations.add(m[1]);
  });

  const sorted = Object.entries(keywordMap)
    .filter(
      ([k, t]) =>
        t !== postSlug &&
        allSlugs.has(t) &&
        countWords(k) >= MIN_KEYWORD_WORDS &&
        !linkedDestinations.has(t)
    )
    .sort((a, b) => b[0].length - a[0].length);

  for (const [keyword, targetSlug] of sorted) {
    if (linksAdded >= MAX_LINKS_PER_POST) break;
    if (linkedDestinations.has(targetSlug)) continue;
    const pos = findFirstValidOccurrence(keyword, modifiedContent);
    if (pos !== null) {
      const percent = Math.round((pos / modifiedContent.length) * 100);
      modifiedContent = injectLink(modifiedContent, pos, keyword, targetSlug);
      linksAdded++;
      linkedDestinations.add(targetSlug);
      injections.push({ sourcePost: postSlug, targetSlug, keyword, position: percent });
    }
  }

  if (injections.length > 0) {
    fs.writeFileSync(filePath, matter.stringify(modifiedContent, data));
    return { modified: true, injections };
  }
  return { modified: false, injections: [] };
}

async function main() {
  console.log("=".repeat(60));
  console.log("StudyAce blog interlinking");
  console.log("=".repeat(60));

  if (!fs.existsSync(KEYWORD_MAP_PATH)) {
    console.error(`Keyword map not found at: ${KEYWORD_MAP_PATH}`);
    process.exit(1);
  }

  const keywordMap: KeywordMap = JSON.parse(fs.readFileSync(KEYWORD_MAP_PATH, "utf-8"));
  console.log(`Loaded ${Object.keys(keywordMap).length} keywords`);

  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`Blog directory not found: ${BLOG_DIR}`);
    process.exit(1);
  }

  const postFiles = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  const allSlugs = new Set(postFiles.map(extractSlug));
  console.log(`Found ${postFiles.length} blog posts\n`);

  let totalModified = 0;
  let totalInjections = 0;

  for (const filename of postFiles) {
    const result = processPost(filename, keywordMap, allSlugs);
    if (result.modified) {
      totalModified++;
      totalInjections += result.injections.length;
      console.log(`  ${extractSlug(filename)}: +${result.injections.length} links`);
      result.injections.forEach((inj) => {
        console.log(`    → "${inj.keyword}" → ${inj.targetSlug} (at ${inj.position}%)`);
      });
    }
  }

  console.log(`\nPosts modified: ${totalModified}`);
  console.log(`Total links injected: ${totalInjections}`);
  console.log("Done!");
}

main().catch(console.error);
