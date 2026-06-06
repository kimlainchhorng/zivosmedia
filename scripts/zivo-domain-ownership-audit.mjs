#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "docs", "zivosmedia-domain-ownership-audit.md");

const SCAN_ROOTS = [
  "src/pages",
  "src/components",
  "src/contexts",
  "src/hooks",
  "src/integrations",
  "src/lib",
  "src/config",
  "supabase/functions",
  "supabase/migrations",
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".sql",
  ".md",
]);

const categories = [
  {
    key: "identity_social_aggregator",
    label: "ZivosMedia identity, social, discovery, aggregator",
    owner: "Keep in zivosmedia.com",
    pattern:
      /auth|session|profile|profiles|public_profile|feed|post|posts|story|stories|reel|reels|channel|creator|follow|notification|discover|search|wallet|zivo_plus|aggregat/i,
  },
  {
    key: "travel_bridge",
    label: "Travel bridge candidates",
    owner: "Move owner data/workflows to zivostravel.com; keep share-safe cards in ZivosMedia",
    pattern:
      /travel|flight|flights|airline|airport|duffel|hotel|hotels|lodging|lodge_|resort|guesthouse|booking|bus|vehicle|rental.?car|car.?rental|ratehawk|hotelbeds/i,
  },
  {
    key: "software_owner_console",
    label: "Software/business owner console candidates",
    owner: "Move owner dashboards/workflows to zivosoftware.com; keep public discovery in ZivosMedia",
    pattern:
      /business|merchant|store|stores|shop|shopping|restaurant|cafe|coffee|bakery|bar|grocery|market|mall|fashion|electronics|pharmacy|hardware|florist|bookstore|jewelry|pet.?shop|toy|furniture|decor|sporting|salon|barber|spa|massage|gym|fitness|laundry|dry.?clean|service_booking|autorepair|auto.?repair|dealership|tire|auto.?parts|gas.?station/i,
  },
  {
    key: "driver_legacy",
    label: "Driver legacy/control candidates",
    owner: "Move driver operations to zivodriver.com; keep public/aggregate driver status only when needed",
    pattern:
      /driver|drivers|ride|rides|trip|trips|dispatch|location.?heartbeat|go.?online|go.?offline|job.?offer|ride.?request|vehicle_location/i,
  },
  {
    key: "admin_control",
    label: "Admin/control-plane candidates",
    owner: "Move global staff tools to Zivo-Admin",
    pattern:
      /admin|moderation|support|risk|security|audit|compliance|refund|payout|incident|abuse|staff|operator|dashboard/i,
  },
  {
    key: "chat",
    label: "Chat/realtime candidates",
    owner: "Keep on main for now unless ZIVO-CHAT split is scheduled",
    pattern:
      /chat|message|messages|direct_message|conversation|thread|bot|call|webrtc|typing|presence/i,
  },
  {
    key: "payments_hub",
    label: "Payments hub candidates",
    owner: "Keep central on zivosmedia.com until reconciliation is designed",
    pattern:
      /stripe|payment|payments|checkout|wallet|payout|refund|subscription|invoice|receipt|connect|transfer|charge/i,
  },
  {
    key: "shared_infra",
    label: "Shared infrastructure",
    owner: "Keep as platform services or expose via per-domain adapters",
    pattern:
      /map|maps|geo|geocode|location|push|notification|storage|upload|media|image|remote.?config|csp|proxy|analytics|settings|exchange.?rate|currency/i,
  },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolute)));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function extractObjects(text, relativeFile) {
  const values = new Map();
  const patterns = [
    { type: "table", regex: /\.from\(\s*["'`]([^"'`]+)["'`]\s*\)/g },
    { type: "rpc", regex: /\.rpc\(\s*["'`]([^"'`]+)["'`]\s*[,)]/g },
    { type: "function", regex: /\.functions\.invoke\(\s*["'`]([^"'`]+)["'`]\s*[,)]/g },
    { type: "function", regex: /supabase\.functions\.invoke\(\s*["'`]([^"'`]+)["'`]\s*[,)]/g },
  ];

  if (relativeFile.endsWith(".sql")) {
    patterns.push({
      type: "sql_table",
      regex: /\b(?:from|join|into|update|table|references)\s+(?:public\.)?([a-z][a-z0-9_]+)/gi,
    });
  }

  for (const { type, regex } of patterns) {
    for (const match of text.matchAll(regex)) {
      const key = `${type}:${match[1]}`;
      values.set(key, { type, name: match[1] });
    }
  }

  return [...values.values()];
}

function summarizeObjects(results) {
  const objectHits = new Map();
  for (const result of results) {
    for (const object of result.objects) {
      const key = `${object.type}:${object.name}`;
      const hit = objectHits.get(key) ?? { ...object, count: 0, categories: new Set() };
      hit.count += 1;
      for (const category of result.categories) hit.categories.add(category);
      objectHits.set(key, hit);
    }
  }

  return [...objectHits.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 80)
    .map((hit) => ({
      ...hit,
      categories: [...hit.categories].sort(),
    }));
}

function markdownTable(rows, headers) {
  if (!rows.length) return "_None found._";
  const escape = (value) => String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map((header) => escape(header.label)).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escape(row[header.key] ?? "")).join(" | ")} |`),
  ].join("\n");
}

const files = (
  await Promise.all(SCAN_ROOTS.map((scanRoot) => collectFiles(path.join(ROOT, scanRoot))))
).flat();

const results = [];

for (const file of files.sort()) {
  const relative = path.relative(ROOT, file);
  const text = await fs.readFile(file, "utf8");
  const haystack = `${relative}\n${text}`;
  const matched = categories.filter((category) => category.pattern.test(haystack));
  if (!matched.length) continue;

  results.push({
    file: relative,
    categories: matched.map((category) => category.key),
    objects: extractObjects(text, relative),
  });
}

const categoryRows = categories.map((category) => {
  const filesForCategory = results.filter((result) => result.categories.includes(category.key));
  return {
    category: category.label,
    owner: category.owner,
    files: filesForCategory.length,
    examples: filesForCategory
      .slice(0, 8)
      .map((result) => `\`${result.file}\``)
      .join("<br>"),
  };
});

const overlapRows = results
  .filter((result) => result.categories.length > 1)
  .sort((a, b) => b.categories.length - a.categories.length || a.file.localeCompare(b.file))
  .slice(0, 120)
  .map((result) => ({
    file: `\`${result.file}\``,
    categories: result.categories.join(", "),
    objects: result.objects
      .slice(0, 10)
      .map((object) => `${object.type}:${object.name}`)
      .join("<br>"),
  }));

const objectRows = summarizeObjects(results).map((object) => ({
  object: `\`${object.name}\``,
  type: object.type,
  hits: object.count,
  categories: object.categories.join(", "),
}));

const report = `# ZivosMedia domain ownership audit

Generated: 2026-06-06

This audit scans the current all-in-one ZivosMedia repository for code and SQL surfaces that look like they belong to the new domain split. It is a routing map, not a data migration. Files can appear in more than one category when they combine customer-facing discovery, staff admin, payments, or vertical workflows.

## Summary
${markdownTable(categoryRows, [
  { key: "category", label: "Category" },
  { key: "owner", label: "Target owner" },
  { key: "files", label: "Candidate files" },
  { key: "examples", label: "Example files" },
])}

## High-overlap files
These are the first files to split or wrap with adapter APIs because they likely blend ZivosMedia aggregation with domain-owned workflows.

${markdownTable(overlapRows, [
  { key: "file", label: "File" },
  { key: "categories", label: "Matched categories" },
  { key: "objects", label: "Detected tables / RPC / functions" },
])}

## Frequently referenced backend objects
${markdownTable(objectRows, [
  { key: "object", label: "Object" },
  { key: "type", label: "Type" },
  { key: "hits", label: "Hits" },
  { key: "categories", label: "Matched categories" },
])}

## Reading this report
- **Keep in ZivosMedia:** identity, social feeds, discovery, share-safe aggregate cards, cross-domain auth handoff, and central payments until reconciliation is designed.
- **Move to Zivo Admin:** global staff/admin/moderation tools, support operations, payout/refund administration, and cross-product control-plane screens.
- **Move to Travel / Software / Driver:** operational tables, owner dashboards, booking lifecycle state, driver location/availability state, and vertical-specific service functions.
- **Bridge back to ZivosMedia:** public summaries, search cards, user notifications, and aggregate status through Edge Functions or a scheduled summary sync.

`;

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, report, "utf8");

console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
console.log(`Scanned ${files.length} files; matched ${results.length} ownership candidates.`);
