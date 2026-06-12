#!/usr/bin/env node
/**
 * ZIVO — Xiaomi MiMo agent runner
 *
 * Same idea as the DeepSeek runner, but talks to Xiaomi MiMo through its
 * Anthropic-compatible Messages API. Feeds MiMo the shared rulebook
 * (AGENTS.md + docs/agent-workflow.md + AGENT_TASKS.md) and a task, then
 * prints/saves its proposed plan or diff. MiMo is an ADVISOR here — it does
 * not edit the repo. A human, Claude, Codex, or DeepSeek applies what it proposes.
 *
 * Usage:
 *   npm run agent:mimo -- --task "Plan the og:image wiring for ZivoTravelHome"
 *   npm run agent:mimo -- --task "Review for bugs" --file src/pages/ZivoTravelHome.tsx
 *   npm run agent:mimo -- --task "..." --model mimo-v2.5-pro --out plan.md
 *
 * Needs MIMO_API_KEY (put it in .env.local, which is git-ignored).
 * Optional: MIMO_BASE_URL (default https://api.xiaomimimo.com/anthropic),
 *           MIMO_MODEL (default mimo-v2.5-pro).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// Load env from .env.local then .env with a tiny built-in parser, so this
// runner is fully self-contained (no dotenv dependency) and portable across
// every ZIVO repo. Existing process.env wins (e.g. CI / exported vars).
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnvFile(join(ROOT, ".env.local"));
loadEnvFile(join(ROOT, ".env"));

const BASE_URL = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/anthropic").replace(/\/+$/, "");
const DEFAULT_MODEL = process.env.MIMO_MODEL || "mimo-v2.5-pro";
const ANTHROPIC_VERSION = process.env.MIMO_ANTHROPIC_VERSION || "2023-06-01";
const RULEBOOK_FILES = ["AGENTS.md", "docs/agent-workflow.md", "AGENT_TASKS.md"];
const MAX_FILE_CHARS = 60_000;

// ── Argument parsing ────────────────────────────────────────────────────────
const argv = process.argv.slice(2);

function readOption(name) {
  const inline = argv.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return null;
}

function readMultiOption(name) {
  const values = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      values.push(argv[i + 1]);
    } else if (argv[i].startsWith(`${name}=`)) {
      values.push(argv[i].slice(name.length + 1));
    }
  }
  return values;
}

if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

const task = readOption("--task");
const files = readMultiOption("--file");
const model = readOption("--model") || DEFAULT_MODEL;
const out = readOption("--out");
const save = !argv.includes("--no-save");
const dryRun = argv.includes("--dry-run");
const temperature = Number(readOption("--temperature") ?? "0.3");
const topP = Number(readOption("--top-p") ?? "0.95");
const maxTokens = Number(readOption("--max-tokens") ?? "8192");

function printHelp() {
  console.log(`
ZIVO Xiaomi MiMo agent runner

  npm run agent:mimo -- --task "what you want MiMo to do" [options]

Options:
  --task "..."        The job for MiMo (required)
  --file <path>       Add a file's contents as context (repeat for more files)
  --model <name>      MiMo model (default ${DEFAULT_MODEL})
  --out <path>        Save the answer to this file
  --no-save           Do not save a copy under docs/agent-runs/
  --temperature <n>   Sampling temperature (default 0.3)
  --top-p <n>         Nucleus sampling (default 0.95)
  --max-tokens <n>    Max output tokens (default 8192)
  --dry-run           Build the prompt and show a summary, but do NOT call the API
  --help, -h          Show this help

Setup:
  Put MIMO_API_KEY=sk-... in .env.local (git-ignored), or export it.
  Optional: MIMO_BASE_URL (default https://api.xiaomimimo.com/anthropic),
            MIMO_MODEL (default mimo-v2.5-pro).
`);
}

// ── Build the prompt ────────────────────────────────────────────────────────
function loadText(relPath, label) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) {
    console.error(`⚠️  ${label || relPath} not found: ${relPath} (skipping)`);
    return null;
  }
  let text = readFileSync(abs, "utf8");
  let truncated = false;
  if (text.length > MAX_FILE_CHARS) {
    text = text.slice(0, MAX_FILE_CHARS);
    truncated = true;
  }
  return { text, truncated };
}

function buildSystemPrompt() {
  const parts = [
    "You are Xiaomi MiMo working as one of the coding agents on the ZIVO monorepo " +
      "(the others are Claude Code, Codex, and DeepSeek). You are an ADVISOR: you propose " +
      "plans, reviews, and ready-to-apply diffs, but you do NOT have write access to the repo. " +
      "A human, Claude, Codex, or DeepSeek will apply your changes.",
    "",
    "Follow the project rulebook below exactly. Respect every guardrail (live Stripe " +
      "key, no casual end-to-end payment tests, keep type-check at 0 errors, keep changes " +
      "additive across domains, do not commit/deploy — the owner does that). When you " +
      "propose code, give precise file paths and minimal diffs, and note that the change " +
      "must pass `npm run update` before it is considered done.",
    "",
    "=== RULEBOOK START ===",
  ];
  for (const rel of RULEBOOK_FILES) {
    const loaded = loadText(rel);
    if (!loaded) continue;
    parts.push(`\n----- ${rel} -----\n${loaded.text}${loaded.truncated ? "\n…(truncated)…" : ""}`);
  }
  parts.push("\n=== RULEBOOK END ===");
  return parts.join("\n");
}

function buildUserPrompt() {
  const parts = [`TASK:\n${task}`];
  if (files.length) {
    parts.push("\nFILES FOR CONTEXT:");
    for (const f of files) {
      const loaded = loadText(f, `--file ${f}`);
      if (!loaded) continue;
      const rel = relative(ROOT, resolve(ROOT, f));
      parts.push(
        `\n----- ${rel} -----\n\`\`\`\n${loaded.text}${loaded.truncated ? "\n…(truncated)…" : ""}\n\`\`\``,
      );
    }
  }
  parts.push(
    "\nRespond with: (1) a short plan, (2) the proposed change as a diff or clear " +
      "before/after with exact file paths, (3) anything the owner must verify or deploy.",
  );
  return parts.join("\n");
}

// ── Call MiMo (Anthropic-compatible Messages API) ───────────────────────────
async function callMiMo(apiKey, system, user) {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: [{ type: "text", text: user }] }],
      temperature,
      top_p: topP,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MiMo API ${res.status} ${res.statusText}\n${body}`);
  }

  const data = await res.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  // MiMo is a reasoning model: it returns "text" answer blocks plus separate
  // "thinking" scratchpad blocks. The answer is the text; keep thinking as a
  // fallback so a token-capped run still shows something useful.
  const content = blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
  const thinking = blocks
    .filter((b) => b && b.type === "thinking" && typeof b.thinking === "string")
    .map((b) => b.thinking)
    .join("")
    .trim();
  const usage = data.usage || {};
  return { content, thinking, stopReason: data.stop_reason, usage };
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!task) {
    console.error("❌ Missing --task. Run with --help for usage.");
    process.exit(1);
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt();

  if (dryRun) {
    console.error(`🧪 dry-run — not calling the API`);
    console.error(`   model: ${model} | temperature: ${temperature} | top-p: ${topP} | max-tokens: ${maxTokens}`);
    console.error(`   base url: ${BASE_URL}/v1/messages`);
    console.error(`   rulebook: ${RULEBOOK_FILES.join(", ")}`);
    console.error(`   context files: ${files.length ? files.join(", ") : "(none)"}`);
    console.error(`   system prompt: ${system.length} chars | user prompt: ${user.length} chars`);
    process.exit(0);
  }

  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ MIMO_API_KEY is not set.\n" +
        "   Put it in .env.local (git-ignored):  MIMO_API_KEY=sk-...\n" +
        "   or export it:                         export MIMO_API_KEY=sk-...",
    );
    process.exit(1);
  }

  console.error(`🤖 MiMo (${model}) working on: ${task}`);
  if (files.length) console.error(`   context files: ${files.join(", ")}`);

  let result;
  try {
    result = await callMiMo(apiKey, system, user);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  let answer = result.content;
  if (!answer) {
    if (result.stopReason === "max_tokens") {
      answer =
        "(no answer text — the run hit max_tokens; raise --max-tokens)" +
        (result.thinking ? `\n\n--- partial thinking ---\n${result.thinking}` : "");
    } else {
      answer = result.thinking
        ? `(only thinking returned)\n\n${result.thinking}`
        : "(empty response)";
    }
  }

  // Print to screen.
  console.log("\n" + answer + "\n");
  if (result.usage?.input_tokens || result.usage?.output_tokens) {
    console.error(
      `   tokens: ${result.usage.input_tokens ?? "?"} in / ${result.usage.output_tokens ?? "?"} out`,
    );
  }

  // Save a copy.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const header =
    `# MiMo run — ${new Date().toISOString()}\n\n` +
    `- model: ${model}\n- task: ${task}\n` +
    (files.length ? `- files: ${files.join(", ")}\n` : "") +
    `\n---\n\n`;

  if (save) {
    const dir = join(ROOT, "docs", "agent-runs");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${stamp}-${slugify(task)}-mimo.md`);
    writeFileSync(file, header + answer + "\n");
    console.error(`💾 saved: ${relative(ROOT, file)}`);
  }

  if (out) {
    const abs = resolve(ROOT, out);
    writeFileSync(abs, header + answer + "\n");
    console.error(`💾 saved: ${relative(ROOT, abs)}`);
  }
}

main();
