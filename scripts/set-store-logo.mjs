#!/usr/bin/env node
/**
 * Set a store's profile (logo) or cover image from a local file.
 *
 * Uploads the image to the `store-assets` bucket and writes the public URL to
 * store_profiles.logo_url (or banner_url). Uses the service-role key so it
 * bypasses the owner-scoped bucket RLS — run it locally, never ship the key.
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
 *   node scripts/set-store-logo.mjs <storeId> <imagePath> [logo|cover]
 *
 * Example (J&C Nail logo):
 *   node scripts/set-store-logo.mjs 6c7e2b95-3f55-4c13-a5ba-75fd8fc6d62b ./jc-nail-logo.png logo
 */
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [storeId, imagePath, surfaceArg] = process.argv.slice(2);
const surface = (surfaceArg || "logo").toLowerCase();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (!storeId || !imagePath) die("Usage: node scripts/set-store-logo.mjs <storeId> <imagePath> [logo|cover]");
if (surface !== "logo" && surface !== "cover") die(`Invalid surface "${surface}" — use "logo" or "cover".`);
if (!url) die("Missing SUPABASE_URL (or VITE_SUPABASE_URL) in env.");
if (!serviceKey) die("Missing SUPABASE_SERVICE_ROLE_KEY in env. Get it from Supabase → Project Settings → API → service_role. Do NOT commit it.");

const CONTENT_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml" };
const field = surface === "logo" ? "logo_url" : "banner_url";

const ext = (extname(imagePath).slice(1) || "png").toLowerCase();
const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

const file = await readFile(imagePath).catch(() => die(`Could not read image at "${imagePath}".`));
const path = `${storeId}/${surface}-${Date.now()}.${ext}`;

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log(`Uploading ${basename(imagePath)} (${(file.length / 1024).toFixed(0)} KB) → store-assets/${path} …`);
const { error: upErr } = await supabase.storage.from("store-assets").upload(path, file, { contentType, upsert: true });
if (upErr) die(`Upload failed: ${upErr.message}`);

const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
const publicUrl = urlData.publicUrl;

const { error: dbErr } = await supabase.from("store_profiles").update({ [field]: publicUrl }).eq("id", storeId);
if (dbErr) die(`Saved file but failed to update store_profiles.${field}: ${dbErr.message}`);

const { data: check } = await supabase.from("store_profiles").select(field).eq("id", storeId).maybeSingle();
if (check?.[field] !== publicUrl) die(`Update did not persist — store_profiles.${field} is "${check?.[field]}".`);

console.log(`\n✓ ${surface} set for store ${storeId}`);
console.log(`  ${field} = ${publicUrl}\n`);
