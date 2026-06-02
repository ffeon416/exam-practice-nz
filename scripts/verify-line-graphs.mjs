// Second pass: ask Sonnet to numerically verify every line-type graph that
// was added to the static exam JSONs. If values are wrong, replace the graph
// with corrected values — or delete the graph if it can't be fixed cleanly.
//
// Run: node scripts/verify-line-graphs.mjs [--dry] [--limit=N]

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].replace(/^["']|["']$/g, "");
      v = v.replace(/\\[rn]+$/g, "").trim();
      process.env[m[1]] = v;
    }
  }
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("No ANTHROPIC_API_KEY"); process.exit(1); }

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const DRY = args.has("dry");
const LIMIT = args.has("limit") ? parseInt(args.get("limit"), 10) : Infinity;
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 6;
const EXAM_DIR = "src/data/exams";

// Find Qs whose graph was added in the current uncommitted diff (i.e. by the
// previous run). We restrict to line-type because that's the math-risky type.
function findRecentlyAddedLineGraphs() {
  const filesRaw = execSync("git diff --name-only src/data/exams/", { encoding: "utf-8" });
  const files = filesRaw.trim().split("\n").filter(Boolean);
  const out = [];
  for (const f of files) {
    const cur = JSON.parse(fs.readFileSync(f, "utf-8"));
    let orig;
    try {
      const txt = execSync(`git show HEAD:${f}`, { encoding: "utf-8" });
      orig = JSON.parse(txt);
    } catch {
      orig = { questions: [] };
    }
    const origGraphIds = new Set(orig.questions.filter((q) => q.graph).map((q) => q.id));
    for (const q of cur.questions) {
      if (q.graph?.type === "line" && !origGraphIds.has(q.id)) {
        out.push({ file: f, q });
      }
    }
  }
  return out;
}

function buildVerifyPrompt(q) {
  const g = q.graph;
  return `You are auditing a line-type graph that was attached to an NCEA practice question. Your job: verify every numerical value on the curve is correct, given the function/relationship described in the question and marking guide. If anything is wrong, return corrected values.

QUESTION TEXT:
${q.text}

MARKING GUIDE:
${q.markingGuide ?? ""}

EXPECTED ANSWER:
${q.expectedAnswer ?? ""}

CURRENT GRAPH (line type):
${JSON.stringify(g, null, 2)}

YOUR TASK:
1. Identify the function or relationship from the question (e.g. "y = 2x³ + 1", "demand curve passing through (2,4) and (8,16)", "supply curve y = 0.5x + 2").
2. Mentally compute y(x) for EACH x in xValues. Show your arithmetic step by step for at least two points to verify.
3. Compare your computed values to the values in the current graph.

Output ONLY valid JSON (no fences, no markdown):

If EVERY value is correct (within ±0.5 numerical tolerance):
{"ok": true, "function": "<the function/relationship you verified, in plain math>"}

If ANY value is wrong, OR you cannot determine a function the values match:
{"fix": <full corrected GraphData object with the same shape (type, title, xLabel, yLabel, xValues, series), but with mathematically correct values>, "function": "<the function>", "reason": "<which values were wrong>"}

If the question doesn't actually have a well-defined function (e.g. it just asks the student to describe trends qualitatively and the graph is decorative):
{"remove": true, "reason": "<why this graph adds no value>"}

CRITICAL: when computing values, double-check each arithmetic step. Cubic functions especially are easy to get wrong — re-do each x³ computation explicitly.`;
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
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data.content[0]?.text ?? "", usage: data.usage };
}

function tryParse(text) {
  let c = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error("No JSON");
  return JSON.parse(c.slice(s, e + 1));
}

async function verifyOne(item) {
  const prompt = buildVerifyPrompt(item.q);
  const { text, usage } = await callClaude(prompt);
  try {
    return { ...item, parsed: tryParse(text), usage };
  } catch (e) {
    return { ...item, err: e.message, raw: text.slice(0, 200), usage };
  }
}

async function main() {
  const todo = findRecentlyAddedLineGraphs().slice(0, LIMIT);
  console.log(`Found ${todo.length} recently-added line graphs to verify.`);
  if (DRY) console.log("DRY RUN.");

  const stats = { ok: 0, fixed: 0, removed: 0, errors: 0 };
  let totalIn = 0, totalOut = 0;
  const writes = new Map();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(verifyOne));
    for (const r of results) {
      if (r.usage) { totalIn += r.usage.input_tokens; totalOut += r.usage.output_tokens; }
      if (r.err) { stats.errors++; console.warn(`  ! ${r.q.id}: ${r.err}`); continue; }
      const p = r.parsed;
      if (p.ok) {
        stats.ok++;
      } else if (p.fix?.type === "line") {
        stats.fixed++;
        console.log(`  ~ ${r.q.id} FIXED (${p.reason?.slice(0, 80) ?? ""}) — ${p.function ?? ""}`);
        if (!writes.has(r.file)) writes.set(r.file, JSON.parse(fs.readFileSync(r.file, "utf-8")));
        const t = writes.get(r.file).questions.find((qq) => qq.id === r.q.id);
        if (t) t.graph = p.fix;
      } else if (p.remove) {
        stats.removed++;
        console.log(`  - ${r.q.id} REMOVED (${p.reason?.slice(0, 80) ?? ""})`);
        if (!writes.has(r.file)) writes.set(r.file, JSON.parse(fs.readFileSync(r.file, "utf-8")));
        const t = writes.get(r.file).questions.find((qq) => qq.id === r.q.id);
        if (t) delete t.graph;
      }
    }
    const cost = (totalIn * 3 / 1e6 + totalOut * 15 / 1e6).toFixed(3);
    console.log(`[${Math.min(i + CONCURRENCY, todo.length)}/${todo.length}] ok=${stats.ok} fixed=${stats.fixed} removed=${stats.removed} err=${stats.errors}  $${cost}`);
  }

  if (!DRY) {
    for (const [fp, exam] of writes) {
      fs.writeFileSync(fp, JSON.stringify(exam, null, 2) + "\n");
    }
    console.log(`Wrote ${writes.size} file(s).`);
  }

  const cost = totalIn * 3 / 1e6 + totalOut * 15 / 1e6;
  console.log(`\nFinal: ok=${stats.ok} fixed=${stats.fixed} removed=${stats.removed} err=${stats.errors}`);
  console.log(`Cost: $${cost.toFixed(3)} (${MODEL})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
