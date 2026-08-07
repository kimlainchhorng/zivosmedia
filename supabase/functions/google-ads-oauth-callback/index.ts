// Google Ads OAuth callback. Exchanges code, stores tokens in store_ad_platform_connections.
import { createClient } from "../_shared/deps.ts";
import { encryptToken } from "../_shared/tokenCrypto.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PREVIEW_FALLBACK = "https://id-preview--72f99340-9c9f-453a-acff-60e5a9b25774.lovable.app";
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

function htmlRedirect(url: string, _message = "Connecting...") {
  return new Response(null, {
    status: 303,
    headers: {
      "Location": url,
      "Content-Type": "text/plain",
    },
  });
}

function getGoogleAdsRedirectUri() {
  return Deno.env.get("GOOGLE_ADS_REDIRECT_URI") || GOOGLE_ADS_REDIRECT_URI_FALLBACK;
}

function allowedReturnUrl(value: unknown) {
  const allowedOrigins = new Set([
    PREVIEW_FALLBACK,
    Deno.env.get("APP_URL") || "",
    Deno.env.get("SITE_URL") || "",
    Deno.env.get("PUBLIC_SITE_URL") || "",
    "https://zivosmedia.com",
    "https://www.zivosmedia.com",
  ].filter(Boolean).map((origin) => new URL(origin).origin));
  if (typeof value !== "string" || !value) return `${PREVIEW_FALLBACK}/connect/callback`;
  if (value.startsWith("/") && !value.startsWith("//")) return `${PREVIEW_FALLBACK}${value}`;
  try {
    const url = new URL(value);
    return allowedOrigins.has(url.origin) || isLocalDevOrigin(url) ? url.toString() : `${PREVIEW_FALLBACK}/connect/callback`;
  } catch {
    return `${PREVIEW_FALLBACK}/connect/callback`;
  }
}

Deno.serve(withSecurity("google-ads-oauth-callback", async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  if (!state) return htmlRedirect(`${PREVIEW_FALLBACK}/connect/callback?error=missing_state`);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: stateRow } = await admin.from("oauth_states").select("*").eq("state", state).maybeSingle();
  if (!stateRow) return htmlRedirect(`${PREVIEW_FALLBACK}/connect/callback?error=invalid_state`);
  admin.from("oauth_states").delete().eq("state", state).then(() => {});

  const returnBase = allowedReturnUrl(stateRow.return_url);
  const back = (q: string) => htmlRedirect(`${returnBase}${returnBase.includes("?") ? "&" : "?"}${q}`);

  if (errParam) return back(`error=${encodeURIComponent(errParam)}`);
  if (!code) return back("error=missing_code");

  try {
    const clientId = Deno.env.get("GOOGLE_ADS_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_ADS_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("Google Ads credentials not configured");

    const redirectUri = getGoogleAdsRedirectUri();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokens.error_description || "Token exchange failed");

    // Fetch userinfo for display name
    let accountName = "Google Ads";
    try {
      const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const uiJson = await ui.json();
      accountName = uiJson?.email || accountName;
    } catch (_) { /* ignore */ }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null;

    const encAccessToken = await encryptToken(tokens.access_token);
    const encRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

    const { error: upErr } = await admin.from("store_ad_platform_connections").upsert(
      {
        store_id: stateRow.store_id,
        platform: "google",
        account_name: accountName,
        access_token: encAccessToken,
        refresh_token: encRefreshToken,
        token_expires_at: expiresAt,
        scopes: tokens.scope ?? null,
        status: "connected",
        // store_ad_platform_connections has no connected_by / connected_at
        // columns (the legacy store_ad_accounts mirror below does). Sending
        // them made PostgREST reject the upsert, so a completed Google Ads
        // OAuth never recorded the connection.
        last_synced_at: new Date().toISOString(),
        metadata: { connected_by: stateRow.user_id },
      },
      { onConflict: "store_id,platform" }
    );
    if (upErr) throw upErr;

    // Mirror into legacy store_ad_accounts so existing UI pills show "connected"
    await admin.from("store_ad_accounts").upsert(
      {
        store_id: stateRow.store_id,
        platform: "google",
        status: "connected",
        access_token: encAccessToken,
        token_expires_at: expiresAt,
        scopes: tokens.scope ?? null,
        display_name: accountName,
        connected_at: new Date().toISOString(),
        connected_by: stateRow.user_id,
      },
      { onConflict: "store_id,platform" }
    );

    return back(`platform=google&status=ok&store_id=${stateRow.store_id}`);
  } catch (e) {
    return back(`error=${encodeURIComponent((e as Error).message)}`);
  }
}, { allowedMethods: ["GET"], rateLimit: "admin_action", strictCors: true, skipWaf: true, trackNetwork: "suspicious" }));
