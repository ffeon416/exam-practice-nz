#!/usr/bin/env node
// Compile every post in content/blog with the same MDX pipeline the site uses
// (next-mdx-remote/rsc → @mdx-js/mdx, remark-gfm). The site compiles MDX at
// request time, so a syntax slip (a bare `<`, an unbalanced `{`, a broken
// <Callout>) in a QUEUED post would only show up as a crashed page on its
// publish morning. Run this before committing posts:
//   node scripts/check-mdx.mjs
import fs from "fs";
import path from "path";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx")).sort();
let failed = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(BLOG_DIR, f), "utf-8");
  const body = src.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const usesUnknown = (body.match(/<([A-Z][A-Za-z]*)/g) || [])
    .map((m) => m.slice(1))
    .filter((tag) => tag !== "Callout");
  try {
    await compile(body, { remarkPlugins: [remarkGfm], outputFormat: "function-body" });
    if (usesUnknown.length) {
      failed++;
      console.log(`✗ ${f}: uses unknown component(s) ${[...new Set(usesUnknown)].join(", ")} (only <Callout> is registered)`);
    } else {
      console.log(`✓ ${f}`);
    }
  } catch (err) {
    failed++;
    const pos = err?.place ? ` (line ${err.place.start?.line ?? err.place.line})` : "";
    console.log(`✗ ${f}${pos}: ${err.message}`);
  }
}
console.log(failed ? `\n${failed} file(s) failed to compile` : `\nAll ${files.length} posts compile`);
process.exit(failed ? 1 : 0);
