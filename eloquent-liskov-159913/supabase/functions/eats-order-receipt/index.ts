/**
 * eats-order-receipt
 * -------------------
 * Generates a PDF receipt for a paid Eats order. Mirrors the lodging-reservation-receipt
 * shape: builds line items from the order's items[] JSON, includes payment provider +
 * reference, and streams back a one-page Helvetica PDF.
 *
 * Auth: customer who placed the order, restaurant owner of that order, or admin.
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function money(cents: number | null | undefined) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}
function fromDollars(amount: unknown) {
  const n = typeof amount === "number" ? amount : Number(amount ?? 0);
  return Math.round(n * 100);
}
function escPdf(value: unknown) {
  return String(value ?? "").replace(/[\\()]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
function makePdf(lines: string[]) {
  const content = ["BT", "/F1 18 Tf", "54 760 Td", `(ZIVO Eats Receipt) Tj`, "/F1 10 Tf", "0 -28 Td"];
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

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Card (Stripe)",
  paypal: "PayPal",
  square: "Square",
  cash: "Cash on delivery",
  wallet: "ZIVO Wallet",
};

function linesFromSnapshot(snapshot: any) {
  const providerLabel = snapshot.paymentProvider ? (PROVIDER_LABELS[snapshot.paymentProvider] || snapshot.paymentProvider) : null;
  const items = Array.isArray(snapshot.items) ? snapshot.items : [];
  return [
    `Restaurant: ${snapshot.restaurantName || "ZIVO restaurant"}`,
    `Order: ${snapshot.trackingCode || ""}`,
    `Customer: ${snapshot.customerName || snapshot.customerEmail || "Guest"}`,
    `Placed: ${snapshot.placedAt || ""}`,
    `Delivered to: ${snapshot.deliveryAddress || ""}`,
    `Order status: ${snapshot.status || ""}`,
    `Payment status: ${snapshot.paymentStatus || "pending"}`,
    ...(providerLabel ? [`Payment method: ${providerLabel}`] : []),
    ...(snapshot.providerReference ? [`Payment reference: ${snapshot.providerReference}`] : []),
    "",
    "Items:",
    ...(items.length
      ? items.map((it: any) => {
          const name = it.name ?? it.title ?? it.label ?? "Item";
          const qty = it.qty ?? it.quantity ?? 1;
          const lineCents = fromDollars(it.price ?? it.unit_price ?? 0) * Number(qty || 1);
          return `${qty}x ${name}: ${money(lineCents)}`;
        })
      : ["No item breakdown recorded"]),
    "",
    `Subtotal: ${money(snapshot.subtotalCents)}`,
    `Delivery: ${money(snapshot.deliveryFeeCents)}`,
    `Service: ${money(snapshot.serviceFeeCents)}`,
    ...(snapshot.tipCents ? [`Tip: ${money(snapshot.tipCents)}`] : []),
    ...(snapshot.discountCents ? [`Discount: -${money(snapshot.discountCents)}`] : []),
    `Total: ${money(snapshot.totalCents)}`,
    `Paid: ${money(snapshot.paidCents)}`,
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
    const orderId = url.searchParams.get("order_id") || body.order_id;
    if (!orderId) return new Response(JSON.stringify({ error: "missing_order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: o, error } = await admin
      .from("food_orders")
      .select("id, customer_id, customer_email, restaurant_id, tracking_code, delivery_address, status, payment_status, payment_provider, total_amount, subtotal, delivery_fee, service_fee, tip_amount, discount_amount, items, created_at, stripe_payment_id, paypal_capture_id, paypal_order_id, square_payment_id")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !o) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: restaurant } = await admin.from("restaurants").select("name, owner_id").eq("id", (o as any).restaurant_id).maybeSingle();
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    if ((o as any).customer_id !== user.id && restaurant?.owner_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const totalCents = fromDollars((o as any).total_amount);
    const subtotalCents = fromDollars((o as any).subtotal);
    const deliveryFeeCents = fromDollars((o as any).delivery_fee);
    const serviceFeeCents = fromDollars((o as any).service_fee);
    const tipCents = fromDollars((o as any).tip_amount);
    const discountCents = fromDollars((o as any).discount_amount);
    const paidCents = (o as any).payment_status === "paid" ? totalCents : 0;

    const provider = (o as any).payment_provider as string | null;
    const providerReference =
      provider === "stripe" ? (o as any).stripe_payment_id ?? null :
      provider === "paypal" ? (o as any).paypal_capture_id ?? (o as any).paypal_order_id ?? null :
      provider === "square" ? (o as any).square_payment_id ?? null :
      null;

    const filename = `ZIVO-eats-${(o as any).tracking_code || (o as any).id.slice(0, 8)}.pdf`;
    const snapshot = {
      restaurantName: restaurant?.name || "ZIVO restaurant",
      trackingCode: (o as any).tracking_code,
      customerName: null,
      customerEmail: (o as any).customer_email,
      placedAt: (o as any).created_at,
      deliveryAddress: (o as any).delivery_address,
      status: (o as any).status,
      paymentStatus: (o as any).payment_status,
      paymentProvider: provider,
      providerReference,
      items: (o as any).items,
      subtotalCents,
      deliveryFeeCents,
      serviceFeeCents,
      tipCents,
      discountCents,
      totalCents,
      paidCents,
      generatedAt: new Date().toISOString(),
    };

    const pdf = makePdf(linesFromSnapshot(snapshot));
    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[eats-order-receipt]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
