#!/usr/bin/env node
/**
 * Detects duplicate @types/react and @types/react-dom installations.
 * Multiple versions cause TS2786 / TS2607 JSX component errors.
 * Exits 1 if more than one version is found for either package.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["@types/react", "@types/react-dom"];

function findPackageJsons(dir, target, results = [], depth = 0) {
  if (depth > 8) return results;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (entry === "node_modules") {
      const candidate = join(full, target, "package.json");
      if (existsSync(candidate)) results.push(candidate);
      // Recurse into nested node_modules
      findPackageJsons(full, target, results, depth + 1);
    } else if (entry.startsWith("@")) {
      // scoped dirs inside node_modules
      findPackageJsons(full, target, results, depth + 1);
    }
  }
  return results;
}

let hasError = false;
for (const target of TARGETS) {
  const pkgs = findPackageJsons(join(ROOT, "node_modules"), target);
  const versions = new Map();
  for (const p of pkgs) {
    try {
      const v = JSON.parse(readFileSync(p, "utf8")).version;
      if (!versions.has(v)) versions.set(v, []);
      versions.get(v).push(p);
    } catch {}
  }
  if (versions.size > 1) {
    hasError = true;
    console.error(`\n❌ Duplicate ${target} versions detected:`);
    for (const [v, paths] of versions) {
      console.error(`   v${v}:`);
      for (const p of paths) console.error(`     - ${p}`);
    }
    console.error(`\nFix: add an "overrides" entry in package.json pinning ${target} to a single version.`);
  } else if (versions.size === 1) {
    console.log(`✓ ${target} @ ${[...versions.keys()][0]} (single copy)`);
  }
}

if (hasError) process.exit(1);
