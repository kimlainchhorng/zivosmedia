// Lodging iCal export — public endpoint that returns an .ics feed for a given export token.
// Usage: GET /functions/v1/lodging-ical-export?token=<ical_export_token>
//
// No auth required — the token IS the secret. Service role used internally to bypass RLS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toICalDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function plainDateToICal(s: string) {
  return s.replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response("Missing token", { status: 400, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data: conn } = await admin
      .from("lodging_channel_connections")
      .select("id, store_id, room_id, channel, display_name")
      .eq("ical_export_token", token)
      .maybeSingle();

    if (!conn) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    // Pull blocks for this room (or property if room_id is null)
    let blocksQ = admin
      .from("lodge_room_blocks")
      .select("id, block_date, summary, source, reason")
      .eq("store_id", conn.store_id);
    if (conn.room_id) blocksQ = blocksQ.eq("room_id", conn.room_id);
    const { data: blocks = [] } = await blocksQ;

    // Also include confirmed reservations so external OTAs see real bookings
    let resQ = admin
      .from("lodge_reservations")
      .select("id, room_id, check_in, check_out, status")
      .eq("store_id", conn.store_id)
      .in("status", ["confirmed", "checked_in", "checked_out"]);
    if (conn.room_id) resQ = resQ.eq("room_id", conn.room_id);
    const { data: reservations = [] } = await resQ;

    const now = new Date();
    const stamp = `${toICalDate(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zivo//Lodging//EN",
      "CALSCALE:GREGORIAN",
      `X-WR-CALNAME:${conn.display_name || "Zivo Lodging Calendar"}`,
    ];

    const addDay = (d: string) => {
      const dt = new Date(d + "T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate() + 1);
      return dt.toISOString().slice(0, 10);
    };

    for (const b of blocks || []) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:block-${b.id}@zivo`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${plainDateToICal(b.block_date)}`);
      lines.push(`DTEND;VALUE=DATE:${plainDateToICal(addDay(b.block_date))}`);
      lines.push(`SUMMARY:${(b.summary || b.reason || "Blocked").replace(/[\r\n]+/g, " ")}`);
      lines.push(`DESCRIPTION:Source ${b.source || "manual"}`);
      lines.push("END:VEVENT");
    }

    for (const r of reservations || []) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:res-${r.id}@zivo`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${plainDateToICal(r.check_in)}`);
      lines.push(`DTEND;VALUE=DATE:${plainDateToICal(r.check_out)}`);
      lines.push(`SUMMARY:Reservation`);
      lines.push(`DESCRIPTION:Zivo reservation ${r.status}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    const body = lines.join("\r\n");

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: any) {
    return new Response(`Error: ${err?.message || String(err)}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
