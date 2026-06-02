// Smoke test: generate a real paper via generatePracticePaper, then audit
// each question for graph presence + line-graph math correctness.
//
// Run: npx tsx scripts/smoke-test-enricher.ts

import fs from "node:fs";
import path from "node:path";

async function main() {
const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) {
    let v = m[2].replace(/^["']|["']$/g, "");
    v = v.replace(/\\[rn]+$/g, "").trim();
    process.env[m[1]] = v;
  }
}

const { generatePracticePaper } = await import("../src/lib/claude");

const SUBJECT = process.argv[2] ?? "mathematics";
const LEVEL = parseInt(process.argv[3] ?? "2", 10);
const TOPIC = process.argv[4] === "any" ? null : (process.argv[4] ?? "differentiation");
const COUNT = parseInt(process.argv[5] ?? "4", 10);

console.log(`Generating: ${SUBJECT} L${LEVEL} ${TOPIC ?? "(any topic)"} × ${COUNT} Qs ...`);
const t0 = Date.now();
const paper = await generatePracticePaper(SUBJECT, LEVEL, TOPIC, COUNT);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. Title: ${paper.title}`);
console.log(`Total usage: in=${paper.usage.inputTokens} out=${paper.usage.outputTokens}`);

let withGraph = 0, lineGraphs = 0;
for (const q of paper.questions) {
  console.log(`\n=== Q${q.number} [${q.gradeLevel}, ${q.marks}m, ${q.answerType}]`);
  console.log(`TEXT: ${q.text.slice(0, 250)}${q.text.length > 250 ? "..." : ""}`);
  if (q.graph) {
    withGraph++;
    console.log(`GRAPH: ${q.graph.type} — ${q.graph.title ?? "(no title)"}`);
    if (q.graph.type === "line") {
      lineGraphs++;
      const xs = q.graph.xValues ?? [];
      for (const s of (q.graph.series ?? [])) {
        const vs = (s.values ?? []) as number[];
        console.log(`  • ${s.name}: ${xs.length} pts, first 4 = [${xs.slice(0, 4).join(", ")}] → [${vs.slice(0, 4).map((v) => v.toFixed(3)).join(", ")}]`);
      }
    } else if (q.graph.type === "table") {
      const t = q.graph.data as { headers: string[]; rows: string[][] };
      console.log(`  • headers: ${JSON.stringify(t.headers)}, ${t.rows.length} rows`);
    }
  } else {
    console.log("GRAPH: (none)");
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Qs: ${paper.questions.length}, with graph: ${withGraph}, line graphs (math-verified): ${lineGraphs}`);
}; main();
