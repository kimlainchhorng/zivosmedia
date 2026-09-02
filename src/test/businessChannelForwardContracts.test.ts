import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const forward = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/businessChannelForward.ts"),
  "utf8",
);
const notifications = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/lodging-notifications.ts"),
  "utf8",
);
const dispatch = readFileSync(
  resolve(process.cwd(), "supabase/functions/zivosmedia-user-event-dispatch/index.ts"),
  "utf8",
);

describe("Zivo Business booking forward", () => {
  it("is inert before any I/O when unconfigured", () => {
    // All three must be present or the function returns without a query or a fetch.
    expect(forward).toContain('Deno.env.get("ZIVO_BUSINESS_INGEST_URL")');
    expect(forward).toContain('Deno.env.get("ZIVO_BUSINESS_BOOKING_SECRET")');
    expect(forward).toContain('Deno.env.get("ZIVO_BUSINESS_FORWARD_STORE_IDS")');
    expect(forward).toMatch(/if \(!url \|\| !secret \|\| targets\.size === 0\) return;/);

    // The guard has to precede the first read, or an unconfigured deployment pays
    // for a query on every confirmed booking.
    const guard = forward.indexOf("targets.size === 0");
    const firstQuery = forward.indexOf('.from("lodge_reservations")');
    expect(guard).toBeGreaterThan(-1);
    expect(firstQuery).toBeGreaterThan(guard);
  });

  it("cannot fail a guest's paid booking", () => {
    // Whole body wrapped: this runs inside the payment confirmation path.
    expect(forward).toMatch(/export async function forwardLodgingBookingToBusiness\([\s\S]{0,400}?\n {2}try \{/);
    expect(forward).toContain("} catch (error) {");
    expect(forward).not.toMatch(/\n\s*throw /);

    // A hang is the real hazard, not an exception.
    expect(forward).toContain("new AbortController()");
    expect(forward).toContain("signal: ac.signal");
    expect(forward).toMatch(/FORWARD_TIMEOUT_MS = \d/);
    expect(forward).toContain("clearTimeout(timer)");
  });

  it("signs exactly like the hub's existing emitter", () => {
    // Same peer, same convention — the receiver verifies the v2 header only.
    expect(forward).toContain('"x-zivo-signature-v2": `t=${ts},v1=${sigV2}`');
    expect(forward).toContain("hmacSha256Hex(secret, `${ts}.${rawBody}`)");
    expect(dispatch).toContain('"x-zivo-signature-v2": `t=${ts},v1=${sigV2}`');

    // Signature covers the exact bytes sent.
    const rawAssign = forward.indexOf("const rawBody = JSON.stringify(body)");
    const sign = forward.indexOf("hmacSha256Hex(secret,");
    const send = forward.indexOf("body: rawBody,");
    expect(rawAssign).toBeGreaterThan(-1);
    expect(sign).toBeGreaterThan(rawAssign);
    expect(send).toBeGreaterThan(sign);
  });

  it("does not reuse the identity webhook secret", () => {
    // A leak of the identity secret must not become the ability to write
    // reservations. Asserted on USE, not on mention: the file header names that
    // secret precisely to record that it is deliberately not the one used here.
    expect(forward).not.toMatch(/Deno\.env\.get\(\s*["']ZIVOSMEDIA_WEBHOOK_SECRET["']\s*\)/);
    expect(forward).toMatch(/Deno\.env\.get\(\s*"ZIVO_BUSINESS_BOOKING_SECRET"\s*\)/);
  });

  it("sends the payload shape the Business receiver contracts for", () => {
    expect(forward).toContain('event_type: "lodging_booking_confirmed"');
    expect(forward).toContain("external_store_id: storeId");
    for (const field of [
      "guest_name",
      "check_in",
      "check_out",
      "total_cents",
      "room_rate_cents",
      "tax_cents",
      "room_type",
      "room_number",
    ]) {
      expect(forward).toContain(`${field}:`);
    }
    // The receiver takes plain YYYY-MM-DD and rejects anything else.
    expect(forward).toMatch(/check_in:[^\n]*slice\(0, 10\)/);
    expect(forward).toMatch(/check_out:[^\n]*slice\(0, 10\)/);
  });

  it("carries occupancy and extras rather than dropping them", () => {
    // Business has no columns for these; notes is the honest place.
    expect(forward).toContain("adult(s)");
    expect(forward).toContain("child(ren)");
    expect(forward).toContain("extras");
    expect(forward).toContain("notes,");
  });

  it("only forwards allowlisted stores", () => {
    expect(forward).toMatch(/if \(!storeId \|\| !targets\.has\(storeId\.toLowerCase\(\)\)\) return;/);
  });

  it("is wired into the one path every payment method funnels through", () => {
    expect(notifications).toContain(
      'import { forwardLodgingBookingToBusiness } from "./businessChannelForward.ts";',
    );
    expect(notifications).toContain("await forwardLodgingBookingToBusiness(admin, reservationId);");

    // Inside notifyLodgingBookingConfirmed, after the guest notification is sent.
    const fn = notifications.indexOf("export async function notifyLodgingBookingConfirmed");
    const call = notifications.indexOf("forwardLodgingBookingToBusiness(admin, reservationId)");
    const notify = notifications.indexOf("await notifyLodgingReservation(", fn);
    expect(fn).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(notify);
  });
});
