/**
 * Audit database media URL fields and classify whether they point to Supabase Storage.
 *
 * The script discovers media-looking columns from src/integrations/supabase/types.ts,
 * scans those tables with the service-role key, and writes a JSON report.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings scripts/audit-supabase-media-storage.ts
 *
 * Options:
 *   --tables=store_profiles,lodge_rooms
 *   --output=data/media-audits/supabase-media-storage-audit-YYYY-MM-DD.json
 *   --sample-size=20
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, any>;

const TYPES_PATH = "src/integrations/supabase/types.ts";
const PAGE_SIZE = 1000;

const MEDIA_COLUMN_RE =
  /(^|_)(avatar|banner|cover|document|gallery|gif|image|images|logo|media|photo|photos|picture|pictures|receipt|thumbnail|video)(_|$)|^(attachment_url|file_url|document_url|profile_photo)$/i;
const EXCLUDE_COLUMN_RE =
  /^(website|facebook_url|instagram_url|telegram_url|tiktok_url|redirect_url|callback_url|source_url|booking_url|clean_url|document_uri|source_file)$|(_position|_positions|_index)$/i;

const args = process.argv.slice(2);
const getArg = (name: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const dateStamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const OUTPUT =
  getArg("output") ||
  `data/media-audits/supabase-media-storage-audit-${dateStamp}.json`;
const SAMPLE_SIZE = Number.parseInt(getArg("sample-size") || "20", 10);
const TABLE_FILTER = new Set(
  (getArg("tables") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function discoverMediaTables() {
  if (!existsSync(TYPES_PATH)) {
    throw new Error(`Missing generated Supabase types at ${TYPES_PATH}`);
  }

  const lines = readFileSync(TYPES_PATH, "utf8").split(/\r?\n/);
  const tables = new Map<string, Set<string>>();
  let inTables = false;
  let currentTable: string | null = null;
  let inRow = false;

  for (const line of lines) {
    if (/^\s{4}Tables:\s+\{/.test(line)) {
      inTables = true;
      continue;
    }
    if (inTables && /^\s{4}Views:\s+\{/.test(line)) break;
    if (!inTables) continue;

    const tableMatch = line.match(/^\s{6}([A-Za-z0-9_]+):\s+\{$/);
    if (tableMatch) {
      currentTable = tableMatch[1];
      inRow = false;
      if (!tables.has(currentTable)) tables.set(currentTable, new Set());
      continue;
    }

    if (!currentTable) continue;
    if (/^\s{8}Row:\s+\{/.test(line)) {
      inRow = true;
      continue;
    }
    if (inRow && /^\s{8}\}/.test(line)) {
      inRow = false;
      continue;
    }
    if (!inRow) continue;

    const columnMatch = line.match(/^\s{10}([A-Za-z0-9_]+):\s+(.+)$/);
    if (!columnMatch) continue;
    const column = columnMatch[1];
    if (EXCLUDE_COLUMN_RE.test(column)) continue;
    if (MEDIA_COLUMN_RE.test(column)) tables.get(currentTable)!.add(column);
  }

  return [...tables.entries()]
    .map(([table, columns]) => ({ table, columns: [...columns].sort() }))
    .filter((entry) => entry.columns.length > 0)
    .filter((entry) => TABLE_FILTER.size === 0 || TABLE_FILTER.has(entry.table))
    .sort((a, b) => a.table.localeCompare(b.table));
}

function collectUrls(value: unknown, out: string[] = []): string[] {
  if (value == null) return out;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (looksLikeMediaReference(trimmed)) out.push(trimmed);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const child of Object.values(value as JsonRecord)) collectUrls(child, out);
  }
  return out;
}

function looksLikeMediaReference(value: string) {
  return (
    /^https?:\/\//i.test(value) ||
    /^data:/i.test(value) ||
    /\/storage\/v1\//i.test(value) ||
    /(^|\/)(store-assets|avatars|post-media|receipts|documents|booking-import|hotel-imports)\//i.test(value) ||
    /^(\/|\.\/|\.\.\/|__l5e\/|\/__l5e\/)/i.test(value) ||
    /\.(avif|gif|jpe?g|mov|mp4|pdf|png|svg|webm|webp)(?:\?|#|$)/i.test(value)
  );
}

function bookingImageId(value: string): string | null {
  return (
    value.match(/\/xdata\/images\/hotel\/[^/]+\/(\d+)\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i)?.[1] ||
    null
  );
}

function classifyUrl(value: string) {
  if (/^data:/i.test(value)) return "data_url";
  if (/\/storage\/v1\/(?:object|render)\/(?:public|sign)\//i.test(value)) return "supabase_storage";
  if (/\.supabase\.co\/storage\/v1\//i.test(value)) return "supabase_storage";
  if (/(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i.test(value)) return "direct_booking";
  if (/^https?:\/\//i.test(value)) return "external_http";
  if (/^(\/|\.\/|\.\.\/|__l5e\/|\/__l5e\/)/i.test(value)) return "relative_or_local";
  return "unknown";
}

function newCounts() {
  return {
    total: 0,
    supabase_storage: 0,
    direct_booking: 0,
    external_http: 0,
    relative_or_local: 0,
    data_url: 0,
    unknown: 0,
  };
}

function addCount(counts: ReturnType<typeof newCounts>, classification: string) {
  counts.total += 1;
  counts[classification as keyof typeof counts] += 1;
}

async function readRows(table: string, columns: string[]) {
  const rows: JsonRecord[] = [];
  const select = columns.join(",");

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as JsonRecord[]));
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

async function main() {
  const discovered = discoverMediaTables();
  const summary = {
    tables_discovered: discovered.length,
    tables_scanned: 0,
    tables_failed: 0,
    rows_scanned: 0,
    media: newCounts(),
    unique: {
      direct_booking_urls: 0,
      direct_booking_image_ids: 0,
      external_http_urls: 0,
      supabase_storage_urls: 0,
    },
  };
  const unique = {
    direct_booking_urls: new Set<string>(),
    direct_booking_image_ids: new Set<string>(),
    external_http_urls: new Set<string>(),
    supabase_storage_urls: new Set<string>(),
  };
  const tables: JsonRecord[] = [];
  const failures: JsonRecord[] = [];
  const samples: JsonRecord[] = [];

  for (const tableInfo of discovered) {
    const tableCounts = newCounts();
    const columnCounts = Object.fromEntries(
      tableInfo.columns.map((column) => [column, newCounts()]),
    ) as Record<string, ReturnType<typeof newCounts>>;

    try {
      const rows = await readRows(tableInfo.table, tableInfo.columns);
      summary.tables_scanned += 1;
      summary.rows_scanned += rows.length;

      for (const row of rows) {
        for (const column of tableInfo.columns) {
          for (const url of collectUrls(row[column])) {
            const classification = classifyUrl(url);
            addCount(summary.media, classification);
            addCount(tableCounts, classification);
            addCount(columnCounts[column], classification);

            if (classification === "direct_booking") {
              unique.direct_booking_urls.add(url);
              const id = bookingImageId(url);
              if (id) unique.direct_booking_image_ids.add(id);
            } else if (classification === "external_http") {
              unique.external_http_urls.add(url);
            } else if (classification === "supabase_storage") {
              unique.supabase_storage_urls.add(url);
            }

            if (
              samples.length < SAMPLE_SIZE &&
              (classification === "direct_booking" || classification === "external_http")
            ) {
              samples.push({ table: tableInfo.table, column, classification, url });
            }
          }
        }
      }

      tables.push({
        table: tableInfo.table,
        rows: rows.length,
        columns: tableInfo.columns,
        media: tableCounts,
        column_media: columnCounts,
      });
    } catch (error) {
      summary.tables_failed += 1;
      failures.push({
        table: tableInfo.table,
        columns: tableInfo.columns,
        error: (error as Error).message,
      });
    }
  }

  summary.unique.direct_booking_urls = unique.direct_booking_urls.size;
  summary.unique.direct_booking_image_ids = unique.direct_booking_image_ids.size;
  summary.unique.external_http_urls = unique.external_http_urls.size;
  summary.unique.supabase_storage_urls = unique.supabase_storage_urls.size;

  const report = {
    generated_at: new Date().toISOString(),
    supabase_project: SUPABASE_URL.replace(/^https?:\/\//, ""),
    summary,
    tables: tables.sort((a, b) => b.media.total - a.media.total),
    failures,
    samples,
  };

  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUTPUT, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
