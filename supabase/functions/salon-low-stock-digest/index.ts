/**
 * salon-low-stock-digest
 * ----------------------
 * Daily cron job: emails each salon owner a digest of retail products that
 * are at or below their low_stock_threshold and haven't been alerted in the
 * last 6 days. Scheduled by pg_cron in 20260603000000_salon_low_stock_alerts.sql
 * to fire at 14:00 UTC.
 *
 * Pipeline:
 *   1. Auth: cron-secret OR service-role bearer (mirror notifications-cron).
 *   2. Walk every active salon store. For each, pull the owner's email and
 *      the list of currently-low + not-recently-alerted products via the
 *      service-role-only RPC.
 *   3. If any rows, send a single passthrough email using the existing
 *      salon-campaign-passthrough template (it takes arbitrary subject +
 *      body_html, so we don't need a new template just for this).
 *   4. Stamp last_low_stock_alert_at = now() on the products included so
 *      we don't re-alert tomorrow.
 *
 * Idempotency: the 6-day dedup on the SQL side is the primary guard. A
 * mid-pass crash that emails but fails to stamp would just re-alert the
 * next run — acceptable for the v1.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const j = (status: number, body: unknown, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(withSecurity("salon-low-stock-digest", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" }, corsHeaders);

  const cronSecretExpected = Deno.env.get("CRON_SECRET") ?? "";
  const url = new URL(req.url);
  const providedSecret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isService = auth === `Bearer ${serviceKey}`;
  const cronOk = !!cronSecretExpected && providedSecret === cronSecretExpected;
  if (!isService && !cronOk) return j(401, { error: "Unauthorized" }, corsHeaders);

  const supabase = createClient(supabaseUrl, serviceKey);

  // ---- Find active salon stores ----------------------------------------
  // Joining auth.users by owner_id directly isn't possible from PostgREST,
  // so we fan out: pull stores first, then look up each owner's email.
  const { data: stores, error: storesErr } = await supabase
    .from("store_profiles")
    .select("id, name, owner_id, slug")
    .eq("category", "salon")
    .eq("is_active", true);
  if (storesErr) {
    console.error("[salon-low-stock-digest] stores load failed", storesErr);
    return j(500, { error: storesErr.message }, corsHeaders);
  }

  let storesProcessed = 0;
  let emailsSent = 0;
  let productsAlerted = 0;

  for (const store of (stores ?? []) as Array<{ id: string; name: string; owner_id: string; slug: string }>) {
    storesProcessed++;

    const { data: lowRows, error: lowErr } = await supabase.rpc(
      "salon_get_low_stock_for_store",
      { p_store_id: store.id },
    );
    if (lowErr) {
      console.error("[salon-low-stock-digest] rpc failed", { store: store.id, err: lowErr });
      continue;
    }
    const products = ((lowRows ?? []) as unknown as Array<{
      id: string;
      name: string;
      stock_quantity: number;
      low_stock_threshold: number;
      sku: string | null;
    }>);
    if (products.length === 0) continue;

    // Resolve the owner's email. auth.admin.getUserById is the canonical
    // path inside a service-role function.
    let ownerEmail: string | null = null;
    try {
      const { data: ownerData, error: oErr } = await supabase.auth.admin.getUserById(store.owner_id);
      if (oErr || !ownerData?.user?.email) {
        console.warn("[salon-low-stock-digest] no owner email", { store: store.id });
        continue;
      }
      ownerEmail = ownerData.user.email;
    } catch (e) {
      console.error("[salon-low-stock-digest] auth lookup failed", e);
      continue;
    }

    // Compose the body. Plain-ish HTML — the template wraps it in the
    // standard transactional layout.
    const subject = `Low stock at ${store.name}: ${products.length} item${products.length === 1 ? "" : "s"} to reorder`;
    const rowsHtml = products.map((p) => {
      const deficit = p.low_stock_threshold - p.stock_quantity;
      const sku = p.sku ? ` <span style="color:#666">· SKU ${escapeHtml(p.sku)}</span>` : "";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">
          <strong>${escapeHtml(p.name)}</strong>${sku}
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:${p.stock_quantity === 0 ? "#b00020" : "#a06000"}">
          ${p.stock_quantity} / ${p.low_stock_threshold}
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#666">
          ${deficit > 0 ? `-${deficit}` : "at threshold"}
        </td>
      </tr>`;
    }).join("");
    const body_html = `
      <p>Here are the retail products at <strong>${escapeHtml(store.name)}</strong> that are running low:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead><tr style="background:#f7f7f7">
          <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #ddd">Product</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #ddd">Stock / Threshold</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #ddd">Deficit</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin-top:16px;color:#666">
        We'll check again tomorrow — alerts pause for 6 days per item to avoid noise.
        Restock or raise the threshold in the Retail tab to clear an item from this list.
      </p>
    `;

    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "salon-campaign-passthrough",
          recipientEmail: ownerEmail,
          // Per-store, per-day idempotency so a cron re-run within 24h
          // doesn't double-send.
          idempotencyKey: `salon-low-stock:${store.id}:${new Date().toISOString().slice(0, 10)}`,
          templateData: {
            subject,
            body_html,
            salon_name: store.name,
          },
        },
      });
      emailsSent++;
    } catch (e) {
      console.error("[salon-low-stock-digest] email send failed", { store: store.id, err: e });
      continue;
    }

    // Stamp `last_low_stock_alert_at` on the products we just alerted.
    // Best-effort — if this fails, tomorrow's run will re-alert (annoying
    // but not broken).
    const productIds = products.map((p) => p.id);
    const { error: stampErr } = await supabase
      .from("salon_retail_products")
      .update({ last_low_stock_alert_at: new Date().toISOString() } as never)
      .in("id", productIds);
    if (stampErr) {
      console.error("[salon-low-stock-digest] stamp failed", { store: store.id, err: stampErr });
    } else {
      productsAlerted += productIds.length;
    }
  }

  return j(200, {
    stores_processed: storesProcessed,
    emails_sent: emailsSent,
    products_alerted: productsAlerted,
  }, corsHeaders);
}, { strictCors: true, allowedMethods: ["GET", "POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
