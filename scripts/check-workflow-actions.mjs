import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workflows = join(root, ".github", "workflows");
const files = readdirSync(workflows, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:yml|yaml)$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const mutable = [];
let checked = 0;

for (const file of files) {
  const path = join(workflows, file);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*(\S+)/);
    if (!match) return;

    const value = match[1];
    if (value.startsWith("./") || value.startsWith("docker://")) return;

    const at = value.lastIndexOf("@");
    if (at <= 0 || at === value.length - 1) return;

    const action = value.slice(0, at);
    const ref = value.slice(at + 1);
    if (!action.includes("/")) return;

    if (action === "actions/checkout" && !lines.slice(index, index + 10).join("\n").match(/persist-credentials:\s*false/)) {
      mutable.push(`${file}:${index + 1} actions/checkout is missing persist-credentials: false`);
    }

    checked += 1;
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      mutable.push(`${file}:${index + 1} ${action}@${ref}`);
    }
  });
}

if (mutable.length) {
  console.error("Mutable GitHub Action refs found; pin every remote action to a 40-character commit SHA:");
  for (const finding of mutable) console.error(`  ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Immutable GitHub Action check passed (${checked} remote refs across ${files.length} workflow files).`);
}
