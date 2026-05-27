import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Creates a Google Ads Search campaign via the REST API.
// Admin-only. Stores result in ad_campaigns table.
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
  if (!json.access_token) throw new Error(`OAuth failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!;
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const {
      name = "ZIVO MVP Launch — Search",
      daily_budget_cents = 2000,
      keywords = ["ride app", "food delivery", "rides cambodia", "tuk tuk app"],
      final_url = "https://hizivo.com",
    } = await req.json().catch(() => ({}));

    const accessToken = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };
    const apiBase = `https://googleads.googleapis.com/v18/customers/${customerId}`;

    // 1) Create budget
    const budgetResp = await fetch(`${apiBase}/campaignBudgets:mutate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        operations: [{
          create: {
            name: `${name} — budget ${Date.now()}`,
            amountMicros: String(daily_budget_cents * 10000), // cents → micros (×10,000)
            deliveryMethod: "STANDARD",
          },
        }],
      }),
    });
    const budgetJson = await budgetResp.json();
    if (!budgetResp.ok) throw new Error(`Budget create failed: ${JSON.stringify(budgetJson)}`);
    const budgetResource = budgetJson.results?.[0]?.resourceName;

    // 2) Create campaign (paused; admin can enable in Google Ads UI)
    const campaignResp = await fetch(`${apiBase}/campaigns:mutate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        operations: [{
          create: {
            name,
            advertisingChannelType: "SEARCH",
            status: "PAUSED",
            manualCpc: { enhancedCpcEnabled: true },
            campaignBudget: budgetResource,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
          },
        }],
      }),
    });
    const campaignJson = await campaignResp.json();
    if (!campaignResp.ok) throw new Error(`Campaign create failed: ${JSON.stringify(campaignJson)}`);
    const campaignResource = campaignJson.results?.[0]?.resourceName;
    const externalId = campaignResource?.split("/").pop();

    // Persist
    const { data: row } = await admin.from("ad_campaigns").insert({
      platform: "google",
      external_id: externalId,
      name,
      status: "paused",
      daily_budget_cents,
      created_by: user.id,
      metadata: { keywords, final_url, budget_resource: budgetResource, campaign_resource: campaignResource },
    } as any).select().single();

    return new Response(JSON.stringify({ ok: true, campaign: row, google_resource: campaignResource }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[google-ads-create-campaign]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
