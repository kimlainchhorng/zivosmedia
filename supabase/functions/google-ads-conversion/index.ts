import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Server-side conversion upload to Google Ads.
async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN")!,
    grant_type: "refresh_token",
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const json = await resp.json();
  return json.access_token;
}

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

Deno.serve(withSecurity("google-ads-conversion", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!isServiceRoleRequest(req, serviceKey)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!;
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      conversion_action_id,        // numeric conversion action ID from Google Ads UI
      gclid,                        // required if uploading click conversions
      event_name,
      value_cents = 0,
      currency = "USD",
      order_id,
    } = await req.json();

    if (!conversion_action_id) {
      return new Response(JSON.stringify({ error: "conversion_action_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken();
    const url = `https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`;
    const conversionDateTime = new Date().toISOString().replace("T", " ").replace("Z", "+00:00").split(".")[0] + "+00:00";

    const body = {
      conversions: [{
        conversionAction: `customers/${customerId}/conversionActions/${conversion_action_id}`,
        conversionDateTime,
        conversionValue: value_cents / 100,
        currencyCode: currency,
        ...(gclid ? { gclid } : {}),
        ...(order_id ? { orderId: order_id } : {}),
      }],
      partialFailure: true,
      validateOnly: false,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const respJson = await resp.json();

    await admin.from("conversion_events").insert({
      event_name: event_name ?? "Conversion",
      source: "google_ads",
      value_cents,
      currency,
      external_id: order_id,
      payload: body,
      response: respJson,
      status: resp.ok ? "sent" : "failed",
    } as any);

    return new Response(JSON.stringify({ ok: resp.ok, response: respJson }), {
      status: resp.ok ? 200 : 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[google-ads-conversion]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
