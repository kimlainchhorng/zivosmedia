import { createClient } from "../_shared/deps.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function money(cents: number | null | undefined) { return `$${((cents || 0) / 100).toFixed(2)}`; }
function escPdf(value: unknown) { return String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[\r\n]+/g, " "); }
function makePdf(lines: string[]) {
  const content = ["BT", "/F1 18 Tf", "54 760 Td", `(ZIVO Lodging Receipt) Tj`, "/F1 10 Tf", "0 -28 Td"];
  for (const line of lines) content.push(`(${escPdf(line)}) Tj`, "0 -16 Td");
  content.push("ET");
  const stream = content.join("\n");
  const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj", "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj", `5 0 obj << /Length ${new TextEncoder().encode(stream).length} >> stream\n${stream}\nendstream endobj`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (const obj of objects) { offsets.push(new TextEncoder().encode(pdf).length); pdf += obj + "\n"; }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
function linesFromSnapshot(s: any) { return [`Property: ${s.propertyName || "ZIVO property"}`, `Reservation: ${s.reservationNumber || ""}`, `Guest: ${s.guestName || "Guest"}`, `Stay: ${s.checkIn || ""} to ${s.checkOut || ""} (${s.nights || 0} nights)`, `Room: ${s.roomLabel || "Assigned room"}`, `Reservation status: ${s.status || ""}`, `Payment status: ${s.paymentStatus || "pending"}`, `Total: ${money(s.totalCents)}`, `Paid: ${money(s.paidCents)}`, `Deposit: ${money(s.depositCents)}`, `Add-ons/extras: ${money(s.extrasCents)}`, `Taxes/fees: ${money(s.taxCents)}`, `Balance: ${money(s.balanceCents)}`, `Cancellation policy: ${s.cancellationPolicy || "Standard ZIVO lodging policy"}`, "", `Generated: ${s.generatedAt || new Date().toISOString()}`]; }
async function sha256Hex(text: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function randomToken() { const b = new Uint8Array(32); crypto.getRandomValues(b); return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join(""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const url = new URL(req.url);
    if (req.method === "GET") {
      const token = url.searchParams.get("token") || "";
      if (!token) return new Response(JSON.stringify({ error: "missing_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const tokenHash = await sha256Hex(token);
      const { data: row } = await admin.from("lodge_receipt_share_tokens").select("*, receipt:lodge_reservation_receipts(*)").eq("token_hash", tokenHash).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!row?.receipt) return new Response(JSON.stringify({ error: "expired_or_invalid" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("lodge_receipt_share_tokens").update({ last_accessed_at: new Date().toISOString(), access_count: Number(row.access_count || 0) + 1 }).eq("id", row.id).then(() => null);
      const pdf = makePdf(linesFromSnapshot(row.receipt.snapshot));
      return new Response(pdf, { headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${row.receipt.filename || "ZIVO-receipt.pdf"}"` } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub;
    const { receipt_id } = await req.json().catch(() => ({}));
    if (!receipt_id) return new Response(JSON.stringify({ error: "missing_receipt_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: receipt } = await admin.from("lodge_reservation_receipts").select("*").eq("id", receipt_id).maybeSingle();
    if (!receipt) return new Response(JSON.stringify({ error: "receipt_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: r } = await admin.from("lodge_reservations").select("id, guest_id, guest_email, guest_phone, number").eq("id", receipt.reservation_id).maybeSingle();
    if (r?.guest_id !== userId) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    await admin.from("lodge_receipt_share_tokens").insert({ receipt_id, reservation_id: receipt.reservation_id, guest_id: userId, token_hash: tokenHash, expires_at: expires });
    const downloadUrl = `${url.origin}${url.pathname}?token=${token}`;
    await notifyLodgingReservation(admin, { reservationId: receipt.reservation_id, event: "receipt_shared", templateName: "lodging-receipt-ready", idempotencyKey: `receipt-share-${receipt_id}-${tokenHash.slice(0, 12)}`, title: "Your lodging receipt is ready", message: "Use the secure link to download your receipt snapshot.", templateData: { downloadUrl, generatedAt: receipt.created_at, expiresAt: expires }, smsBody: `ZIVO receipt for reservation ${r?.number || ""}: ${downloadUrl}` });
    return new Response(JSON.stringify({ ok: true, expires_at: expires }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
