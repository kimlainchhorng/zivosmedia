import { createClient } from "../_shared/deps.ts";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

// Internal-only function. Idempotent. Generates a branded ZIVO PDF receipt for a completed ride,
// uploads to private `trip-receipts` bucket, records in `receipts`, emails the rider.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZERO_DECIMAL_CURRENCIES = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KHR", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);

function normalizeCurrency(value: unknown, paymentStatus: unknown): string {
  if (String(paymentStatus ?? "") === "bakong_paid") return "KHR";
  return String(value || "USD").toUpperCase();
}

function formatMoney(minorAmount: number, currency: string): string {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
    return `${Math.round(minorAmount).toLocaleString("en-US")} ${currency}`;
  }

  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorAmount / 100);
  } catch {
    return `$${(minorAmount / 100).toFixed(2)}`;
  }
}

function paymentLabel(status: unknown): string {
  if (status === "bakong_paid") return "Bakong KHQR";
  if (status === "cash") return "Cash";
  if (["paid", "captured", "authorized", "requires_capture"].includes(String(status ?? ""))) return "Card";
  return String(status || "-").replace(/_/g, " ");
}

function formatBakongBillId(reference: unknown): string | null {
  const trimmed = String(reference ?? "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split("-").filter(Boolean);
  return (parts[parts.length - 1] || trimmed.slice(-8)).toUpperCase();
}

function isBakongPayment(paymentStatus: unknown, currency: string, reference: unknown): boolean {
  return currency === "KHR" || String(paymentStatus ?? "").startsWith("bakong") || Boolean(String(reference ?? "").trim());
}

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!isServiceRoleRequest(req, serviceKey)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { ride_request_id, force = false } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotency
    const { data: existing } = await admin.from("receipts").select("id, pdf_path").eq("type", "ride").eq("reference_id", ride_request_id).maybeSingle();
    if (existing && !force) {
      return new Response(JSON.stringify({ ok: true, duplicate: true, pdf_path: existing.pdf_path }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, user_id, assigned_driver_id, pickup_address, dropoff_address, distance_miles, duration_minutes, captured_amount_cents, payment_amount, payment_currency, surcharge_amount_cents, quoted_base_fare, payment_intent_id, stripe_payment_intent_id, completed_at, created_at, payment_status, bakong_reference, bakong_amount_khr, bakong_verified_by")
      .eq("id", ride_request_id)
      .maybeSingle();
    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let driverName = "—";
    if (ride.assigned_driver_id) {
      const { data: d } = await admin.from("drivers").select("full_name, vehicle_model, vehicle_color, vehicle_plate").eq("id", ride.assigned_driver_id).maybeSingle();
      if (d) driverName = `${d.full_name ?? "—"} · ${[d.vehicle_color, d.vehicle_model, d.vehicle_plate].filter(Boolean).join(" ")}`;
    }

    const currency = normalizeCurrency(ride.payment_currency, ride.payment_status);
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
    const totalMinor = isZeroDecimal
      ? Math.round(Number(ride.bakong_amount_khr ?? ride.payment_amount ?? 0))
      : ((ride.captured_amount_cents as number) ?? Math.round(((ride.payment_amount as number) ?? 0) * 100));
    const surchargeMinor = isZeroDecimal ? 0 : ((ride.surcharge_amount_cents as number) ?? 0);
    const baseFareMinor = isZeroDecimal ? 0 : Math.round(((ride.quoted_base_fare as number) ?? 0) * 100);
    const fmt = (amount: number) => formatMoney(amount, currency);
    const completedAt = new Date((ride.completed_at as string) ?? (ride.created_at as string));
    const bakongReference = String(ride.bakong_reference ?? "").trim();
    const bakongBillId = formatBakongBillId(bakongReference);
    const isBakong = isBakongPayment(ride.payment_status, currency, bakongReference);
    const providerReference = bakongReference || ride.payment_intent_id || ride.stripe_payment_intent_id || "";

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const emerald = rgb(16 / 255, 185 / 255, 129 / 255);
    const dark = rgb(0.1, 0.1, 0.12);
    const muted = rgb(0.45, 0.45, 0.5);

    // Header band
    page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: emerald });
    page.drawText("ZIVO", { x: 40, y: 805, size: 28, font: bold, color: rgb(1, 1, 1) });
    page.drawText("RIDE RECEIPT", { x: 460, y: 812, size: 11, font: bold, color: rgb(1, 1, 1) });

    let y = 740;
    page.drawText(`Receipt #${ride.id.slice(0, 8).toUpperCase()}`, { x: 40, y, size: 14, font: bold, color: dark });
    y -= 16;
    page.drawText(completedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }), { x: 40, y, size: 10, font, color: muted });

    y -= 32;
    page.drawText("Trip", { x: 40, y, size: 11, font: bold, color: dark });
    y -= 16;
    page.drawText(`From: ${(ride.pickup_address ?? "—").slice(0, 80)}`, { x: 40, y, size: 10, font, color: dark });
    y -= 14;
    page.drawText(`To:   ${(ride.dropoff_address ?? "—").slice(0, 80)}`, { x: 40, y, size: 10, font, color: dark });
    y -= 14;
    page.drawText(`Distance: ${ride.distance_miles ? (ride.distance_miles as number).toFixed(1) + " mi" : "—"}    Duration: ${ride.duration_minutes ?? "—"} min`, { x: 40, y, size: 10, font, color: muted });
    y -= 14;
    page.drawText(`Driver:   ${driverName}`, { x: 40, y, size: 10, font, color: muted });

    // Line items
    y -= 32;
    page.drawText("Charges", { x: 40, y, size: 11, font: bold, color: dark });
    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: muted });

    const lineItem = (label: string, value: string) => {
      y -= 16;
      page.drawText(label, { x: 40, y, size: 10, font, color: dark });
      page.drawText(value, { x: 555 - bold.widthOfTextAtSize(value, 10), y, size: 10, font, color: dark });
    };
    if (baseFareMinor > 0) lineItem("Base fare", fmt(baseFareMinor));
    const computedFare = Math.max(0, totalMinor - surchargeMinor);
    lineItem("Trip fare", fmt(computedFare));
    if (surchargeMinor > 0) lineItem("Card surcharge (3.5%)", fmt(surchargeMinor));

    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: muted });
    y -= 18;
    page.drawText("Total", { x: 40, y, size: 12, font: bold, color: dark });
    page.drawText(fmt(totalMinor), { x: 555 - bold.widthOfTextAtSize(fmt(totalMinor), 12), y, size: 12, font: bold, color: emerald });

    y -= 30;
    page.drawText(`Payment: ${paymentLabel(ride.payment_status)}`, { x: 40, y, size: 9, font, color: muted });
    if (bakongBillId) {
      y -= 14;
      page.drawText(`Bill ID: ${bakongBillId}`, { x: 40, y, size: 9, font: bold, color: dark });
    }
    if (providerReference) {
      y -= 14;
      const label = bakongBillId ? "Full ref" : "Reference";
      page.drawText(`${label}: ${String(providerReference).slice(0, 95)}`, { x: 40, y, size: 9, font, color: muted });
    }
    if (ride.bakong_verified_by) {
      y -= 14;
      page.drawText(`Verified by: ${ride.bakong_verified_by}`, { x: 40, y, size: 9, font, color: muted });
    }

    // Footer
    page.drawLine({ start: { x: 40, y: 80 }, end: { x: 555, y: 80 }, thickness: 0.5, color: muted });
    page.drawText("ZIVO is a travel marketplace operating at hizivo.com.", { x: 40, y: 64, size: 8, font, color: muted });
    page.drawText("Support: support@hizivo.com  ·  hizivo.com/legal", { x: 40, y: 52, size: 8, font, color: muted });

    const bytes = await pdf.save();

    // Upload
    const path = isBakong ? `bakong-v2/${ride.user_id}/${ride.id}.pdf` : `${ride.user_id}/${ride.id}.pdf`;
    const { error: upErr } = await admin.storage.from("trip-receipts").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) {
      console.error("[generate-trip-receipt] upload error", upErr);
      return new Response(JSON.stringify({ error: "upload failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: receiptRow, error: insErr } = await admin
      .from("receipts")
      .upsert({
        type: "ride",
        reference_id: ride.id,
        user_id: ride.user_id,
        pdf_path: path,
        total_cents: totalMinor,
        currency,
      } as any, { onConflict: "type,reference_id" })
      .select("id")
      .single();
    if (insErr) console.warn("[generate-trip-receipt] receipts insert", insErr);

    // Email
    try {
      const { data: rider } = await admin.from("profiles").select("email, full_name").eq("user_id", ride.user_id).maybeSingle();
      if (rider?.email) {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            template: "generic",
            to: rider.email,
            subject: `Your ZIVO ride receipt — ${completedAt.toLocaleDateString()}`,
            data: {
              heading: `Thanks for riding with ZIVO`,
              body: `Your trip total was ${fmt(totalMinor)}.${bakongBillId ? ` Bakong Bill ID: ${bakongBillId}.` : ""} The full receipt PDF is available in your ride history.`,
            },
          },
        });
        if (receiptRow?.id) {
          await admin.from("receipts").update({ email_sent_at: new Date().toISOString() } as any).eq("id", receiptRow.id);
        }
      }
    } catch (e) {
      console.warn("[generate-trip-receipt] email failed", e);
    }

    return new Response(JSON.stringify({ ok: true, pdf_path: path, total_cents: totalMinor, currency, bill_id: bakongBillId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-trip-receipt]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
