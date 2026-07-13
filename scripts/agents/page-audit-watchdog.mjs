#!/usr/bin/env node
/**
 * ZIVO Page-Audit Watchdog — 24/7 read-only audit, DeepSeek + MiMo.
 *
 * Each cycle picks the NEXT page in a rotating list and runs BOTH advisors on it
 * (`npm run agent:deepseek` + `npm run agent:mimo`, which save their reviews under
 * docs/agent-runs/). It writes a short summary to docs/page-audit/LATEST.md and
 * appends docs/page-audit/history.jsonl. It NEVER edits source, the DB, or commits —
 * audit + report ONLY (the autonomy level the owner chose). The owner (or a future
 * session) reads the reports and fixes the verified findings.
 *
 * Manual:  npm run audit:watch            (one cycle, next page)
 *          npm run audit:watch -- --page src/pages/Foo.tsx   (force a specific page)
 *          npm run audit:watch -- --loop --interval 180      (foreground loop, minutes)
 * 24/7:    a Windows Scheduled Task runs scripts/agents/run-page-audit.cmd on a timer.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT = join(ROOT, "docs", "page-audit");
const STATE = join(OUT, "state.json");
const LOCK = join(OUT, ".lock");
const LATEST = join(OUT, "LATEST.md");
const HISTORY = join(OUT, "history.jsonl");

// Rotating audit list — the high-traffic / un- or lightly-audited surfaces. Re-auditing
// is fine (code changes over time). Keep paths relative to the repo root.
const PAGES = [
  "src/pages/FeedPage.tsx",
  "src/pages/ReelsFeedPage.tsx",
  "src/pages/ChatHubPage.tsx",
  "src/pages/StoreMapPage.tsx",
  "src/pages/MarketplacePage.tsx",
  "src/pages/LiveStreamPage.tsx",
  "src/pages/GoLivePage.tsx",
  "src/pages/SocialFeedPage.tsx",
  "src/pages/GroceryStorePage.tsx",
  "src/pages/GroceryOrderHistory.tsx",
  "src/pages/WellnessPage.tsx",
  "src/pages/CreatorDashboardPage.tsx",
  "src/pages/NotificationCenterPage.tsx",
  "src/pages/account/WalletPage.tsx",
  "src/pages/MorePage.tsx",
  "src/pages/EatsLanding.tsx",
  "src/pages/DeliveryPage.tsx",
  "src/pages/lodging/HotelsLandingPage.tsx",
  "src/pages/lodging/HotelResortDetailPage.tsx",
  "src/pages/app/RideHubPage.tsx",
];

const AUDIT_TASK =
  "Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or " +
  "hardcoded data shown as if real; controls that claim an action but do not persist or " +
  "navigate to the wrong place (missing/wrong route params, wrong navigation state shape); " +
  "silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never " +
  "checked, especially when a wired error/retry UI exists that then never fires); broken " +
  "deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can " +
  "prove from the code. If genuinely clean, say so plainly in one line.";

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const forcedPage = opt("--page");
const loop = argv.includes("--loop");
const intervalMin = Number(opt("--interval") ?? "180");

function readState() {
  try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return { index: 0, runs: 0 }; }
}
function writeState(s) { writeFileSync(STATE, JSON.stringify(s, null, 2)); }

function runAdvisor(runner, page) {
  // The runner saves its review under docs/agent-runs/ (no --no-save). Returns ok/err.
  try {
    const out = execSync(
      `npm run ${runner} -- --task ${JSON.stringify(AUDIT_TASK)} --file ${JSON.stringify(page)} --max-tokens 4000`,
      { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], timeout: 240000, encoding: "utf8" },
    );
    const saved = (out.match(/saved:\s*(docs[\\/][^\n]+)/i) || [])[1] || "(saved under docs/agent-runs/)";
    return { ok: true, saved: saved.trim() };
  } catch (err) {
    return { ok: false, error: (err && err.message ? err.message : String(err)).slice(0, 300) };
  }
}

function cycle() {
  mkdirSync(OUT, { recursive: true });
  if (existsSync(LOCK)) {
    const age = Date.now() - Number(readFileSync(LOCK, "utf8") || "0");
    if (age < 20 * 60 * 1000) { console.error("[page-audit] another cycle is running; skip."); return; }
  }
  writeFileSync(LOCK, String(Date.now()));
  try {
    const state = readState();
    const page = forcedPage || PAGES[state.index % PAGES.length];
    const stamp = new Date().toISOString();
    console.error(`[page-audit] auditing ${page} (run #${state.runs + 1})`);

    const missing = !existsSync(join(ROOT, page));
    const deepseek = missing ? { ok: false, error: "file not found" } : runAdvisor("agent:deepseek", page);
    const mimo = missing ? { ok: false, error: "file not found" } : runAdvisor("agent:mimo", page);

    const summary =
      `# Page-Audit Watchdog — latest cycle\n\n` +
      `- when: ${stamp}\n- page: \`${page}\`\n- run #: ${state.runs + 1}\n` +
      `- DeepSeek: ${deepseek.ok ? `✅ ${deepseek.saved}` : `❌ ${deepseek.error}`}\n` +
      `- MiMo: ${mimo.ok ? `✅ ${mimo.saved}` : `❌ ${mimo.error}`}\n\n` +
      `Read-only — no code changed, nothing committed. Reviews are under \`docs/agent-runs/\`.\n` +
      `Review the findings and fix the verified ones (then commit those fixes yourself).\n`;
    writeFileSync(LATEST, summary);
    appendFileSync(HISTORY, JSON.stringify({ stamp, page, deepseek: deepseek.ok, mimo: mimo.ok }) + "\n");

    if (!forcedPage) writeState({ index: (state.index + 1) % PAGES.length, runs: state.runs + 1 });
    console.error(`[page-audit] done: ${page} — DeepSeek ${deepseek.ok ? "ok" : "ERR"}, MiMo ${mimo.ok ? "ok" : "ERR"}`);
  } finally {
    try { rmSync(LOCK); } catch { /* ignore */ }
  }
}

if (loop) {
  console.error(`[page-audit] loop every ${intervalMin} min (Ctrl+C to stop)`);
  cycle();
  setInterval(cycle, Math.max(30, intervalMin) * 60 * 1000);
} else {
  cycle();
}
