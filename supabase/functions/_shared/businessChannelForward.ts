/**
 * Forward a confirmed lodging stay to the merchant's Zivo Business front desk.
 *
 * WHY THIS EXISTS. A property can be sold here while its operator runs their day
 * in Zivo Business (a separate Supabase project, separate auth). Without this the
 * guest books, pays, and the front desk never hears about it.
 *
 * WHERE IT RUNS. From notifyLodgingBookingConfirmed — the one choke point every
 * payment path funnels through (Stripe, PayPal, Square, Cutluy, and the
 * pay-at-property / bank-transfer / KHQR wrapper). Hooking there means one call
 * site instead of six, and it inherits that helper's idempotency.
 *
 * THE RULE THIS FILE EXISTS TO OBEY: **a forward failure must never touch the
 * guest's booking.** A property in Kampot must not fail its confirmation because
 * a hotel in Phnom Penh's endpoint is down. So:
 *   - the entire body is wrapped in try/catch and this function cannot throw;
 *   - the fetch carries an AbortController deadline, because the real hazard in a
 *     payment confirmation is not an exception, it is an unbounded hang;
 *   - it returns before ANY I/O when unconfigured.
 *
 * INERT BY DEFAULT, mirroring the receiver's fail-closed shape. All three of
 * ZIVO_BUSINESS_INGEST_URL, ZIVO_BUSINESS_BOOKING_SECRET and a non-empty
 * ZIVO_BUSINESS_FORWARD_STORE_IDS must be set or this is a no-op — no query, no
 * request, nothing logged.
 *
 * WHY AN ENV ALLOWLIST RATHER THAN A TABLE. Only a handful of the 1,000+
 * properties here are also run from Zivo Business, and this database has drifted
 * from its repo migrations (see AGENTS.md). An env var needs no schema change and
 * cannot half-apply.
 *
 * SIGNING. Byte-identical to zivosmedia-user-event-dispatch, which is already the
 * hub's signer for the same peer:
 *   x-zivo-signature-v2: t=<unix seconds>,v1=<hex HMAC(secret, "<t>.<rawBody>")>
 * The receiver binds the timestamp and rejects |now - t| > 300s, so a captured
 * delivery is not replayable. The secret is deliberately NOT
 * ZIVOSMEDIA_WEBHOOK_SECRET: that one syncs identity, this one writes
 * reservations, and a leak of one must not become the other.
 *
 * KNOWN GAP — NO RETRY. If the forward fails, the stay exists here and never
 * reaches the front desk, and nothing notices. A durable replay queue is the real
 * fix and it needs a table, which this database should not gain casually. Until
 * then the failure is logged with the reservation id so it can be replayed by
 * hand. Treat this as best-effort delivery, not guaranteed.
 *
 * Required env (Edge Function secrets), all three or nothing:
 *   ZIVO_BUSINESS_INGEST_URL         https://<ref>.supabase.co/functions/v1/hotel-channel-booking-ingest
 *   ZIVO_BUSINESS_BOOKING_SECRET     must equal Business's ZIVO_MEDIA_BOOKING_WEBHOOK_SECRET
 *   ZIVO_BUSINESS_FORWARD_STORE_IDS  comma-separated lodge store ids to forward
 */
import type { createClient } from "./deps.ts";

const CHANNEL = "zivosmedia";
const FORWARD_TIMEOUT_MS = 3_000;

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lowercased so a store id pasted with different casing still matches. */
function forwardStoreIds(): Set<string> {
  return new Set(
    (Deno.env.get("ZIVO_BUSINESS_FORWARD_STORE_IDS") ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/**
 * Best-effort. Never throws, never rejects, and never delays a confirmation by
 * more than FORWARD_TIMEOUT_MS.
 */
export async function forwardLodgingBookingToBusiness(
  admin: ReturnType<typeof createClient>,
  reservationId: string,
): Promise<void> {
  try {
    const url = (Deno.env.get("ZIVO_BUSINESS_INGEST_URL") ?? "").trim();
    const secret = (Deno.env.get("ZIVO_BUSINESS_BOOKING_SECRET") ?? "").trim();
    const targets = forwardStoreIds();
    // Before any I/O: an unconfigured deployment must cost nothing.
    if (!url || !secret || targets.size === 0) return;

    const { data: r } = await admin
      .from("lodge_reservations")
      .select(
        "id, number, store_id, room_id, room_number, guest_name, guest_email, guest_phone, " +
          "check_in, check_out, adults, children, rate_cents, tax_cents, extras_cents, total_cents",
      )
      .eq("id", reservationId)
      .maybeSingle();
    if (!r) return;

    const storeId = String((r as Record<string, unknown>).store_id ?? "");
    if (!storeId || !targets.has(storeId.toLowerCase())) return;

    const row = r as Record<string, unknown>;

    // room_type lives on the room, not the reservation. Absent is fine — the
    // receiver stores "Unassigned" rather than failing the write.
    let roomType = "";
    if (typeof row.room_id === "string" && row.room_id) {
      const { data: room } = await admin
        .from("lodge_rooms")
        .select("room_type")
        .eq("id", row.room_id)
        .maybeSingle();
      const t = (room as Record<string, unknown> | null)?.room_type;
      if (typeof t === "string") roomType = t;
    }

    // Zivo Business's hotel_reservations has no occupancy or extras columns, and
    // this migration must not invent any. Rather than drop the numbers silently,
    // carry them where a receptionist will actually read them.
    const adults = positiveInt(row.adults) ?? 0;
    const children = positiveInt(row.children) ?? 0;
    const extras = positiveInt(row.extras_cents) ?? 0;
    const notes = [
      `Booked on ZIVO (${CHANNEL})`,
      row.number ? `ref ${String(row.number)}` : null,
      `${adults} adult(s), ${children} child(ren)`,
      extras > 0 ? `extras ${(extras / 100).toFixed(2)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const body = {
      event_type: "lodging_booking_confirmed",
      channel: CHANNEL,
      external_store_id: storeId,
      booking: {
        id: String(row.id ?? reservationId),
        guest_name: typeof row.guest_name === "string" ? row.guest_name : "",
        email: typeof row.guest_email === "string" ? row.guest_email : "",
        phone: typeof row.guest_phone === "string" ? row.guest_phone : "",
        room_type: roomType,
        room_number: typeof row.room_number === "string" ? row.room_number : "",
        check_in: typeof row.check_in === "string" ? row.check_in.slice(0, 10) : "",
        check_out: typeof row.check_out === "string" ? row.check_out.slice(0, 10) : "",
        total_cents: positiveInt(row.total_cents) ?? 0,
        room_rate_cents: positiveInt(row.rate_cents),
        tax_cents: positiveInt(row.tax_cents),
        notes,
      },
    };

    const rawBody = JSON.stringify(body);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sigV2 = await hmacSha256Hex(secret, `${ts}.${rawBody}`);

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), FORWARD_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-zivo-timestamp": ts,
          "x-zivo-signature-v2": `t=${ts},v1=${sigV2}`,
        },
        body: rawBody,
        signal: ac.signal,
      });
      if (!res.ok) {
        // 409 means the listing is not linked on the Business side yet — expected
        // until an operator claims it, and not worth alarming on.
        console.error(
          `[businessChannelForward] reservation ${reservationId} store ${storeId} -> HTTP ${res.status}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    // Deliberately swallowed. The guest's booking is already paid and confirmed;
    // this is a downstream courtesy and must not surface as a booking failure.
    console.error(
      `[businessChannelForward] reservation ${reservationId} forward failed:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
