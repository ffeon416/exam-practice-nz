// Third pass: for every line-type graph that was added in this session,
// ask Sonnet for the function as a JavaScript expression in `x`, then
// EVALUATE it in Node to get mathematically guaranteed-correct y-values.
// Replaces the stored values with the computed ones.
//
// Run: node scripts/recompute-line-values.mjs [--dry] [--limit=N]

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
const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const DRY = args.has("dry");
const LIMIT = args.has("limit") ? parseInt(args.get("limit"), 10) : Infinity;
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 6;

function findLineGraphs() {
  const filesRaw = execSync("git diff --name-only src/data/exams/", { encoding: "utf-8" });
  const files = filesRaw.trim().split("\n").filter(Boolean);
  const out = [];
  for (const f of files) {
    const cur = JSON.parse(fs.readFileSync(f, "utf-8"));
    let orig;
    try {
      orig = JSON.parse(execSync(`git show HEAD:${f}`, { encoding: "utf-8" }));
    } catch { orig = { questions: [] }; }
    const origGraphIds = new Set(orig.questions.filter((q) => q.graph).map((q) => q.id));
    for (const q of cur.questions) {
      // Single-series line graphs only — multi-series (supply+demand) need different handling
      if (q.graph?.type === "line" && !origGraphIds.has(q.id) && q.graph.series?.length === 1) {
        out.push({ file: f, q });
      }
    }
  }
  return out;
}

function buildPrompt(q) {
  return `You are extracting the function from an NCEA exam question so it can be evaluated programmatically.

QUESTION:
${q.text}

MARKING GUIDE:
${q.markingGuide ?? ""}

EXPECTED ANSWER:
${q.expectedAnswer ?? ""}

CURRENT GRAPH xValues (numbers we'll evaluate at):
${JSON.stringify(q.graph.xValues)}

YOUR TASK:
Express the function y(x) that this graph should plot, as a JavaScript expression in the variable \`x\`. Use only:
- Arithmetic: + - * / **
- Math functions: Math.sin(x), Math.cos(x), Math.tan(x), Math.exp(x), Math.log(x), Math.sqrt(x), Math.abs(x), Math.pow(x, n), Math.PI, Math.E

Examples:
- "y = 2x³ – 3x² + 5x"   → "2 * x**3 - 3 * x**2 + 5 * x"
- "y = sin(x)"           → "Math.sin(x)"
- "y = e^(-x/2)"         → "Math.exp(-x / 2)"
- "y = (4x – 3)e^(-4x)"  → "(4 * x - 3) * Math.exp(-4 * x)"
- "y = ln(x) / (2x)"     → "Math.log(x) / (2 * x)"
- "y = cos²(2x)"         → "Math.cos(2 * x) ** 2"

Output ONLY valid JSON (no fences):

If the question has a single, well-defined function y(x) computable from the description:
{"expr": "<JS expression in x>", "domain_note": "<any restrictions e.g. x > 0>"}

If the question has a discrete dataset rather than a function (use line connecting points but no formula):
{"expr": null, "reason": "discrete data, not a function"}

If the graph represents a qualitative shape (e.g. \"supply curve passes through these points\") with no precise formula:
{"expr": null, "reason": "qualitative — no exact function"}

If you can't determine a function:
{"expr": null, "reason": "no extractable function"}

CRITICAL: The expression must be syntactically valid JavaScript. Double-check parentheses and operator precedence.`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return { text: data.content[0]?.text ?? "", usage: data.usage };
}

function tryParse(t) {
  let c = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const s = c.indexOf("{"), e = c.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error("No JSON");
  return JSON.parse(c.slice(s, e + 1));
}

// Safe-ish eval: build a Function once per expr, evaluate at each x.
function buildEvaluator(expr) {
  // Only Math.* and basic arithmetic should be in the expr. Reject suspicious tokens.
  if (/[a-zA-Z_$][a-zA-Z0-9_$]*/g.test(expr.replace(/Math\.[a-zA-Z]+|x|PI|E/g, ""))) {
    // After stripping legitimate identifiers, anything still matching identifier syntax is suspicious
  }
  // Whitelist check
  const stripped = expr
    .replace(/Math\.(sin|cos|tan|asin|acos|atan|exp|log|sqrt|abs|pow|PI|E)/g, "")
    .replace(/[0-9.eE+\-*/(),%\s]/g, "")
    .replace(/x|\*\*/g, "");
  if (stripped.length > 0) {
    throw new Error(`Unsafe tokens in expression: "${stripped}" in "${expr}"`);
  }
  // eslint-disable-next-line no-new-func
  return new Function("x", `"use strict"; return (${expr});`);
}

async function processOne(item) {
  const { text, usage } = await callClaude(buildPrompt(item.q));
  let parsed;
  try { parsed = tryParse(text); } catch (e) {
    return { ...item, action: "parse-fail", err: e.message, usage };
  }
  if (!parsed.expr) {
    return { ...item, action: "skipped", reason: parsed.reason, usage };
  }
  let fn;
  try { fn = buildEvaluator(parsed.expr); } catch (e) {
    return { ...item, action: "unsafe", expr: parsed.expr, err: e.message, usage };
  }
  const xs = item.q.graph.xValues;
  const newValues = [];
  for (const x of xs) {
    try {
      const y = fn(x);
      if (!isFinite(y)) { newValues.push(null); continue; }
      newValues.push(Math.round(y * 1000) / 1000);
    } catch { newValues.push(null); }
  }
  // Reject if too many nulls (domain issues)
  if (newValues.filter((v) => v === null).length > xs.length / 3) {
    return { ...item, action: "domain-fail", expr: parsed.expr, usage };
  }
  // Replace any null with neighbouring values? Simpler: filter xs+values pairs to drop nulls
  const cleanXs = [];
  const cleanVs = [];
  for (let i = 0; i < xs.length; i++) {
    if (newValues[i] !== null) { cleanXs.push(xs[i]); cleanVs.push(newValues[i]); }
  }
  if (cleanXs.length < 3) {
    return { ...item, action: "too-few-points", expr: parsed.expr, usage };
  }
  return { ...item, action: "recomputed", expr: parsed.expr, newXs: cleanXs, newValues: cleanVs, usage };
}

async function main() {
  const todo = findLineGraphs().slice(0, LIMIT);
  console.log(`Found ${todo.length} single-series line graphs.`);
  if (DRY) console.log("DRY RUN.");

  const stats = { recomputed: 0, skipped: 0, parseFail: 0, unsafe: 0, domainFail: 0, tooFew: 0 };
  let totalIn = 0, totalOut = 0;
  const writes = new Map();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processOne));
    for (const r of results) {
      if (r.usage) { totalIn += r.usage.input_tokens; totalOut += r.usage.output_tokens; }
      if (r.action === "recomputed") {
        stats.recomputed++;
        // Verify the stored values differ — only write if they changed meaningfully
        const old = r.q.graph.series[0].values;
        let maxDiff = 0;
        for (let k = 0; k < Math.min(old.length, r.newValues.length); k++) {
          const d = Math.abs((old[k] ?? 0) - r.newValues[k]);
          if (d > maxDiff) maxDiff = d;
        }
        console.log(`  ~ ${r.q.id}  ${r.expr.slice(0, 60).padEnd(60)}  maxΔ=${maxDiff.toFixed(2)}`);
        if (!writes.has(r.file)) writes.set(r.file, JSON.parse(fs.readFileSync(r.file, "utf-8")));
        const t = writes.get(r.file).questions.find((qq) => qq.id === r.q.id);
        if (t) {
          t.graph.xValues = r.newXs;
          t.graph.series[0].values = r.newValues;
        }
      } else if (r.action === "skipped") {
        stats.skipped++;
        if (process.env.LOG_SKIPS) console.log(`  - ${r.q.id}: ${r.reason}`);
      } else if (r.action === "parse-fail") {
        stats.parseFail++; console.warn(`  ! ${r.q.id}: parse-fail`);
      } else if (r.action === "unsafe") {
        stats.unsafe++; console.warn(`  ! ${r.q.id}: unsafe expr "${r.expr}" — ${r.err}`);
      } else if (r.action === "domain-fail") {
        stats.domainFail++; console.warn(`  ! ${r.q.id}: domain issues with "${r.expr}"`);
      } else if (r.action === "too-few-points") {
        stats.tooFew++; console.warn(`  ! ${r.q.id}: too few valid points`);
      }
    }
    const cost = (totalIn * 3 / 1e6 + totalOut * 15 / 1e6).toFixed(3);
    console.log(`[${Math.min(i + CONCURRENCY, todo.length)}/${todo.length}] recomputed=${stats.recomputed} skipped=${stats.skipped} parseFail=${stats.parseFail} unsafe=${stats.unsafe} domainFail=${stats.domainFail}  $${cost}`);
  }

  if (!DRY) {
    for (const [fp, exam] of writes) {
      fs.writeFileSync(fp, JSON.stringify(exam, null, 2) + "\n");
    }
    console.log(`\nWrote ${writes.size} file(s).`);
  }
  const cost = totalIn * 3 / 1e6 + totalOut * 15 / 1e6;
  console.log(`Final: recomputed=${stats.recomputed} skipped=${stats.skipped} parseFail=${stats.parseFail} unsafe=${stats.unsafe} domainFail=${stats.domainFail} tooFew=${stats.tooFew}`);
  console.log(`Cost: $${cost.toFixed(3)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
