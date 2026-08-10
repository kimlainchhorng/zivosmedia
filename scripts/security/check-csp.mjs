import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyFiles = ["public/_headers", "public/_worker.js", "netlify.toml"];
const findings = [];

for (const relativePath of policyFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    findings.push(`${relativePath}: policy source is missing`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, "utf8");
  if (!/content-security-policy/i.test(source)) {
    findings.push(`${relativePath}: Content-Security-Policy is missing`);
  }
  const scriptDirective = source.match(/script-src[^;]*/i)?.[0] ?? "";
  if (/\bunsafe-inline\b/i.test(scriptDirective)) {
    findings.push(`${relativePath}: script-src unsafe-inline is not allowed; move executable bootstrap code to same-origin files`);
  }
  if (/\bunsafe-eval\b/i.test(source)) {
    findings.push(`${relativePath}: unsafe-eval is not allowed in production CSP`);
  }
}

if (findings.length > 0) {
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log(`CSP policy check passed (${policyFiles.length} emitters, script-src unsafe-inline and unsafe-eval absent).`);
