#!/usr/bin/env node
/**
 * ZIVO — 24/7 Security Watchdog
 *
 * A defensive, READ-ONLY guard that watches the ZIVO repo + (optionally) the
 * live Supabase backend for attacks and new vulnerabilities, then asks BOTH
 * DeepSeek and Xiaomi MiMo to judge the evidence. It NEVER edits code, never
 * touches the database, never commits, never deploys. Its only outputs are
 * report files + alerts. A human (or Claude/Codex) applies any fix.
 *
 * What it does each cycle:
 *   1. Collects security signals (all read-only):
 *        - npm audit (vulnerable dependencies)
 *        - the repo's own secret scan + supabase-token-fragment scan
 *        - git surface (uncommitted changes, recent commits touching
 *          auth/RLS/Stripe/CSP/worker)
 *        - a static attack-surface scan (XSS sinks, eval, insecure http://,
 *          wide-open CORS, service_role key in client code, RLS disabled or
 *          anon GRANTs in migrations, private keys / cloud creds)
 *        - OPTIONAL live Supabase signals (security advisors + auth/edge logs,
 *          scanned for attack signatures) — only if SUPABASE_ACCESS_TOKEN +
 *          SUPABASE_PROJECT_REF are set. Skipped gracefully otherwise.
 *   2. Redacts any secret-shaped strings BEFORE anything leaves the machine.
 *   3. If the signal set is unchanged since the last cycle AND there is no live
 *      attack indicator, it records a cheap "no change" heartbeat and skips the
 *      AI call (so a 24/7 schedule stays affordable). Use --force to override.
 *   4. Otherwise sends a compact evidence bundle to DeepSeek + MiMo and asks
 *      each, as a security analyst, to rank findings CRITICAL/HIGH/MEDIUM/LOW,
 *      flag any active attack, and propose fixes WITHOUT applying them.
 *   5. Writes:
 *        docs/security-watch/LATEST.md          (latest human-readable report)
 *        docs/security-watch/reports/<stamp>.md (full report + raw model output)
 *        docs/security-watch/history.jsonl      (one line per cycle)
 *        docs/security-watch/ALERT-<stamp>.md   (only on HIGH+/active attack)
 *      and, if WATCHDOG_WEBHOOK_URL is set, POSTs a short alert there.
 *
 * Usage:
 *   npm run security:watch                 # one cycle (default)
 *   npm run security:watch -- --force      # one cycle, force AI even if unchanged
 *   npm run security:watch -- --no-ai      # collect + report, skip the AI models
 *   npm run security:watch -- --quick      # skip npm audit (faster)
 *   npm run security:watch:loop            # loop forever (interval below)
 *   node scripts/security/security-watchdog.mjs --loop --interval 45
 *
 * Env (all optional; the two AI keys come from .env.local like the runners):
 *   DEEPSEEK_API_KEY, MIMO_API_KEY           — already wired for agent runners
 *   WATCHDOG_MODELS=deepseek,mimo            — which models to consult (default both)
 *   WATCHDOG_DEEPSEEK_MODEL=deepseek-chat    — deepseek-chat (cheap) | deepseek-reasoner
 *   WATCHDOG_INTERVAL_MIN=45                 — loop interval in minutes
 *   WATCHDOG_WEBHOOK_URL=...                 — POST {text} alerts here (Slack/Discord/etc.)
 *   SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF — enable live log/advisor checks
 */

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "docs", "security-watch");
const REPORTS_DIR = join(OUT_DIR, "reports");
const HISTORY = join(OUT_DIR, "history.jsonl");
const LAST_HASH_FILE = join(OUT_DIR, ".last-hash");
const LOCK_FILE = join(OUT_DIR, ".lock");
const LOCK_STALE_MS = 20 * 60 * 1000; // matches the task's ExecutionTimeLimit

// Single-writer lock: prevents a manual run and a scheduled run (or a slow cycle
// and the next tick) from colliding on the report files. A lock older than
// LOCK_STALE_MS is treated as abandoned (a crashed cycle) and reclaimed.
function acquireLock() {
  try {
    mkdirSync(OUT_DIR, { recursive: true });
    if (existsSync(LOCK_FILE) && Date.now() - statSync(LOCK_FILE).mtimeMs < LOCK_STALE_MS) {
      return false;
    }
    writeFileSync(LOCK_FILE, `${process.pid} ${new Date().toISOString()}`);
    return true;
  } catch {
    return false;
  }
}
function releaseLock() {
  try {
    unlinkSync(LOCK_FILE);
  } catch {
    /* already gone */
  }
}

// ── env loader (same tiny parser as the agent runners) ──────────────────────
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

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (name, dflt) => {
  const inline = argv.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return dflt;
};

if (has("--help") || has("-h")) {
  console.log(
    `ZIVO Security Watchdog (read-only)\n\n` +
      `  node scripts/security/security-watchdog.mjs [--loop] [--interval <min>] [--force] [--no-ai] [--quick]\n\n` +
      `  --loop            keep running on an interval (default: one cycle)\n` +
      `  --interval <min>  loop interval in minutes (default ${process.env.WATCHDOG_INTERVAL_MIN || 45})\n` +
      `  --force           run the AI analysis even if signals are unchanged\n` +
      `  --no-ai           collect + report only; do not call DeepSeek/MiMo\n` +
      `  --quick           skip npm audit (faster)\n` +
      `  --self-test       validate keys + output dir + live config, then exit\n`,
  );
  process.exit(0);
}

const LOOP = has("--loop");
const FORCE = has("--force");
const NO_AI = has("--no-ai");
const QUICK = has("--quick");
const SELF_TEST = has("--self-test");
const INTERVAL_MIN = Number(opt("--interval", process.env.WATCHDOG_INTERVAL_MIN || "45"));
const MODELS = (process.env.WATCHDOG_MODELS || "deepseek,mimo")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const SEVERITY_ORDER = ["none", "low", "medium", "high", "critical"];
const sevRank = (s) => Math.max(0, SEVERITY_ORDER.indexOf(String(s || "none").toLowerCase()));
const maxSev = (a, b) => (sevRank(a) >= sevRank(b) ? a : b);

// ── secret redaction (run on EVERYTHING before it leaves the machine) ────────
// We never send raw secret-shaped strings to an external API. Masks JWTs,
// sk_live/sk_test, AWS keys, bearer tokens, long base64/hex blobs, private keys.
function redact(text) {
  if (!text) return text;
  let t = String(text);
  t = t.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]");
  t = t.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[REDACTED JWT]");
  t = t.replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}/g, "[REDACTED $1_$2_KEY]");
  t = t.replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED AWS_KEY]");
  t = t.replace(/\bghp_[A-Za-z0-9]{20,}\b/g, "[REDACTED GH_TOKEN]");
  t = t.replace(/\bsbp_[A-Za-z0-9]{20,}\b/g, "[REDACTED SUPABASE_TOKEN]");
  t = t.replace(/\b[A-Fa-f0-9]{40,}\b/g, "[REDACTED HEX]");
  t = t.replace(/(authorization|api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^\s"']{12,}/gi, "$1=[REDACTED]");
  return t;
}

// ── shell helpers ────────────────────────────────────────────────────────────
function sh(cmd, { cwd = ROOT, maxBuffer = 12 * 1024 * 1024 } = {}) {
  try {
    const out = execSync(cmd, { cwd, maxBuffer, stdio: ["ignore", "pipe", "pipe"], shell: true });
    return { ok: true, out: out.toString() };
  } catch (err) {
    return {
      ok: false,
      out: [err.stdout?.toString() || "", err.stderr?.toString() || ""].join("\n"),
      code: err.status,
    };
  }
}

// ── signal collectors (all read-only) ────────────────────────────────────────

function collectNpmAudit() {
  if (QUICK) return { status: "skipped", note: "--quick" };
  const r = sh("npm audit --json", { maxBuffer: 24 * 1024 * 1024 });
  let json;
  try {
    json = JSON.parse(r.out);
  } catch {
    return { status: "error", note: "could not parse npm audit output" };
  }
  const v = json.metadata?.vulnerabilities || {};
  const total = (v.critical || 0) + (v.high || 0) + (v.moderate || 0) + (v.low || 0) + (v.info || 0);
  const top = Object.entries(json.vulnerabilities || {})
    .filter(([, d]) => ["critical", "high"].includes(d.severity))
    .slice(0, 15)
    .map(([name, d]) => `${name} (${d.severity}) via ${(d.via || []).map((x) => (typeof x === "string" ? x : x.title)).slice(0, 2).join(", ")}`);
  return {
    status: total ? "findings" : "clean",
    counts: v,
    severity: v.critical ? "critical" : v.high ? "high" : v.moderate ? "medium" : v.low ? "low" : "none",
    top,
  };
}

function runRepoScript(npmScript) {
  const r = sh(`npm run ${npmScript} --silent`);
  const tail = redact(r.out.split(/\r?\n/).slice(-25).join("\n").trim());
  return { status: r.ok ? "pass" : "fail", tail };
}

function collectGitSurface() {
  const status = sh("git status --porcelain").out.trim();
  const sensitive = /(auth|rls|policy|stripe|secret|token|csp|cors|worker|supabase|migration|password|session|jwt)/i;
  const changed = status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.trim());
  const sensitiveChanged = changed.filter((l) => sensitive.test(l));
  const recent = sh('git log -8 --pretty=format:"%h %s"').out.trim().split(/\r?\n/).filter(Boolean);
  const sensitiveCommits = recent.filter((l) => sensitive.test(l));
  return {
    uncommittedCount: changed.length,
    sensitiveChanged: sensitiveChanged.slice(0, 30),
    recentSensitiveCommits: sensitiveCommits.slice(0, 10),
  };
}

// Static attack-surface scan over source dirs (Node, portable; bounded).
const SCAN_DIRS = ["src", "cloudflare", "supabase", "scripts", "electron"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "build", ".wrangler-dry-run", "coverage", "ios", "android", "docs"]);
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|sql|json|html|css|toml)$/i;
const MAX_FILES = 6000;
const MAX_FILE_BYTES = 600 * 1024;

// Test-fixture paths: secret-shaped / dangerous patterns there are intentional
// (assertions, mocks, security demo pages) and must not raise production alerts.
const TEST_PATH = /(^|\/)(test|tests|__tests__|__mocks__|e2e)\/|\.(test|spec)\.[tj]sx?$|securitytestpage/i;

const RISK_RULES = [
  {
    id: "service_role_in_client",
    sev: "critical",
    where: /^src\b/,
    skipTests: true,
    // Only flag a service_role *credential* shipping to the browser — not the
    // defensive guard in client.ts that THROWS on a misconfigured secret key.
    re: /service[_-]?role[_-]?key|SUPABASE_SERVICE_ROLE|service_role["']?\s*[:=]\s*["']?eyJ|createClient\([^)]*service_role/i,
    exclude: /isSupabaseSecretKey|role\s*===|===\s*["']service_role|must be a publishable|not a secret/i,
    hint: "service_role key referenced in client code (must never ship to the browser)",
  },
  // fullText: require a real PEM block (BEGIN + base64 material + END), so a
  // `.replace("-----BEGIN PRIVATE KEY-----", "")` that strips a header off an
  // env-loaded key does not look like an embedded key.
  { id: "private_key", sev: "critical", fullText: true, skipTests: true, re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{40,}-----END [A-Z ]*PRIVATE KEY-----/, hint: "embedded private key" },
  { id: "aws_key", sev: "critical", re: /\bAKIA[0-9A-Z]{16}\b/, skipTests: true, hint: "AWS access key id" },
  { id: "stripe_secret", sev: "critical", re: /\bsk_(live|test)_[A-Za-z0-9]{8,}/, skipTests: true, hint: "Stripe SECRET key in source (only pk_ is safe client-side)" },
  { id: "eval_use", sev: "high", re: /\beval\s*\(|new\s+Function\s*\(/, skipTests: true, hint: "eval / new Function — code-injection sink" },
  { id: "rls_disabled", sev: "high", re: /disable\s+row\s+level\s+security/i, where: /^supabase\b/, hint: "RLS disabled in a migration" },
  // NOTE: these scan append-only migration *files*, which cannot show net state
  // — a later migration may REVOKE a grant seen here (verified 2026-06-15: the
  // anon write grants flagged here were already revoked live by 2026-06-01
  // server-gate migrations). So these are MEDIUM/LOW "verify against live grants"
  // notes, not hard findings. When SUPABASE_ACCESS_TOKEN is set, the live-advisor
  // check is the authority. `grant usage on schema …` and `grant execute on
  // function …` (intentional public RPCs) are excluded entirely.
  { id: "grant_anon_write", sev: "medium", where: /^supabase\b/, re: /grant\s+(all\b|[a-z, ()]*\b(insert|update|delete|truncate)\b)[^;]*\bon\b[^;]*\bto\s+[^;]*\banon\b/i, exclude: /on\s+(function|routine|all\s+functions|all\s+routines|schema|sequence)/i, hint: "GRANT <write/ALL> ... TO anon in a migration — verify against LIVE grants (may be revoked by a later migration)" },
  { id: "grant_anon_read", sev: "low", where: /^supabase\b/, re: /grant\s+select\b[^;]*\bon\b[^;]*\bto\s+[^;]*\banon\b/i, exclude: /\b(insert|update|delete|truncate)\b|on\s+(function|routine|all\s+functions|all\s+routines|schema|sequence)/i, hint: "GRANT SELECT ... TO anon in a migration — public-read; verify live grants + RLS" },
  { id: "cors_wildcard", sev: "medium", re: /access-control-allow-origin["'\s:]*\*/i, skipTests: true, hint: "wide-open CORS (Allow-Origin: *)" },
  {
    id: "insecure_http",
    sev: "medium",
    skipTests: true,
    re: /['"`]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
    // XML/SVG namespace + schema.org/DTD URIs are identifiers, not network calls.
    exclude: /xmlns|w3\.org|schema\.org|purl\.org|ns\.adobe|\.dtd|sitemaps\.org|openid|xmlns\.com/i,
    hint: "plain http:// endpoint (no TLS)",
  },
  { id: "dangerous_html", sev: "low", re: /dangerouslySetInnerHTML/, where: /^src\b/, skipTests: true, hint: "dangerouslySetInnerHTML — XSS sink, verify input is sanitized" },
  { id: "target_blank_noopener", sev: "low", re: /target=["']_blank["'](?![^>]*rel=)/, where: /^src\b/, skipTests: true, hint: "target=_blank without rel=noopener (reverse-tabnabbing)" },
];

function walk(dir, acc, budget) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (budget.count >= MAX_FILES) return;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), acc, budget);
    } else if (SCAN_EXT.test(e.name)) {
      acc.push(join(dir, e.name));
      budget.count++;
    }
  }
}

function collectStaticRiskScan() {
  const files = [];
  const budget = { count: 0 };
  for (const d of SCAN_DIRS) {
    const abs = join(ROOT, d);
    if (existsSync(abs)) walk(abs, files, budget);
  }
  const findings = [];
  for (const file of files) {
    let size = 0;
    try {
      size = statSync(file).size;
    } catch {
      continue;
    }
    if (size > MAX_FILE_BYTES) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const isTest = TEST_PATH.test(rel);
    for (const rule of RISK_RULES) {
      if (rule.where && !rule.where.test(rel)) continue;
      if (rule.skipTests && isTest) continue;
      if (rule.fullText) {
        // Whole-file rules (e.g. a multi-line PEM block). Never echo the match.
        if (rule.re.test(text) && !(rule.exclude && rule.exclude.test(text))) {
          const idx = text.search(rule.re);
          const line = idx >= 0 ? text.slice(0, idx).split(/\r?\n/).length : 1;
          findings.push({ rule: rule.id, sev: rule.sev, file: rel, line, hint: rule.hint, sample: "[match elided]" });
        }
        continue;
      }
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (rule.re.test(lines[i]) && !(rule.exclude && rule.exclude.test(lines[i]))) {
          findings.push({
            rule: rule.id,
            sev: rule.sev,
            file: rel,
            line: i + 1,
            hint: rule.hint,
            sample: redact(lines[i].trim().slice(0, 160)),
          });
          break; // one hit per rule per file keeps the bundle small
        }
      }
    }
  }
  findings.sort((a, b) => sevRank(b.sev) - sevRank(a.sev)); // worst first
  const bySev = {};
  for (const f of findings) bySev[f.sev] = (bySev[f.sev] || 0) + 1;
  const severity = ["critical", "high", "medium", "low"].find((s) => bySev[s]) || "none";
  return { filesScanned: budget.count, counts: bySev, severity, findings: findings.slice(0, 80) };
}

// OPTIONAL live Supabase checks via the Management API (read-only).
async function collectLiveSupabase() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    return { status: "disabled", note: "set SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF to enable live log/advisor checks" };
  }
  const base = "https://api.supabase.com/v1";
  const headers = { Authorization: `Bearer ${token}` };
  const result = { status: "ok", advisors: null, attack: null };
  try {
    const adv = await fetch(`${base}/projects/${ref}/advisors/security`, { headers });
    if (adv.ok) {
      const j = await adv.json();
      const lints = j.lints || j || [];
      result.advisors = {
        warn: lints.filter((l) => l.level === "WARN").length,
        error: lints.filter((l) => l.level === "ERROR").length,
        info: lints.filter((l) => l.level === "INFO").length,
      };
    }
  } catch (e) {
    result.advisorsError = String(e.message || e);
  }
  // Auth-log attack-signature scan: burst of 4xx from one IP = possible brute force.
  try {
    const q = encodeURIComponent(
      "select event_message, timestamp from auth_logs order by timestamp desc limit 200",
    );
    const logs = await fetch(`${base}/projects/${ref}/analytics/endpoints/logs.all?sql=${q}`, { headers });
    if (logs.ok) {
      const j = await logs.json();
      const rows = j.result || [];
      const fails = {};
      let failCount = 0;
      for (const row of rows) {
        const msg = String(row.event_message || "");
        if (/400|401|403|invalid|denied|rate/i.test(msg)) {
          failCount++;
          const ip = (msg.match(/"remote_addr":"([^"]+)"/) || [])[1] || "unknown";
          fails[ip] = (fails[ip] || 0) + 1;
        }
      }
      const worstIp = Object.entries(fails).sort((a, b) => b[1] - a[1])[0];
      const burst = worstIp && worstIp[1] >= 20;
      result.attack = {
        rowsScanned: rows.length,
        recentFailures: failCount,
        worstIp: worstIp ? { ip: worstIp[0], failures: worstIp[1] } : null,
        likelyAttack: !!burst,
      };
    }
  } catch (e) {
    result.attackError = String(e.message || e);
  }
  return result;
}

// ── AI analysis (DeepSeek + MiMo) ────────────────────────────────────────────
function buildBundle(signals) {
  return redact(JSON.stringify(signals, null, 2)).slice(0, 45000);
}

const ANALYST_SYSTEM =
  "You are a senior application-security analyst guarding the ZIVO production platform " +
  "(Vite/React SPA on many domains, Supabase backend with live bookings/payments/auth, " +
  "Cloudflare Worker front). You receive a read-only SIGNAL BUNDLE collected from the repo " +
  "and (optionally) the live backend. You DO NOT have write access — you only assess. " +
  "Secrets are already redacted; do not ask for them. " +
  "Return STRICT JSON only (no prose, no markdown fences) of the form: " +
  '{"active_attack": boolean, "overall_severity": "none|low|medium|high|critical", ' +
  '"summary": string, "findings": [{"severity": "...", "title": string, "evidence": string, ' +
  '"fix": string}]}. Distinguish INTENTIONAL public surface (token-gated share links, ' +
  "public support chat) from real exposure. Be precise and avoid false alarms.";

async function askDeepSeek(bundle) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { model: "deepseek", error: "DEEPSEEK_API_KEY not set" };
  const model = process.env.WATCHDOG_DEEPSEEK_MODEL || "deepseek-chat";
  try {
    const res = await fetch(`${process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: ANALYST_SYSTEM },
          { role: "user", content: `SIGNAL BUNDLE:\n${bundle}` },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        stream: false,
      }),
    });
    if (!res.ok) return { model, error: `HTTP ${res.status}: ${redact((await res.text().catch(() => "")).slice(0, 300))}` };
    const data = await res.json();
    return { model, ...parseModelJson(data.choices?.[0]?.message?.content || "") };
  } catch (e) {
    return { model, error: String(e.message || e) };
  }
}

async function askMimo(bundle) {
  const key = process.env.MIMO_API_KEY;
  if (!key) return { model: "mimo", error: "MIMO_API_KEY not set" };
  const base = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/+$/, "");
  const model = process.env.MIMO_MODEL || "mimo-v2.5-pro";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: ANALYST_SYSTEM },
          { role: "user", content: `SIGNAL BUNDLE:\n${bundle}` },
        ],
        temperature: 0.1,
        max_completion_tokens: 8192,
        stream: false,
        thinking: { type: process.env.MIMO_THINKING || "disabled" },
      }),
    });
    if (!res.ok) return { model, error: `HTTP ${res.status}: ${redact((await res.text().catch(() => "")).slice(0, 300))}` };
    const data = await res.json();
    const msg = data.choices?.[0]?.message || {};
    const content = typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.map((p) => p.text || "").join("") : "";
    return { model, ...parseModelJson(content) };
  } catch (e) {
    return { model, error: String(e.message || e) };
  }
}

function parseModelJson(text) {
  if (!text) return { error: "empty response", raw: "" };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return { json: JSON.parse(candidate.slice(start, end + 1)), raw: text.slice(0, 6000) };
    } catch {
      /* fall through */
    }
  }
  return { error: "could not parse JSON", raw: text.slice(0, 6000) };
}

// ── reporting ────────────────────────────────────────────────────────────────
function stampNow() {
  return new Date().toISOString();
}
function fileStamp(iso) {
  return iso.replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDirs() {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

function signalHash(signals) {
  // Hash the meaningful content, ignoring timestamps, so an unchanged repo +
  // backend does not trigger a fresh (paid) AI analysis every cycle.
  const stable = JSON.stringify({
    audit: signals.npmAudit?.counts,
    secrets: signals.secretScan?.status,
    tokens: signals.tokenScan?.status,
    git: signals.git?.sensitiveChanged,
    gitCommits: signals.git?.recentSensitiveCommits,
    risk: signals.staticRisk?.findings?.map((f) => `${f.rule}:${f.file}:${f.line}`),
    live: signals.live?.attack?.likelyAttack,
  });
  let h = 0;
  for (let i = 0; i < stable.length; i++) h = (Math.imul(31, h) + stable.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

function staticSeverity(signals) {
  let s = "none";
  s = maxSev(s, signals.npmAudit?.severity || "none");
  s = maxSev(s, signals.staticRisk?.severity || "none");
  if (signals.secretScan?.status === "fail") s = maxSev(s, "high");
  if (signals.tokenScan?.status === "fail") s = maxSev(s, "high");
  if (signals.live?.attack?.likelyAttack) s = maxSev(s, "high");
  return s;
}

function renderReport({ iso, signals, ai, overall, activeAttack }) {
  const lines = [];
  lines.push(`# ZIVO Security Watchdog — ${iso}`);
  lines.push("");
  lines.push(`- **Overall severity:** ${overall.toUpperCase()}`);
  lines.push(`- **Active attack:** ${activeAttack ? "⚠️ YES" : "no"}`);
  lines.push(`- **Mode:** read-only (detect + alert; no code/DB changes)`);
  lines.push("");
  lines.push(`## Static signals`);
  lines.push(`- npm audit: ${JSON.stringify(signals.npmAudit?.counts || signals.npmAudit?.status || {})}`);
  if (signals.npmAudit?.top?.length) lines.push(`  - top: ${signals.npmAudit.top.slice(0, 6).join("; ")}`);
  lines.push(`- secret scan: ${signals.secretScan?.status} · supabase-token scan: ${signals.tokenScan?.status}`);
  lines.push(`- static risk scan: ${signals.staticRisk?.filesScanned} files, severity ${signals.staticRisk?.severity}, counts ${JSON.stringify(signals.staticRisk?.counts || {})}`);
  if (signals.staticRisk?.findings?.length) {
    lines.push(`  - findings:`);
    for (const f of signals.staticRisk.findings.slice(0, 20)) {
      lines.push(`    - [${f.sev}] ${f.rule} — ${f.file}:${f.line} — ${f.hint}`);
    }
  }
  lines.push(`- git: ${signals.git?.uncommittedCount} uncommitted; sensitive changed: ${signals.git?.sensitiveChanged?.length || 0}`);
  lines.push(`- live backend: ${signals.live?.status}${signals.live?.attack ? ` · scanned ${signals.live.attack.rowsScanned} auth-log rows · recent auth failures: ${signals.live.attack.recentFailures}${signals.live.attack.worstIp ? ` (worst IP ${signals.live.attack.worstIp.ip}: ${signals.live.attack.worstIp.failures})` : ""}` : ""}`);
  lines.push("");
  if (ai && ai.length) {
    lines.push(`## AI analysis`);
    for (const r of ai) {
      lines.push(`### ${r.model}`);
      if (r.error) {
        lines.push(`- ⚠️ ${r.error}`);
      } else if (r.json) {
        lines.push(`- severity: ${r.json.overall_severity} · active attack: ${r.json.active_attack}`);
        if (r.json.summary) lines.push(`- ${r.json.summary}`);
        for (const f of (r.json.findings || []).slice(0, 15)) {
          lines.push(`  - **[${String(f.severity).toUpperCase()}] ${f.title}**`);
          if (f.evidence) lines.push(`    - evidence: ${f.evidence}`);
          if (f.fix) lines.push(`    - fix: ${f.fix}`);
        }
      } else {
        lines.push(`- (no structured output)`);
      }
      lines.push("");
    }
  } else {
    lines.push(`## AI analysis`);
    lines.push(NO_AI ? `- skipped (--no-ai)` : `- skipped (signals unchanged since last cycle; use --force to re-run)`);
    lines.push("");
  }
  return lines.join("\n");
}

async function maybeWebhook(text) {
  const url = process.env.WATCHDOG_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error(`   webhook failed: ${e.message}`);
  }
}

// ── one cycle ────────────────────────────────────────────────────────────────
async function runCycle() {
  ensureDirs();
  const iso = stampNow();
  console.error(`\n🛡️  ZIVO Security Watchdog — ${iso}`);

  const signals = {};
  signals.npmAudit = collectNpmAudit();
  console.error(`   • npm audit: ${signals.npmAudit.status}`);
  signals.secretScan = runRepoScript("security:check-secrets");
  signals.tokenScan = runRepoScript("security:check-supabase-token-fragments");
  console.error(`   • secret scan: ${signals.secretScan.status} · token scan: ${signals.tokenScan.status}`);
  signals.git = collectGitSurface();
  signals.staticRisk = collectStaticRiskScan();
  console.error(`   • static risk scan: ${signals.staticRisk.filesScanned} files, severity ${signals.staticRisk.severity}`);
  signals.live = await collectLiveSupabase();
  console.error(`   • live backend: ${signals.live.status}`);

  const baseSeverity = staticSeverity(signals);
  const liveAttack = !!signals.live?.attack?.likelyAttack;
  const hash = signalHash(signals);
  const lastHash = existsSync(LAST_HASH_FILE) ? readFileSync(LAST_HASH_FILE, "utf8").trim() : "";
  const unchanged = hash === lastHash;

  let ai = null;
  const wantAI = !NO_AI && (FORCE || !unchanged || liveAttack);
  if (wantAI) {
    const bundle = buildBundle(signals);
    const jobs = [];
    if (MODELS.includes("deepseek")) jobs.push(askDeepSeek(bundle));
    if (MODELS.includes("mimo")) jobs.push(askMimo(bundle));
    console.error(`   • consulting: ${MODELS.join(" + ")} …`);
    ai = await Promise.all(jobs);
    for (const r of ai) console.error(`     – ${r.model}: ${r.error ? "⚠️ " + r.error : r.json ? r.json.overall_severity : "parsed"}`);
  } else if (unchanged && !NO_AI) {
    console.error(`   • signals unchanged since last cycle — skipping AI (use --force to override)`);
  }

  // Overall severity = worst of static + both models' opinions.
  let overall = baseSeverity;
  let activeAttack = liveAttack;
  for (const r of ai || []) {
    if (r.json) {
      overall = maxSev(overall, r.json.overall_severity);
      if (r.json.active_attack) activeAttack = true;
    }
  }

  // A "fresh event" = the signal set changed (or AI ran / an attack is live).
  // Unchanged cycles still refresh LATEST.md + the history heartbeat, but do NOT
  // spawn a new per-event report/ALERT file or re-fire the webhook — so a 24/7
  // schedule with a persistent baseline doesn't produce duplicate alert spam.
  const changed = !unchanged || FORCE || liveAttack;
  const report = renderReport({ iso, signals, ai, overall, activeAttack });
  const fstamp = fileStamp(iso);
  writeFileSync(join(OUT_DIR, "LATEST.md"), report);
  if (changed) writeFileSync(join(REPORTS_DIR, `${fstamp}.md`), report);
  writeFileSync(LAST_HASH_FILE, hash);
  appendFileSync(
    HISTORY,
    JSON.stringify({
      ts: iso,
      overall,
      activeAttack,
      changed,
      hash,
      audit: signals.npmAudit?.counts || signals.npmAudit?.status,
      staticRisk: signals.staticRisk?.counts,
      secretScan: signals.secretScan?.status,
      tokenScan: signals.tokenScan?.status,
      live: signals.live?.status,
      aiSkipped: !wantAI,
    }) + "\n",
  );

  const isAlert = sevRank(overall) >= sevRank("high") || activeAttack;
  if (isAlert && changed) {
    const alertPath = join(OUT_DIR, `ALERT-${fstamp}.md`);
    writeFileSync(alertPath, report);
    const headline = `🚨 ZIVO Security Watchdog ALERT — severity ${overall.toUpperCase()}${activeAttack ? " · ACTIVE ATTACK" : ""} (${iso})`;
    console.error(`\n${headline}`);
    console.error(`   → ${relative(ROOT, alertPath)}`);
    await maybeWebhook(`${headline}\nSee docs/security-watch/LATEST.md`);
  } else if (isAlert) {
    console.error(`\n🟠 severity ${overall.toUpperCase()} — unchanged since last cycle (already alerted). docs/security-watch/LATEST.md`);
  } else {
    console.error(`\n✅ severity ${overall.toUpperCase()} — no alert. Report: docs/security-watch/LATEST.md`);
  }

  return { overall, activeAttack, isAlert, changed };
}

// Self-test: validate the watchdog can actually do its job (keys present, output
// writable, live-Supabase wired) WITHOUT running a full scan. Catches the silent
// "running but scanning nothing / can't write reports" failure mode.
function selfTest() {
  const checks = [];
  const ok = (label, pass, note = "") => checks.push({ label, pass, note });

  ok("DEEPSEEK_API_KEY present", !!process.env.DEEPSEEK_API_KEY, NO_AI ? "(--no-ai)" : "");
  ok("MIMO_API_KEY present", !!process.env.MIMO_API_KEY, NO_AI ? "(--no-ai)" : "");

  let writable = false;
  try {
    mkdirSync(OUT_DIR, { recursive: true });
    const probe = join(OUT_DIR, ".selftest");
    writeFileSync(probe, "ok");
    unlinkSync(probe);
    writable = true;
  } catch (e) {
    writable = false;
  }
  ok("output dir writable", writable, OUT_DIR);

  const liveConfigured = !!(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF);
  ok(
    "live Supabase log scan configured",
    liveConfigured,
    liveConfigured ? `project ${process.env.SUPABASE_PROJECT_REF}` : "(set SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF to enable live attack detection)",
  );

  console.error("🩺 ZIVO Security Watchdog — self-test\n");
  for (const c of checks) {
    console.error(`   ${c.pass ? "✅" : "⚠️ "} ${c.label}${c.note ? "  " + c.note : ""}`);
  }
  // Core requirement = we can write reports. AI keys/live scan are warnings only.
  const coreOk = writable && (NO_AI || process.env.DEEPSEEK_API_KEY || process.env.MIMO_API_KEY);
  console.error(`\n${coreOk ? "✅ self-test passed" : "❌ self-test FAILED — cannot run"}`);
  return coreOk;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (SELF_TEST) {
    process.exit(selfTest() ? 0 : 1);
  }
  if (!LOOP) {
    if (!acquireLock()) {
      console.error("⏭️  Another watchdog cycle is already running — skipping this run.");
      return;
    }
    try {
      await runCycle();
    } finally {
      releaseLock();
    }
    return;
  }
  console.error(`🔁 Watchdog loop every ${INTERVAL_MIN} min. Ctrl+C to stop.`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (acquireLock()) {
      try {
        await runCycle();
      } catch (e) {
        console.error(`   cycle error: ${e.message}`);
      } finally {
        releaseLock();
      }
    } else {
      console.error("⏭️  cycle skipped — another watchdog cycle is running.");
    }
    await new Promise((r) => setTimeout(r, Math.max(1, INTERVAL_MIN) * 60 * 1000));
  }
}

main().catch((e) => {
  console.error(`❌ watchdog fatal: ${e.message}`);
  process.exit(1);
});
