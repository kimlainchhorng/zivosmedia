import { createClient } from "../_shared/deps.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function money(cents: number | null | undefined) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}
function escPdf(value: unknown) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
function makePdf(lines: string[]) {
  const content = ["BT", "/F1 18 Tf", "54 760 Td", `(ZIVO Lodging Receipt) Tj`, "/F1 10 Tf", "0 -28 Td"];
  for (const line of lines) content.push(`(${escPdf(line)}) Tj`, "0 -16 Td");
  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${new TextEncoder().encode(stream).length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj + "\n";
  }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
async function sha256Hex(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Card (Stripe)",
  paypal: "PayPal",
  square: "Square",
  cash: "Cash on arrival",
};

function linesFromSnapshot(snapshot: any) {
  const providerLabel = snapshot.paymentProvider ? (PROVIDER_LABELS[snapshot.paymentProvider] || snapshot.paymentProvider) : null;
  return [
    `Property: ${snapshot.propertyName || "ZIVO property"}`,
    `Reservation: ${snapshot.reservationNumber || ""}`,
    `Guest: ${snapshot.guestName || "Guest"}`,
    `Stay: ${snapshot.checkIn || ""} to ${snapshot.checkOut || ""} (${snapshot.nights || 0} nights)`,
    `Room: ${snapshot.roomLabel || "Assigned room"}`,
    `Reservation status: ${snapshot.status || ""}`,
    `Payment status: ${snapshot.paymentStatus || "pending"}`,
    ...(providerLabel ? [`Payment method: ${providerLabel}`] : []),
    ...(snapshot.providerReference ? [`Payment reference: ${snapshot.providerReference}`] : []),
    `Total: ${money(snapshot.totalCents)}`,
    `Paid: ${money(snapshot.paidCents)}`,
    `Deposit: ${money(snapshot.depositCents)}`,
    `Add-ons/extras: ${money(snapshot.extrasCents)}`,
    `Taxes/fees: ${money(snapshot.taxCents)}`,
    `Balance: ${money(snapshot.balanceCents)}`,
    `Cancellation policy: ${snapshot.cancellationPolicy || "Standard ZIVO lodging policy"}`,
    "",
    "Charges:",
    ...(Array.isArray(snapshot.charges) && snapshot.charges.length ? snapshot.charges.map((c: any) => `${c.label}: ${money(c.amount_cents)}`) : ["No extra charges recorded"]),
    "",
    `Generated: ${snapshot.generatedAt || new Date().toISOString()}`,
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: any = {};
    if (req.method !== "GET") body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const reservationId = url.searchParams.get("reservation_id") || body.reservation_id;
    const receiptId = url.searchParams.get("receipt_id") || body.receipt_id;
    if (!reservationId && !receiptId) return new Response(JSON.stringify({ error: "missing_reservation_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (receiptId) {
      const { data: receipt } = await admin.from("lodge_reservation_receipts").select("*").eq("id", receiptId).maybeSingle();
      if (!receipt) return new Response(JSON.stringify({ error: "receipt_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: r } = await admin.from("lodge_reservations").select("id, guest_id, store_id").eq("id", receipt.reservation_id).maybeSingle();
      const { data: store } = await admin.from("restaurants").select("owner_id").eq("id", receipt.store_id).maybeSingle();
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles || []).some((role: any) => role.role === "admin");
      if (r?.guest_id !== user.id && store?.owner_id !== user.id && !isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const pdf = makePdf(linesFromSnapshot(receipt.snapshot));
      return new Response(pdf, { headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${receipt.filename}"` } });
    }

    const { data: r, error } = await admin
      .from("lodge_reservations")
      .select("id, store_id, room_id, guest_id, number, guest_name, guest_email, check_in, check_out, nights, room_number, status, payment_status, total_cents, paid_cents, deposit_cents, extras_cents, tax_cents, addons, addon_selections, fee_breakdown, payment_provider, stripe_payment_intent_id, paypal_order_id, paypal_capture_id, square_payment_id")
      .eq("id", reservationId)
      .maybeSingle();
    if (error || !r) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: store } = await admin.from("restaurants").select("name, owner_id").eq("id", r.store_id).maybeSingle();
    const { data: room } = await admin.from("lodge_rooms").select("name, room_type, cancellation_policy").eq("id", r.room_id).maybeSingle();
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((role: any) => role.role === "admin");
    if (r.guest_id !== user.id && store?.owner_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: charges } = await admin.from("lodge_reservation_charges").select("label, amount_cents, created_at").eq("reservation_id", r.id).order("created_at", { ascending: true });
    const balance = Math.max(0, (r.total_cents || 0) - (r.paid_cents || 0));
    const filename = `ZIVO-reservation-${r.number}.pdf`;
    const snapshot = {
      propertyName: store?.name || "ZIVO property",
      reservationNumber: r.number,
      guestName: r.guest_name || r.guest_email || "Guest",
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: r.nights || 0,
      roomLabel: r.room_number || room?.name || room?.room_type || "Assigned room",
      status: r.status,
      paymentStatus: r.payment_status || "pending",
      paymentProvider: (r as any).payment_provider || null,
      providerReference:
        (r as any).payment_provider === "stripe" ? (r as any).stripe_payment_intent_id ?? null :
        (r as any).payment_provider === "paypal" ? (r as any).paypal_capture_id ?? (r as any).paypal_order_id ?? null :
        (r as any).payment_provider === "square" ? (r as any).square_payment_id ?? null :
        null,
      totalCents: r.total_cents,
      paidCents: r.paid_cents,
      depositCents: r.deposit_cents,
      extrasCents: r.extras_cents,
      taxCents: r.tax_cents,
      balanceCents: balance,
      cancellationPolicy: room?.cancellation_policy || "Standard ZIVO lodging policy",
      charges: charges || [],
      generatedAt: new Date().toISOString(),
    };
    const pdf = makePdf(linesFromSnapshot(snapshot));
    const pdf_sha256 = await sha256Hex(pdf);
    await admin.from("lodge_reservation_receipts").insert({ reservation_id: r.id, store_id: r.store_id, generated_by: user.id, reservation_number: r.number, filename, snapshot, pdf_sha256 }).then(() => null);
    await notifyLodgingReservation(admin, { reservationId: r.id, event: "receipt_ready", templateName: "lodging-receipt-ready", idempotencyKey: `receipt-ready-${r.id}-${pdf_sha256.slice(0, 12)}`, title: "Your lodging receipt is ready", message: "Your PDF receipt was generated and saved to your trip history.", templateData: { generatedAt: snapshot.generatedAt }, smsBody: `ZIVO: Your lodging receipt for reservation ${r.number} is ready in your trip history.` });

    return new Response(pdf, { headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
