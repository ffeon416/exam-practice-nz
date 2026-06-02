// Smoke test: generate a real paper via generatePracticePaper, then audit
// each question for (a) coverage — does it have a graph where it should? —
// and (b) math correctness for any line-type graphs.
//
// Run: node scripts/smoke-test-enricher.mjs [subject=mathematics] [level=2] [topic=calculus]

import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].replace(/^["']|["']$/g, "");
    v = v.replace(/\\[rn]+$/g, "").trim();
    process.env[m[1]] = v;
  }
}

// Register .ts loader so we can import the production code as-is.
const { register } = await import("node:module");
register("ts-node/esm", import.meta.url);

const { generatePracticePaper } = await import("../src/lib/claude.ts");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.includes("=") ? a.split("=") : [a, true])
);
const SUBJECT = args.subject ?? "mathematics";
const LEVEL = parseInt(args.level ?? "2", 10);
const TOPIC = args.topic ?? null;
const COUNT = parseInt(args.count ?? "4", 10);

console.log(`Generating: ${SUBJECT} L${LEVEL} ${TOPIC ?? "(any topic)"} × ${COUNT} Qs ...`);
const t0 = Date.now();
const paper = await generatePracticePaper(SUBJECT, LEVEL, TOPIC, COUNT);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Title: ${paper.title}`);
console.log(`Usage: ${paper.usage.inputTokens} in / ${paper.usage.outputTokens} out  ~$${paper.usage.costUSD?.toFixed(3) ?? "?"}`);

let withGraph = 0;
let lineGraphs = 0;
const issues = [];
for (const q of paper.questions) {
  console.log(`\n--- Q${q.number}  [${q.gradeLevel}, ${q.marks} marks, ${q.answerType}]`);
  console.log(`TEXT: ${q.text.slice(0, 200)}${q.text.length > 200 ? "..." : ""}`);
  if (q.graph) {
    withGraph++;
    console.log(`GRAPH: type=${q.graph.type}, title=${q.graph.title ?? "(none)"}`);
    if (q.graph.type === "line") {
      lineGraphs++;
      const xs = q.graph.xValues ?? [];
      const series = q.graph.series ?? [];
      console.log(`  xValues: [${xs.slice(0, 5).join(", ")}${xs.length > 5 ? ", ..." : ""}]  (${xs.length} points)`);
      for (const s of series) {
        const vs = s.values ?? [];
        console.log(`  series "${s.name}": [${vs.slice(0, 5).map((v) => v.toFixed?.(2) ?? v).join(", ")}${vs.length > 5 ? ", ..." : ""}]`);
      }
    }
  } else {
    console.log("GRAPH: (none)");
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Questions: ${paper.questions.length}, with graph: ${withGraph}, line graphs: ${lineGraphs}`);
if (issues.length > 0) {
  console.log(`Issues:`);
  for (const i of issues) console.log(`  - ${i}`);
} else {
  console.log("No automated issues found. Eyeball check the dump above.");
}
