// Google Ads OAuth start. Returns Google authorize URL with adwords scope.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SCOPES = ["https://www.googleapis.com/auth/adwords", "openid", "email"].join(" ");

const CONNECT_CALLBACK_PATH = "/connect/callback";
const GOOGLE_ADS_REDIRECT_URI_FALLBACK = "https://zivosmedia.com/auth/google-ads/callback";

function isLocalDevOrigin(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function configuredOrigins() {
  return new Set([
    Deno.env.get("APP_URL") || "",
    Deno.env.get("SITE_URL") || "",
    Deno.env.get("PUBLIC_SITE_URL") || "",
    "https://zivosmedia.com",
    "https://www.zivosmedia.com",
  ].filter(Boolean).map((origin) => new URL(origin).origin));
}

function normalizeReturnUrl(value: unknown) {
  if (typeof value !== "string" || !value) return CONNECT_CALLBACK_PATH;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (configuredOrigins().has(url.origin) || isLocalDevOrigin(url)) return url.toString();
  } catch (_) {
    // Fall through to the safe default.
  }
  return CONNECT_CALLBACK_PATH;
}

function getGoogleAdsRedirectUri() {
  return Deno.env.get("GOOGLE_ADS_REDIRECT_URI") || GOOGLE_ADS_REDIRECT_URI_FALLBACK;
}

Deno.serve(withSecurity("google-ads-oauth-start", async (req, ctx) => {
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
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const storeId = String(body?.store_id || "");
    const returnUrl = normalizeReturnUrl(body?.return_url);
    if (!storeId) {
      return new Response(JSON.stringify({ error: "store_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
    if (!clientId) throw new Error("GOOGLE_ADS_CLIENT_ID not configured");

    const state = crypto.randomUUID();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: isOwner } = await admin.rpc("is_store_owner", {
      _store_id: storeId,
      _user_id: userRes.user.id,
    });
    if (isOwner !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error: insertErr } = await admin.from("oauth_states").insert({
      state,
      user_id: userRes.user.id,
      store_id: storeId,
      platform: "google",
      return_url: returnUrl,
    });
    if (insertErr) throw insertErr;

    const redirectUri = getGoogleAdsRedirectUri();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    return new Response(JSON.stringify({ authorize_url: url.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { allowedMethods: ["POST"], rateLimit: "admin_action", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
