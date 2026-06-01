import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const GOOGLE_ADS_API_VERSION = Deno.env.get("GOOGLE_ADS_API_VERSION") || "v22";

function googleAdsCustomerId(): string {
  const raw = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");
  if (!raw) throw new Error("GOOGLE_ADS_CUSTOMER_ID not configured");
  return raw.replace(/\D/g, "");
}

function googleAdsHeaders(accessToken: string, developerToken: string) {
  const loginCustomerId = Deno.env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")?.replace(/\D/g, "");
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    ...(loginCustomerId ? { "login-customer-id": loginCustomerId } : {}),
    "Content-Type": "application/json",
  };
}

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
  if (!resp.ok || !json.access_token) throw new Error(`Google OAuth failed: ${JSON.stringify(json)}`);
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
    const customerId = googleAdsCustomerId();
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      conversion_action_id,        // numeric conversion action ID from Google Ads UI
      gclid,                        // required if uploading click conversions
      gbraid,                       // iOS app conversion click identifier
      wbraid,                       // iOS web conversion click identifier
      event_name,
      value_cents = 0,
      currency = "USD",
      order_id,
      ad_user_data_consent,
    } = await req.json();

    if (!conversion_action_id) {
      return new Response(JSON.stringify({ error: "conversion_action_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!gclid && !gbraid && !wbraid) {
      return new Response(JSON.stringify({ error: "gclid, gbraid, or wbraid required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken();
    const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}:uploadClickConversions`;
    const conversionDateTime = new Date().toISOString().replace("T", " ").replace("Z", "+00:00").split(".")[0] + "+00:00";
    const consentStatus = ad_user_data_consent === "DENIED" ? "DENIED" : ad_user_data_consent === "GRANTED" ? "GRANTED" : undefined;

    const body = {
      conversions: [{
        conversionAction: `customers/${customerId}/conversionActions/${conversion_action_id}`,
        conversionDateTime,
        conversionValue: value_cents / 100,
        currencyCode: currency,
        ...(gclid ? { gclid } : {}),
        ...(gbraid ? { gbraid } : {}),
        ...(wbraid ? { wbraid } : {}),
        ...(order_id ? { orderId: order_id } : {}),
        ...(consentStatus ? { consent: { adUserData: consentStatus } } : {}),
      }],
      partialFailure: true,
      validateOnly: false,
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: googleAdsHeaders(accessToken, developerToken),
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
