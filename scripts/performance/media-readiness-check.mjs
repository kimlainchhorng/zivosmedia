#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function listTsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsxFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      out.push(relative(root, abs).split("\\").join("/"));
    }
  }
  return out;
}

const files = listTsxFiles(join(root, "src"));

const findings = [];

function getLineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function findTagBlocks(source, tagName) {
  const blocks = [];
  const openRe = new RegExp(`<${tagName}\\b`, "g");

  for (const match of source.matchAll(openRe)) {
    const start = match.index ?? 0;
    const lineStart = source.lastIndexOf("\n", start) + 1;
    const linePrefix = source.slice(lineStart, start);
    if (linePrefix.includes("//")) continue;
    if (source.lastIndexOf("{/*", start) > source.lastIndexOf("*/}", start)) continue;
    if (source.lastIndexOf("/*", start) > source.lastIndexOf("*/", start)) continue;

    let cursor = start;
    let quote = null;
    let braceDepth = 0;

    while (cursor < source.length) {
      const ch = source[cursor];
      if (quote) {
        if (ch === quote && source[cursor - 1] !== "\\") quote = null;
      } else if (ch === "'" || ch === '"' || ch === "`") {
        quote = ch;
      } else if (ch === "{") {
        braceDepth += 1;
      } else if (ch === "}" && braceDepth > 0) {
        braceDepth -= 1;
      } else if (ch === ">" && braceDepth === 0) {
        blocks.push({
          text: source.slice(start, cursor + 1),
          line: getLineNumber(source, start),
        });
        break;
      }
      cursor += 1;
    }
  }

  return blocks;
}

function hasAttribute(tagText, attributeName) {
  return new RegExp(`\\b${attributeName}\\s*=`, "i").test(tagText);
}

for (const file of files) {
  const source = readFileSync(join(root, file), "utf8");
  for (const img of findTagBlocks(source, "img")) {
    if (!hasAttribute(img.text, "loading")) {
      findings.push({ file, line: img.line, issue: "img missing loading=\"lazy\"/SmartImage" });
    }
    if (!hasAttribute(img.text, "decoding")) {
      findings.push({ file, line: img.line, issue: "img missing decoding=\"async\"/SmartImage" });
    }
  }
  for (const video of findTagBlocks(source, "video")) {
    if (!hasAttribute(video.text, "preload")) {
      findings.push({ file, line: video.line, issue: "video missing preload policy/LazyVideo" });
    }
  }
}

const byFile = new Map();
for (const finding of findings) {
  const key = relative(root, join(root, finding.file));
  const entries = byFile.get(key) ?? [];
  entries.push(finding);
  byFile.set(key, entries);
}

console.log(`Media readiness report: ${findings.length} issue(s) across ${byFile.size} file(s).`);
for (const [file, entries] of [...byFile.entries()].sort()) {
  console.log(`\n${file}`);
  for (const entry of entries.slice(0, 12)) {
    console.log(`  ${entry.line}: ${entry.issue}`);
  }
  if (entries.length > 12) console.log(`  ... ${entries.length - 12} more`);
}

if (findings.length > 0) {
  console.log("\nThis command is report-only for now. Move high-traffic surfaces to SmartImage/LazyVideo first, then make it strict.");
}
