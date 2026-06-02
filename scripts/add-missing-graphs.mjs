// One-shot pass over every static exam JSON: ask Claude (Haiku 4.5) whether
// each graph-less question would benefit from a graph/chart/table/diagram,
// and if so generate matching GraphData. Writes results back in place.
//
// Run: node scripts/add-missing-graphs.mjs [--dry] [--subject=mathematics] [--limit=20]
//
// Requires ANTHROPIC_API_KEY in env (auto-loaded from .env.local).

import fs from "node:fs";
import path from "node:path";

// Load .env.local manually (no SDK dependency).
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      // Strip surrounding quotes AND any literal `\n` / `\r` escape sequences
      // the user may have accidentally written into the file as text.
      let v = m[2].replace(/^["']|["']$/g, "");
      v = v.replace(/\\[rn]+$/g, "").trim();
      process.env[m[1]] = v;
    }
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY not set");
  process.exit(1);
}

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const DRY = args.has("dry");
const SUBJECT_FILTER = args.get("subject");
const LIMIT = args.has("limit") ? parseInt(args.get("limit"), 10) : Infinity;
const CONCURRENCY = 6;
const MODEL = "claude-sonnet-4-5-20250929";

const EXAM_DIR = "src/data/exams";

const GRAPH_SCHEMA = `GraphData TypeScript shape:
type GraphData = {
  type: "bar" | "line" | "pie" | "scatter" | "box-plot" | "histogram" | "table" | "number-line";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data?: ...;       // depends on type — see below
  xValues?: number[];
  series?: { name: string; values: number[]; color?: string }[];
  values?: number[];
};

By type:
bar       data = [{label, value, color?}, ...]
line      xValues = [...], series = [{name, values: [...]}, ...]
pie       data = [{label, value}, ...]
scatter   data = [[x,y], [x,y], ...]
box-plot  data = [{label:"min", value}, {label:"Q1", value}, {label:"median", value}, {label:"Q3", value}, {label:"max", value}]  (EXACTLY 5, in order)
histogram data = [{label:"0-10", value:3}, {label:"10-20", value:7}, ...]
table     data = {headers: [...], rows: [[...], [...]]}
number-line  xValues = [leftEnd, rightEnd], data = [{label, value}, ...]`;

function buildPrompt(q, exam) {
  return `You are auditing an NCEA practice exam question to decide whether adding a graph/chart/table/diagram would meaningfully help the student understand or answer it. You produce data that gets rendered as an SVG visual in a web UI.

EXAM CONTEXT:
- Subject: ${exam.subject}
- NCEA Level: ${exam.level}  (0=Year 10, 1=NCEA L1, 2=L2, 3=L3)
- Standard: ${exam.standard}
- Year: ${exam.year}

QUESTION:
${q.text}

MARKING GUIDE (the source of truth for what the correct answer/data is):
${q.markingGuide ?? "(no marking guide)"}

EXPECTED ANSWER:
${q.expectedAnswer ?? "(none)"}

ANSWER TYPE: ${q.answerType}
MARKS: ${q.marks}

DECISION RULES:
1. **SKIP** (no graph) when:
   - The question is a pure calculation with all numerical inputs already in the text (e.g. "calculate the pH of a 0.45 mol/L solution")
   - It's a definition / explain / describe / discuss / essay question with no data to visualise
   - It's a chemical equation balancing, naming, or structural-formula question (those are textual)
   - The "visual" would be a single trivial data point (1-2 numbers) — just keep it in text
   - It's an English / literature / te-reo essay or interpretation question
   - It's history / classical studies / art history with no quantitative data
2. **ADD a graph** when:
   - The question references data the student must read off (multiple data points, distribution, time series, comparison)
   - It's a function / curve / parabola / cubic / exponential / trig graph question — show the function so the student can sketch its derivative, identify features, etc.
   - It involves supply & demand, market equilibrium, PPF, AD/AS, or other economics curves
   - It's about a chemical reaction with multiple species/conditions — a table can clarify
   - It compares two or more categorical values (bar chart) or shows a distribution (histogram)
   - It involves a sequence of steps, observations, or data the student must complete (table)
   - It's a statistics question about a dataset (scatter, box-plot, histogram)

ABSOLUTE CORRECTNESS RULES (if you add a graph):
- Every number / label in the graph MUST exactly match the marking guide's working. If the guide says "the rate is 25%", the graph must show 25%.
- Internally consistent: a "supply and demand" graph must actually intersect at the stated equilibrium.
- Use \`type: "table"\` for any structured-rows data (financial statements, chemical observations, comparisons).
- Smooth curves (parabola, cubic, exponential) need ≥10 xValues for the line to look smooth.
- Box-plot data must have exactly 5 entries in order: min, Q1, median, Q3, max.
- Never invent data that contradicts the question; if you can't construct a faithful graph from the given info, SKIP instead.

ABSOLUTE DON'TS (return {"skip": true} instead):
- DO NOT give away the answer. If the Q asks "what is X?" don't put X on the graph. The graph shows the QUESTION's data, never the SOLUTION's data.
- DO NOT use scatter / line / bar to "draw a shape" (circle, triangle, the final figure of a geometry Q). Our renderer only does proper data charts — it cannot draw geometric figures, diagrams of objects, free-body diagrams, circuit diagrams, anatomical drawings, maps, molecular structures, or any visual that isn't a numerical data chart or table.
- DO NOT add a graph that "shows the answer the student should produce" (e.g. the resulting sketch, the trajectory the student should compute). The graph must show GIVEN data only.
- DO NOT add a graph to "draw / sketch / plot / construct / label" questions where the student is being asked to produce the visual themselves.
- DO NOT use chart types beyond the 8 listed. There is no "diagram" type. If the natural visual is a circuit / map / structure / scheme / free-body diagram, SKIP — those don't exist in this renderer.
- DO NOT add a table that just restates a single sentence or 1-2 numbers already in the text. A table is for ≥2 rows × ≥2 cols of structured data.
- DO NOT add a graph to pure essay / discuss / explain / define questions in english / history / classical-studies / art-history / te-reo / media-studies / health / social-studies — even if data is mentioned in passing.

WHEN IN DOUBT, SKIP. A missing graph is fine; a wrong/misleading/answer-leaking graph is worse than nothing.

${GRAPH_SCHEMA}

OUTPUT — respond ONLY with valid JSON, no markdown, no code fences, one of:
{"skip": true, "reason": "<one short sentence>"}
OR
{"graph": <GraphData object>, "reason": "<one short sentence on why this graph helps>"}`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content[0]?.text ?? "";
  return { text, usage: data.usage };
}

function tryParse(text) {
  let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found");
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

// Same regex set as src/lib/questionGuard.ts — only ADD a graph if the Q is
// already safe-looking (no missing-visual reference). The questionGuard fix
// handles broken Qs; this script focuses on enrichment.
function questionAlreadyHasOrNeedsManual(q) {
  return Boolean(q.graph || q.image);
}

async function processOne(q, exam) {
  if (questionAlreadyHasOrNeedsManual(q)) return { action: "had-graph" };
  const prompt = buildPrompt(q, exam);
  const { text, usage } = await callClaude(prompt);
  let parsed;
  try {
    parsed = tryParse(text);
  } catch (e) {
    return { action: "parse-fail", err: e.message, raw: text.slice(0, 200), usage };
  }
  if (parsed.skip) return { action: "skipped", reason: parsed.reason, usage };
  if (parsed.graph && parsed.graph.type) {
    return { action: "graph-added", graph: parsed.graph, reason: parsed.reason, usage };
  }
  return { action: "unknown", raw: text.slice(0, 200), usage };
}

async function processBatch(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const r = await processOne(item.q, item.exam);
      return { ...item, ...r };
    } catch (e) {
      return { ...item, action: "error", err: e.message };
    }
  }));
}

async function main() {
  const files = fs.readdirSync(EXAM_DIR).filter((f) => f.endsWith(".json")).sort();
  const work = [];

  for (const file of files) {
    const fp = path.join(EXAM_DIR, file);
    const exam = JSON.parse(fs.readFileSync(fp, "utf-8"));
    if (SUBJECT_FILTER && exam.subject !== SUBJECT_FILTER) continue;
    for (const q of exam.questions ?? []) {
      if (q.graph || q.image) continue;
      work.push({ file, fp, q, exam });
    }
  }

  const todo = work.slice(0, LIMIT);
  console.log(`Found ${work.length} graph-less Qs; processing ${todo.length}.`);
  if (DRY) console.log("DRY RUN — no JSONs will be written.");

  const stats = { added: 0, skipped: 0, errors: 0, parseFails: 0, hadGraph: 0 };
  let totalInTokens = 0, totalOutTokens = 0;
  // Group by file so we batch writes per file.
  const fileChanges = new Map();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const slice = todo.slice(i, i + CONCURRENCY);
    const results = await processBatch(slice);
    for (const r of results) {
      if (r.usage) {
        totalInTokens += r.usage.input_tokens ?? 0;
        totalOutTokens += r.usage.output_tokens ?? 0;
      }
      if (r.action === "graph-added") {
        stats.added++;
        if (!fileChanges.has(r.fp)) fileChanges.set(r.fp, JSON.parse(fs.readFileSync(r.fp, "utf-8")));
        const exam = fileChanges.get(r.fp);
        const target = exam.questions.find((qq) => qq.id === r.q.id);
        if (target) target.graph = r.graph;
        console.log(`  + ${r.q.id}  [${r.graph.type}]  ${r.reason?.slice(0, 100) ?? ""}`);
      } else if (r.action === "skipped") {
        stats.skipped++;
        if (process.env.LOG_SKIPS) console.log(`  - ${r.q.id}: ${r.reason?.slice(0, 100)}`);
      } else if (r.action === "parse-fail") {
        stats.parseFails++;
        console.warn(`  ! parse-fail ${r.q.id}: ${r.err}`);
      } else if (r.action === "error") {
        stats.errors++;
        console.warn(`  ! error ${r.q.id}: ${r.err}`);
      } else if (r.action === "had-graph") {
        stats.hadGraph++;
      } else {
        console.warn(`  ? unknown ${r.q.id}`);
      }
    }
    const inK = (totalInTokens / 1000).toFixed(1);
    const outK = (totalOutTokens / 1000).toFixed(1);
    const PRICING = { "claude-sonnet-4-5-20250929": [3, 15], "claude-sonnet-4-6": [3, 15], "claude-haiku-4-5-20251001": [0.8, 4] };
    const [inP, outP] = PRICING[MODEL] ?? [0.8, 4];
    const cost = (totalInTokens * inP / 1e6 + totalOutTokens * outP / 1e6).toFixed(3);
    console.log(`[${i + slice.length}/${todo.length}] added=${stats.added} skipped=${stats.skipped} errors=${stats.errors} parseFails=${stats.parseFails}  tokens ${inK}k in / ${outK}k out  ~$${cost}`);
  }

  if (!DRY) {
    for (const [fp, exam] of fileChanges) {
      fs.writeFileSync(fp, JSON.stringify(exam, null, 2) + "\n");
    }
    console.log(`Wrote ${fileChanges.size} file(s).`);
  }

  console.log(`\nFinal: added=${stats.added} skipped=${stats.skipped} errors=${stats.errors} parseFails=${stats.parseFails}`);
  console.log(`Tokens: ${totalInTokens} in / ${totalOutTokens} out`);
  const PRICING_FINAL = { "claude-sonnet-4-5-20250929": [3, 15], "claude-sonnet-4-6": [3, 15], "claude-haiku-4-5-20251001": [0.8, 4] };
  const [inP, outP] = PRICING_FINAL[MODEL] ?? [0.8, 4];
  const cost = totalInTokens * inP / 1e6 + totalOutTokens * outP / 1e6;
  console.log(`Estimated cost: $${cost.toFixed(3)} USD (${MODEL})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
