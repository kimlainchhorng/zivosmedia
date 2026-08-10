import { readFileSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "supabase/functions/supplier-proxy/index.ts");
const source = readFileSync(file, "utf8");

if (!source.includes("var _parentOrigin = window.location.origin;")) {
  throw new Error("supplier-proxy must derive an explicit parent origin");
}

if (!source.includes("if (e.origin !== _parentOrigin) return;")) {
  throw new Error("supplier-proxy must reject cross-origin message input");
}

if (/postMessage\([^\n]*['"]\*['"]\)/.test(source)) {
  throw new Error("supplier-proxy must not use wildcard postMessage targets");
}

const messageCount = (source.match(/postMessage\(/g) ?? []).length;
console.log(`postMessage boundary check passed (${messageCount} supplier-proxy messages origin-pinned).`);
