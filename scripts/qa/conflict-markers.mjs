import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SCOPED_PREFIXES = [
  ".github/",
  "cloudflare/",
  "scripts/",
  "src/",
  "supabase/functions/",
  "supabase/migrations/",
  "tests/",
];
const EVIDENCE_EXTENSIONS = new Set([".csv", ".json", ".md"]);
const MARKER = /^(?:<<<<<<<(?: .*)?|=======|>>>>>>>(?: .*)?)$/;

function isInReleaseScope(file) {
  const normalized = file.replaceAll("\\", "/");
  if (SCOPED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  const dot = normalized.lastIndexOf(".");
  return dot >= 0 && EVIDENCE_EXTENSIONS.has(normalized.slice(dot).toLowerCase());
}

const listed = spawnSync("git", ["ls-files", "-z"], {
  encoding: "buffer",
  maxBuffer: 64 * 1024 * 1024,
});

if (listed.status !== 0) {
  process.stderr.write(listed.stderr || Buffer.from("Unable to enumerate tracked files.\n"));
  process.exit(listed.status ?? 1);
}

const files = listed.stdout
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter(isInReleaseScope);
const findings = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const contents = readFileSync(file);
  if (contents.includes(0)) continue;
  const lines = contents.toString("utf8").replaceAll("\r\n", "\n").split("\n");
  lines.forEach((line, index) => {
    if (MARKER.test(line)) findings.push(`${file}:${index + 1}:${line}`);
  });
}

if (findings.length > 0) {
  console.error("[conflict-markers] FAIL: committed merge markers remain:");
  findings.forEach((finding) => console.error(finding));
  process.exit(1);
}

console.log(`[conflict-markers] PASS: ${files.length} tracked release files are marker-free.`);
