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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VEvent {
  uid: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (exclusive in iCal)
  summary?: string;
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

async function syncConnection(
  admin: any,
  conn: any,
): Promise<{ id: string; ok: boolean; events: number; error?: string }> {
  if (!conn.ical_import_url) {
    return { id: conn.id, ok: false, events: 0, error: "No import URL" };
  }
  try {
    const resp = await fetch(conn.ical_import_url, { redirect: "follow" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const events = parseICal(text);

    let written = 0;
    for (const ev of events) {
      if (!ev.start || !ev.end) continue;
      // Expand range into per-day rows; check_out is exclusive in iCal
      const start = new Date(ev.start + "T00:00:00Z");
      const end = new Date(ev.end + "T00:00:00Z");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    let body: { connection_id?: string } = {};
    try {
      body = await req.json();
    } catch { /* allow empty */ }

    let q = admin
      .from("lodging_channel_connections")
      .select("*")
      .eq("active", true);

    if (body.connection_id) q = q.eq("id", body.connection_id);

    const { data: conns, error } = await q;
    if (error) throw error;

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
