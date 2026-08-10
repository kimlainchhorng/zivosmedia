import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const functionsDir = join(root, "supabase", "functions");
const findings = [];
let scanned = 0;

for (const entry of readdirSync(functionsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
  const file = join(functionsDir, entry.name, "index.ts");
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  scanned += 1;

  const relative = file.slice(root.length + 1);
  const legacyImport = source.match(
    /import\s*\{([^}]*)\}\s*from\s*["'](?:\.\.\/)+_shared\/cors\.ts["']/s,
  );
  if (legacyImport && /\b(?:getCorsHeaders|corsHeaders|publicCorsHeaders)\b/.test(legacyImport[1])) {
    findings.push(`${relative}: imports a legacy shared CORS helper directly; use ctx.corsHeaders from withSecurity()`);
  }
  if (/\bgetCorsHeaders\s*\(/.test(source)) {
    findings.push(`${relative}: calls getCorsHeaders() inside an Edge Function; strict wrapper headers can be bypassed`);
  }
  if (
    /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/.test(source) ||
    /["']Access-Control-Allow-Origin["']\s*,\s*["']\*["']/.test(source)
  ) {
    findings.push(`${relative}: contains a wildcard Access-Control-Allow-Origin`);
  }
}

if (findings.length > 0) {
  console.error("CORS boundary check failed:");
  for (const finding of findings) console.error(`  ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`CORS boundary check passed (${scanned} Edge Function files scanned).`);
}
