import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", override: false, quiet: true });
config({ path: ".env", override: false, quiet: true });

const KNOWN_PRODUCTION_REFS = new Set(["slirphzzwcogdbkeicff"]);
const SAFE_ENV_NAMES = new Set(["local", "staging", "test"]);

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run smoke:lodging:test-reservation -- [--json] [--create]

Default mode checks safety only and never mutates data.

Required for --create:
  VITE_SUPABASE_URL or SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY
  ZIVO_ALLOW_LODGING_TEST_RESERVATION=1
  ZIVO_LODGING_TEST_ENV=local|staging|test
  ZIVO_TEST_USER_EMAIL and ZIVO_TEST_USER_PASSWORD

Optional:
  ZIVO_TEST_LODGE_STORE_ID
  ZIVO_TEST_LODGE_ROOM_ID
  ZIVO_TEST_LODGE_CHECK_IN
  ZIVO_TEST_LODGE_CHECK_OUT
  ZIVO_TEST_LODGE_NIGHTS`);
  process.exit(0);
}
const shouldCreate = args.has("--create");
const jsonOutput = args.has("--json");

const env = process.env;
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const publishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_ANON_KEY;
const testEnvironment = String(env.ZIVO_LODGING_TEST_ENV || "").trim().toLowerCase();
const allowMutation = env.ZIVO_ALLOW_LODGING_TEST_RESERVATION === "1";
const email = env.ZIVO_TEST_USER_EMAIL || env.VITE_TEST_USER_EMAIL;
const password = env.ZIVO_TEST_USER_PASSWORD || env.VITE_TEST_USER_PASSWORD;
const accessToken = env.ZIVO_TEST_ACCESS_TOKEN;

function projectRefFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return "local";
    return parsed.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function safetyStatus() {
  const projectRef = projectRefFromUrl(supabaseUrl || "");
  const isLocalUrl = /^(http:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(supabaseUrl || "");
  const safeEnv = SAFE_ENV_NAMES.has(testEnvironment);
  const knownProduction = KNOWN_PRODUCTION_REFS.has(projectRef);
  const safe = Boolean(supabaseUrl && publishableKey && allowMutation && (isLocalUrl || safeEnv) && !knownProduction);
  const reasons = [];

  if (!supabaseUrl) reasons.push("Missing VITE_SUPABASE_URL or SUPABASE_URL.");
  if (!publishableKey) reasons.push("Missing VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY.");
  if (!allowMutation) reasons.push("Set ZIVO_ALLOW_LODGING_TEST_RESERVATION=1 to allow test mutation.");
  if (!isLocalUrl && !safeEnv) reasons.push("Set ZIVO_LODGING_TEST_ENV to local, staging, or test for non-local URLs.");
  if (knownProduction) reasons.push(`Refusing known production Supabase project ${projectRef}.`);

  return { safe, reasons, projectRef, isLocalUrl, testEnvironment, shouldCreate };
}

async function authenticate(client) {
  if (accessToken) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) throw new Error(`Test access token rejected: ${error.message}`);
    return { id: data.user.id, email: data.user.email };
  }

  if (!email || !password) {
    throw new Error("Set ZIVO_TEST_USER_EMAIL/ZIVO_TEST_USER_PASSWORD or ZIVO_TEST_ACCESS_TOKEN.");
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in test user: ${error.message}`);
  return { id: data.user.id, email: data.user.email };
}

async function findRoom(client) {
  const configuredStoreId = env.ZIVO_TEST_LODGE_STORE_ID;
  const configuredRoomId = env.ZIVO_TEST_LODGE_ROOM_ID;
  if (configuredStoreId && configuredRoomId) {
    return { store_id: configuredStoreId, id: configuredRoomId, label: "configured room" };
  }

  let query = client
    .from("lodge_rooms")
    .select("id, store_id, name, room_type, max_guests")
    .eq("is_active", true)
    .limit(20);

  if (configuredStoreId) query = query.eq("store_id", configuredStoreId);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load lodge rooms: ${error.message}`);
  const room = (data || []).find((candidate) => candidate.id && candidate.store_id);
  if (!room) {
    throw new Error("No active lodge room was visible to the signed-in test user.");
  }
  return {
    store_id: room.store_id,
    id: room.id,
    label: room.name || room.room_type || room.id,
    max_guests: room.max_guests,
  };
}

async function createReservation(client, room, user) {
  const requestedCheckIn = env.ZIVO_TEST_LODGE_CHECK_IN;
  const requestedCheckOut = env.ZIVO_TEST_LODGE_CHECK_OUT;
  const nights = Math.max(1, Number(env.ZIVO_TEST_LODGE_NIGHTS || 1));
  const attempts = requestedCheckIn && requestedCheckOut ? 1 : 21;
  const base = new Date();

  let lastError = null;
  for (let index = 0; index < attempts; index += 1) {
    const checkIn = requestedCheckIn || ymd(addDays(base, 1 + index));
    const checkOut = requestedCheckOut || ymd(addDays(base, 1 + index + nights));
    const payload = {
      store_id: room.store_id,
      room_id: room.id,
      guest_name: env.ZIVO_TEST_GUEST_NAME || "ZIVO Lodging Smoke Test",
      guest_phone: env.ZIVO_TEST_GUEST_PHONE || "+15550101999",
      guest_email: env.ZIVO_TEST_GUEST_EMAIL || user.email || email || null,
      adults: Math.max(1, Number(env.ZIVO_TEST_LODGE_ADULTS || 2)),
      children: Math.max(0, Number(env.ZIVO_TEST_LODGE_CHILDREN || 0)),
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmed",
      source: "zivo_lodging_smoke_harness",
      payment_method: "cash",
      notes: "Local/staging smoke test reservation. Safe to delete.",
      guest_details: {
        smoke_test: true,
        created_by: "scripts/lodging/create-test-reservation.mjs",
      },
    };

    const { data, error } = await client.rpc("create_lodge_guest_reservation", { p_payload: payload });
    if (!error && data?.id) {
      return { ...data, store_id: room.store_id, room_id: room.id };
    }
    lastError = error || new Error("RPC did not return a reservation id.");
  }

  throw new Error(`Could not create an available test reservation: ${lastError?.message || lastError}`);
}

function print(result) {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.status === "safe-check") {
    console.log("Lodging smoke harness check passed.");
    console.log("Run again with --create to create one cash test reservation.");
    return;
  }
  if (result.status === "unsafe") {
    console.log("Lodging smoke harness refused to mutate data.");
    for (const reason of result.safety.reasons) console.log(`- ${reason}`);
    return;
  }
  console.log("Created lodging smoke test reservation:");
  console.log(`- Reservation: ${result.reservation.id} (${result.reservation.number})`);
  console.log(`- Status: ${result.reservation.status} / ${result.reservation.payment_status}`);
  console.log(`- My Booking: ${result.urls.myBooking}`);
  console.log(`- Confirmation: ${result.urls.confirmation}`);
}

const safety = safetyStatus();
if (!safety.safe) {
  print({ status: "unsafe", safety });
  process.exit(shouldCreate ? 2 : 0);
}

if (!shouldCreate) {
  print({ status: "safe-check", safety });
  process.exit(0);
}

const client = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
});

const user = await authenticate(client);
const room = await findRoom(client);
const reservation = await createReservation(client, room, user);

print({
  status: "created",
  safety,
  user,
  room,
  reservation,
  urls: {
    myBooking: `/my-trips/lodging/${reservation.id}`,
    confirmation: `/hotel/${reservation.store_id}/booking-confirmed?reservation_id=${reservation.id}`,
  },
});
