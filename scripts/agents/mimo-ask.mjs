#!/usr/bin/env node
/**
 * Focused MiMo advisor. Calls the MiMo endpoint directly with ONLY the task +
 * the target file(s) — deliberately NOT the npm runner, which force-injects the
 * ~2 MB AGENT_TASKS.md and resets the connection (`fetch failed`).
 *
 * Usage:
 *   node scripts/agents/mimo-ask.mjs "review this for bugs" --file src/foo.tsx [--file src/bar.ts]
 *   node scripts/agents/mimo-ask.mjs "free-form question with no file"
 *
 * Prints MiMo's answer and saves a copy to docs/agent-runs/<ts>-<slug>-mimo.md
 * to match the existing runner's logging behavior.
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const KEY = env.MIMO_API_KEY;
const BASE = env.MIMO_BASE_URL;
const MODEL = env.MIMO_MODEL || "mimo-v2.5-pro";
if (!KEY || !BASE) {
  console.error("Missing MIMO_API_KEY / MIMO_BASE_URL in .env.local");
  process.exit(1);
}
if (typeof fetch !== "function") {
  console.error("Global fetch unavailable — needs Node 18+.");
  process.exit(1);
}

const args = process.argv.slice(2);
const files = [];
const taskParts = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file") files.push(args[++i]);
  else taskParts.push(args[i]);
}
const task = taskParts.join(" ").trim();
if (!task) {
  console.error('Provide a task string, e.g. node scripts/agents/mimo-ask.mjs "review" --file src/x.tsx');
  process.exit(1);
}

let context = "";
for (const f of files) {
  try {
    context += `\n\n=== FILE: ${f} ===\n` + fs.readFileSync(f, "utf8");
  } catch {
    context += `\n\n=== FILE: ${f} (unreadable) ===`;
  }
}

const system =
  "You are a senior React + TypeScript + mobile-UX reviewer for the ZIVO super-app " +
  "(React/Vite/TS, Tailwind, dark-navy + Instagram-gradient design language, mobile-first PWA + Capacitor). " +
  "Be terse and concrete. Report ONLY real correctness bugs, accessibility gaps, responsive/mobile issues, " +
  "and disconnected/unwired logic. Tag each finding P0/P1/P2 with a one-line fix. If the code is solid, say so plainly.";

const body = {
  model: MODEL,
  max_tokens: 6000,
  system,
  messages: [{ role: "user", content: task + context }],
};

const resp = await fetch(`${BASE.replace(/\/$/, "")}/v1/messages`, {
  method: "POST",
  headers: {
    "x-api-key": KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

const json = await resp.json().catch(() => ({}));
const blocks = json.content || [];
let text = blocks
  .filter((b) => b.type === "text")
  .map((b) => b.text)
  .join("\n")
  .trim();
if (!text) {
  // Reasoning model sometimes spends the whole budget on `thinking` — surface it
  // as a fallback so the run isn't wasted, with a clear marker.
  const thinking = blocks
    .filter((b) => b.type === "thinking")
    .map((b) => b.thinking)
    .join("\n")
    .trim();
  text = thinking
    ? `[no final text — stop_reason=${json.stop_reason}; reasoning excerpt:]\n${thinking}`
    : `[no text] ${JSON.stringify(json).slice(0, 600)}`;
}

console.log(text);

const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const slug =
  task.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ask";
const dir = "docs/agent-runs";
fs.mkdirSync(dir, { recursive: true });
const outFile = path.join(dir, `${ts}-${slug}-mimo.md`);
fs.writeFileSync(outFile, `# MiMo advisor — ${task}\n\nFiles: ${files.join(", ") || "(none)"}\n\n${text}\n`);
console.error(`\n[saved ${outFile}]`);
