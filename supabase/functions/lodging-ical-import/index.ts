// Lodging iCal import — pulls external calendars and writes blocks into lodging_room_blocks.
// Usage:
//   POST /functions/v1/lodging-ical-import
//   Body: { connection_id?: string }   // sync a single connection (manual button)
//   Body: {}                            // sync all active connections (cron)
//
// Auth: requires a valid user JWT for single-connection sync (RLS enforces ownership).
// Cron sync uses service role internally.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

interface VEvent {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (exclusive in iCal)
  summary?: string;
}


const MAX_ICAL_URL_LENGTH = 2_048;
const MAX_ICAL_BYTES = 1_000_000;
const MAX_ICAL_EVENTS = 500;
const MAX_EVENT_DAYS = 366;
const MAX_IMPORTED_DAYS = 5_000;
const MAX_REDIRECTS = 3;
const CALENDAR_FETCH_TIMEOUT_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

function normalizedHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function isBlockedIpAddress(value: string): boolean {
  const hostname = normalizedHostname(value);
  const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (
      octets.some(
        (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
      )
    )
      return true;
    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }

  if (!hostname.includes(":")) return false;
  if (hostname === "::" || hostname === "::1" || hostname.startsWith("::ffff:"))
    return true;
  const firstHextet = Number.parseInt(hostname.split(":")[0] || "0", 16);
  return (
    firstHextet === 0 ||
    firstHextet === 0xfc ||
    firstHextet === 0xfd ||
    (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) ||
    firstHextet >= 0xff00
  );
}

function isIpLiteral(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return /^\d+\.\d+\.\d+\.\d+$/.test(normalized) || normalized.includes(":");
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".home.arpa") ||
    normalized === "metadata.google" ||
    normalized === "metadata.google.internal" ||
    normalized === "instance-data.ec2.internal" ||
    isBlockedIpAddress(normalized)
  );
}

async function validateCalendarUrl(value: string): Promise<URL> {
  if (!value || value.length > MAX_ICAL_URL_LENGTH) {
    throw new Error("Calendar URL is invalid");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Calendar URL is invalid");
  }

  const hostname = normalizedHostname(parsed.hostname);
  if (
    parsed.protocol !== "https:" ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    isBlockedHostname(hostname)
  ) {
    throw new Error("Calendar destination is not allowed");
  }

  if (isIpLiteral(hostname)) return parsed;

  // Resolve every address before connecting so private/link-local DNS answers
  // cannot be used as an iCal egress target. Fail closed if DNS is unavailable.
  const [ipv4, ipv6] = await Promise.all([
    Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
    Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
  ]);
  const addresses = [...ipv4, ...ipv6];
  if (!addresses.length || addresses.some(isBlockedIpAddress)) {
    throw new Error("Calendar destination is not allowed");
  }

  return parsed;
}

async function fetchCalendarText(value: string): Promise<string> {
  let target = await validateCalendarUrl(value);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CALENDAR_FETCH_TIMEOUT_MS,
    );
    let response: Response;
    try {
      response = await fetch(target.toString(), {
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || hop === MAX_REDIRECTS) {
          throw new Error("Too many or invalid calendar redirects");
        }
        target = await validateCalendarUrl(
          new URL(location, target).toString(),
        );
        continue;
      }

      if (!response.ok)
        throw new Error(`Calendar fetch failed (${response.status})`);

      const declaredLengthHeader = response.headers.get("content-length");
      const declaredLength =
        declaredLengthHeader === null ? 0 : Number(declaredLengthHeader);
      if (
        declaredLengthHeader !== null &&
        (!Number.isFinite(declaredLength) ||
          declaredLength < 0 ||
          declaredLength > MAX_ICAL_BYTES)
      ) {
        throw new Error("Calendar response too large");
      }

      if (!response.body) throw new Error("Calendar response is empty");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          if (!chunk) continue;
          total += chunk.byteLength;
          if (total > MAX_ICAL_BYTES) {
            await reader.cancel("calendar_too_large");
            throw new Error("Calendar response too large");
          }
          chunks.push(chunk);
        }
      } finally {
        reader.releaseLock();
      }

      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return new TextDecoder().decode(bytes);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Too many or invalid calendar redirects");
}

function parseICal(text: string): VEvent[] {
  // Unfold lines (RFC 5545: lines starting with space/tab continue previous)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: VEvent[] = [];
  let cur: Partial<VEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.uid && cur.start && cur.end) {
        if (events.length >= MAX_ICAL_EVENTS) throw new Error("Calendar contains too many events");
        events.push(cur as VEvent);
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();

    if (key === "UID") cur.uid = value.trim();
    else if (key === "DTSTART") cur.start = normDate(value);
    else if (key === "DTEND") cur.end = normDate(value);
    else if (key === "SUMMARY") cur.summary = value.trim();
  }
  return events;
}

function normDate(v: string): string {
  // Handles 20260615 or 20260615T120000Z → YYYY-MM-DD
  const trimmed = v.trim().replace(/[-:Z]/g, "");
  const datePart = trimmed.slice(0, 8);
  if (!/^\d{8}$/.test(datePart)) return "";
  return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
}

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const [{ data: store }, { data: employee }, { data: roles }] = await Promise.all([
    admin.from("restaurants").select("owner_id").eq("id", storeId).maybeSingle(),
    admin.from("store_employees").select("id").eq("store_id", storeId).eq("user_id", userId).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
  return Boolean(isAdmin || store?.owner_id === userId || employee);
}

async function syncConnection(
  admin: any,
  conn: any,
): Promise<{ id: string; ok: boolean; events: number; error?: string }> {
  if (!conn.ical_import_url) {
    return { id: conn.id, ok: false, events: 0, error: "No import URL" };
  }
  try {
    const text = await fetchCalendarText(conn.ical_import_url);
    const events = parseICal(text);

    let written = 0;
    let plannedDays = 0;
    for (const ev of events) {
      if (!ev.start || !ev.end) continue;
      // Expand range into per-day rows; check_out is exclusive in iCal
      const start = new Date(ev.start + "T00:00:00Z");
      const end = new Date(ev.end + "T00:00:00Z");
      const startMs = start.getTime();
      const endMs = end.getTime();
      const dayCount = (endMs - startMs) / DAY_MS;
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) ||
          !Number.isInteger(dayCount) || dayCount < 1 || dayCount > MAX_EVENT_DAYS) {
        throw new Error("Calendar event range is invalid or too large");
      }
      plannedDays += dayCount;
      if (plannedDays > MAX_IMPORTED_DAYS) throw new Error("Calendar import exceeds write limit");
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const blockDate = d.toISOString().slice(0, 10);
        const { error } = await admin.from("lodge_room_blocks").upsert(
          {
            store_id: conn.store_id,
            room_id: conn.room_id,
            block_date: blockDate,
            source: conn.channel,
            external_uid: ev.uid,
            summary: ev.summary || null,
            reason: ev.summary || `Imported from ${conn.channel}`,
          },
          { onConflict: "room_id,block_date" },
        );
        if (!error) written++;
      }
    }

    await admin
      .from("lodging_channel_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_sync_error: null,
        events_imported: written,
      })
      .eq("id", conn.id);

    return { id: conn.id, ok: true, events: written };
  } catch (err: any) {
    await admin
      .from("lodging_channel_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: err?.message || String(err),
      })
      .eq("id", conn.id);
    return { id: conn.id, ok: false, events: 0, error: err?.message || String(err) };
  }
}

Deno.serve(withSecurity("lodging-ical-import", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const importHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" };

  if (req.method === "OPTIONS") return new Response("ok", { headers: importHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    let body: { connection_id?: string } = {};
    try {
      body = await req.json();
    } catch { /* allow empty */ }

    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const provided = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
    const isInternal = Boolean(cronSecret && provided === cronSecret) || isServiceRoleRequest(req, SERVICE_ROLE);

    let conns: any[] = [];
    if (body.connection_id) {
      const { data: conn, error } = await admin
        .from("lodging_channel_connections")
        .select("*")
        .eq("active", true)
        .eq("id", body.connection_id)
        .maybeSingle();
      if (error) throw error;
      if (!conn) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...importHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isInternal) {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
          auth: { persistSession: false },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...importHeaders, "Content-Type": "application/json" },
          });
        }
        const allowed = await canManageStore(admin, user.id, conn.store_id);
        if (!allowed) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...importHeaders, "Content-Type": "application/json" },
          });
        }
      }
      conns = [conn];
    } else {
      if (!isInternal) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { ...importHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await admin
        .from("lodging_channel_connections")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      conns = data ?? [];
    }

    const results = [];
    for (const c of conns || []) {
      results.push(await syncConnection(admin, c));
    }

    return new Response(
      JSON.stringify({
        synced: results.length,
        ok: results.filter((r) => r.ok).length,
        results,
      }),
      { headers: { ...importHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { ...importHeaders, "Content-Type": "application/json" } },
    );
  }
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
