// Meta (Facebook + Instagram) OAuth start.
// Generates a state token, stores it in oauth_states, returns the FB authorize URL.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const META_SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "instagram_basic",
  "ads_management",
  "business_management",
].join(",");

function getMetaAppId() {
  const raw = Deno.env.get("META_APP_ID")?.trim() ?? "";
  if (!raw) throw new Error("META_APP_ID not configured");

  const digitsOnly = raw.replace(/[^0-9]/g, "");
  const normalized = digitsOnly || raw;

  if (digitsOnly && digitsOnly.length >= 6) return digitsOnly;
  return normalized;
}

Deno.serve(withSecurity("meta-oauth-start", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = userRes.user.id;

    const body = await req.json();
    const storeId = typeof body?.store_id === "string" ? body.store_id : "";
    const platform = typeof body?.platform === "string" ? body.platform : "meta";
    const requestedReturnUrl = typeof body?.return_url === "string" && body.return_url ? body.return_url : "/connect/callback";
    const returnUrl = requestedReturnUrl.startsWith("/") && !requestedReturnUrl.startsWith("//")
      ? requestedReturnUrl
      : "/connect/callback";
    if (!storeId) {
      return new Response(JSON.stringify({ error: "store_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = getMetaAppId();
    console.log("meta-oauth-start using META_APP_ID", { appIdLength: appId.length, appIdSuffix: appId.slice(-4) });

    const state = crypto.randomUUID();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: isOwner } = await admin.rpc("is_store_owner", {
      _store_id: storeId,
      _user_id: userId,
    });
    if (isOwner !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: insertErr } = await admin.from("oauth_states").insert({
      state,
      user_id: userId,
      store_id: storeId,
      platform,
      return_url: returnUrl,
    });
    if (insertErr) throw insertErr;

    const redirectUri = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/oauth-callback`;
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", META_SCOPES);
    url.searchParams.set("response_type", "code");

    return new Response(JSON.stringify({ authorize_url: url.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "admin_action", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
