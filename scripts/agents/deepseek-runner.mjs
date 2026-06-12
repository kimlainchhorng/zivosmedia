#!/usr/bin/env node
/**
 * ZIVO — DeepSeek agent runner
 *
 * Feeds DeepSeek the shared rulebook (AGENTS.md + docs/agent-workflow.md +
 * AGENT_TASKS.md) and a task, then prints/saves its proposed plan or diff.
 * DeepSeek is an ADVISOR here — it does not edit the repo. A human, Claude, or
 * Codex applies whatever it proposes.
 *
 * Usage:
 *   npm run agent:deepseek -- --task "Plan the og:image wiring for ZivoTravelHome"
 *   npm run agent:deepseek -- --task "Review for bugs" --file src/pages/ZivoTravelHome.tsx
 *   npm run agent:deepseek -- --task "..." --model deepseek-reasoner --out plan.md
 *
 * Needs DEEPSEEK_API_KEY (put it in .env.local, which is git-ignored).
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

const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
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
const model = readOption("--model") || "deepseek-chat";
const out = readOption("--out");
const save = !argv.includes("--no-save");
const dryRun = argv.includes("--dry-run");
const temperature = Number(readOption("--temperature") ?? "0.2");
const maxTokens = Number(readOption("--max-tokens") ?? "4096");

function printHelp() {
  console.log(`
ZIVO DeepSeek agent runner

  npm run agent:deepseek -- --task "what you want DeepSeek to do" [options]

Options:
  --task "..."        The job for DeepSeek (required)
  --file <path>       Add a file's contents as context (repeat for more files)
  --model <name>      deepseek-chat (fast, default) | deepseek-reasoner (deeper)
  --out <path>        Save the answer to this file
  --no-save           Do not save a copy under docs/agent-runs/
  --temperature <n>   Sampling temperature (default 0.2)
  --max-tokens <n>    Max output tokens (default 4096)
  --dry-run           Build the prompt and show a summary, but do NOT call the API
  --help, -h          Show this help

Setup:
  Put DEEPSEEK_API_KEY=sk-... in .env.local (git-ignored), or export it.
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
    "You are DeepSeek working as one of THREE coding agents on the ZIVO monorepo " +
      "(the others are Claude Code and Codex). You are an ADVISOR: you propose plans, " +
      "reviews, and ready-to-apply diffs, but you do NOT have write access to the repo. " +
      "A human, Claude, or Codex will apply your changes.",
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

// ── Call DeepSeek ───────────────────────────────────────────────────────────
async function callDeepSeek(apiKey, system, user) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepSeek API ${res.status} ${res.statusText}\n${body}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message ?? {};
  const content = choice.content?.trim() || "";
  const reasoning = choice.reasoning_content?.trim() || "";
  const usage = data.usage || {};
  return { content, reasoning, usage };
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
    console.error(`   model: ${model} | temperature: ${temperature} | max-tokens: ${maxTokens}`);
    console.error(`   rulebook: ${RULEBOOK_FILES.join(", ")}`);
    console.error(`   context files: ${files.length ? files.join(", ") : "(none)"}`);
    console.error(`   system prompt: ${system.length} chars | user prompt: ${user.length} chars`);
    process.exit(0);
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ DEEPSEEK_API_KEY is not set.\n" +
        "   Put it in .env.local (git-ignored):  DEEPSEEK_API_KEY=sk-...\n" +
        "   or export it:                         export DEEPSEEK_API_KEY=sk-...",
    );
    process.exit(1);
  }

  console.error(`🤖 DeepSeek (${model}) working on: ${task}`);
  if (files.length) console.error(`   context files: ${files.join(", ")}`);

  let result;
  try {
    result = await callDeepSeek(apiKey, system, user);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const answer = result.content || result.reasoning || "(empty response)";

  // Print to screen.
  console.log("\n" + answer + "\n");
  if (result.usage?.total_tokens) {
    console.error(
      `   tokens: ${result.usage.prompt_tokens ?? "?"} in / ${result.usage.completion_tokens ?? "?"} out`,
    );
  }

  // Save a copy.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const header =
    `# DeepSeek run — ${new Date().toISOString()}\n\n` +
    `- model: ${model}\n- task: ${task}\n` +
    (files.length ? `- files: ${files.join(", ")}\n` : "") +
    `\n---\n\n`;

  if (save) {
    const dir = join(ROOT, "docs", "agent-runs");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${stamp}-${slugify(task)}.md`);
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
