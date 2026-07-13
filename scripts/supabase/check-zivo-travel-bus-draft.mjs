#!/usr/bin/env node
/**
 * Checks that the Zivo Travel bus target migration draft contains the expected
 * schema/RPC sections. This is a text-level guard, not a SQL parser.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const draftPath = path.join(root, "docs", "zivo-travel-bus-target-migration-draft.sql");
const sql = readFileSync(draftPath, "utf8");

const required = [
  "create schema if not exists private",
  "grant usage on schema private to anon, authenticated, service_role",
  "to_regclass('public.store_profiles')",
  "to_regprocedure('public.set_updated_at()')",
  "to_regprocedure('public.is_store_owner(uuid, uuid)')",
  "to_regprocedure('public.is_admin(uuid)')",
  "create table if not exists public.bus_routes",
  "create table if not exists public.bus_trips",
  "create table if not exists public.bus_bookings",
  "create table if not exists public.bus_vehicles",
  "create table if not exists public.bus_drivers",
  "create table if not exists public.bus_route_stops",
  "create table if not exists public.bus_promos",
  "create table if not exists public.bus_reviews",
  "alter table public.bus_routes enable row level security",
  "create policy bus_routes_select",
  "create policy bus_bookings_select",
  "create policy bus_reviews_customer_insert",
  "create or replace function private.search_bus_trips",
  "create or replace function private.get_bus_trip_seats",
  "create or replace function private.create_bus_booking",
  "create or replace function private.get_my_bus_bookings",
  "create or replace function public.search_bus_trips",
  "create or replace function public.get_bus_trip_seats",
  "create or replace function public.create_bus_booking",
  "create or replace function public.get_my_bus_bookings",
  "create or replace function public.get_popular_bus_routes",
  "language sql stable security invoker set search_path = public, private",
  "revoke execute on function private.create_bus_booking",
  "grant execute on function public.create_bus_booking",
];

const missing = required.filter((needle) => !sql.includes(needle));
const functionBlocks = sql.match(/create or replace function (public|private)\.[\s\S]*?\n\$\$;/gi) ?? [];
const publicSecurityDefiners = functionBlocks.filter((block) => {
  if (!/^create or replace function public\./i.test(block)) return false;

  const header = block.split(/\bas\s+\$\$/i)[0] ?? block;
  return /\bsecurity\s+definer\b/i.test(header);
});

if (missing.length) {
  console.error("zivo-travel-bus-draft: failed");
  for (const needle of missing) console.error(`- Missing: ${needle}`);
  process.exit(1);
}

if (publicSecurityDefiners.length) {
  console.error("zivo-travel-bus-draft: failed");
  console.error("- Public API functions must not be security definer; move privileged bodies to private schema.");
  process.exit(1);
}

console.log(`zivo-travel-bus-draft: ok (${required.length} checks)`);
