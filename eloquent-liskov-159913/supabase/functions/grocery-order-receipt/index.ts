/**
 * grocery-order-receipt
 * ----------------------
 * PDF receipt for a paid Grocery (shopping_orders) order. Mirrors
 * eats-order-receipt: payment provider + reference, line items, totals.
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
  const content = ["BT", "/F1 18 Tf", "54 760 Td", `(ZIVO Grocery Receipt) Tj`, "/F1 10 Tf", "0 -28 Td"];
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
    `Store: ${snapshot.storeName || "ZIVO Grocery"}`,
    `Order: ${(snapshot.orderId || "").slice(0, 8)}`,
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
          const name = it.name ?? it.title ?? "Item";
          const qty = it.quantity ?? it.qty ?? 1;
          const lineCents = fromDollars(it.price ?? it.unit_price ?? 0) * Number(qty || 1);
          return `${qty}x ${name}: ${money(lineCents)}`;
        })
      : ["No item breakdown recorded"]),
    "",
    `Subtotal: ${money(snapshot.subtotalCents)}`,
    `Delivery: ${money(snapshot.deliveryFeeCents)}`,
    ...(snapshot.serviceFeeCents ? [`Service: ${money(snapshot.serviceFeeCents)}`] : []),
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
      .from("shopping_orders")
      .select("id, user_id, customer_email, customer_name, store, delivery_address, status, payment_status, payment_provider, total_amount, final_total, delivery_fee, service_fee, tip, promo_discount, items, placed_at, stripe_payment_intent_id, paypal_capture_id, paypal_order_id, square_payment_id")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !o) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if ((o as any).user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const totalCents = fromDollars((o as any).final_total || (o as any).total_amount);
    const subtotalCents = fromDollars((o as any).total_amount);
    const deliveryFeeCents = fromDollars((o as any).delivery_fee);
    const serviceFeeCents = fromDollars((o as any).service_fee);
    const tipCents = fromDollars((o as any).tip);
    const discountCents = fromDollars((o as any).promo_discount);
    const paidCents = (o as any).payment_status === "paid" ? totalCents : 0;

    const provider = (o as any).payment_provider as string | null;
    const providerReference =
      provider === "stripe" ? (o as any).stripe_payment_intent_id ?? null :
      provider === "paypal" ? (o as any).paypal_capture_id ?? (o as any).paypal_order_id ?? null :
      provider === "square" ? (o as any).square_payment_id ?? null :
      null;

    const filename = `ZIVO-grocery-${(o as any).id.slice(0, 8)}.pdf`;
    const snapshot = {
      storeName: (o as any).store || "ZIVO Grocery",
      orderId: (o as any).id,
      customerName: (o as any).customer_name,
      customerEmail: (o as any).customer_email,
      placedAt: (o as any).placed_at,
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
    console.error("[grocery-order-receipt]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
