// Meta (Facebook + Instagram) OAuth start.
// Generates a state token, stores it in oauth_states, returns the FB authorize URL.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "ads_management",
  "business_management",
].join(",");

const CONNECT_CALLBACK_PATH = "/connect/callback";

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

function getMetaAppId() {
  const raw = Deno.env.get("META_APP_ID")?.trim() ?? "";
  if (!raw) throw new Error("META_APP_ID not configured");

  const digitsOnly = raw.replace(/[^0-9]/g, "");
  const normalized = digitsOnly || raw;

  if (digitsOnly && digitsOnly.length >= 6) return digitsOnly;
  return normalized;
}

function getMetaRedirectUri() {
  const configured = Deno.env.get("META_REDIRECT_URI")?.trim();
  if (configured && !configured.includes("zivosmedia.com")) return configured;
  return "https://zivosmedia.com/auth/meta/callback";
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
    const returnUrl = normalizeReturnUrl(body?.return_url);
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

    const redirectUri = getMetaRedirectUri();
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", META_SCOPES);
    url.searchParams.set("response_type", "code");
    const configId = Deno.env.get("META_LOGIN_CONFIG_ID")?.trim();
    if (configId) {
      url.searchParams.set("config_id", configId);
    }

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
