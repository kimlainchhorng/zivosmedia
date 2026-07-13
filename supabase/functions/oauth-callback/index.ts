// Universal OAuth callback handler. Exchanges code for token, persists account, redirects to picker page.
import { createClient } from "../_shared/deps.ts";
import { encryptToken } from "../_shared/tokenCrypto.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PREVIEW_FALLBACK = "https://id-preview--72f99340-9c9f-453a-acff-60e5a9b25774.lovable.app";

function isLocalDevOrigin(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

function htmlRedirect(url: string, message = "Connecting...") {
  return new Response(null, {
    status: 303,
    headers: {
      "Location": url,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function addQueryParams(base: string, params: Record<string, string | null | undefined>) {
  const fallbackBase = `${PREVIEW_FALLBACK}/connect/callback`;
  try {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    return `${fallbackBase}?${search.toString()}`;
  }
}

function getMetaAppId() {
  const raw = Deno.env.get("META_APP_ID")?.trim() ?? "";
  if (!raw) throw new Error("META_APP_ID not configured");

  const digitsOnly = raw.replace(/[^0-9]/g, "");
  const normalized = digitsOnly || raw;

  if (digitsOnly && digitsOnly.length >= 6) return digitsOnly;
  return normalized;
}

function getMetaAppSecret() {
  const secret = Deno.env.get("META_APP_SECRET")?.trim() ?? "";
  if (!secret) throw new Error("META_APP_SECRET not configured");
  return secret;
}

function getMetaRedirectUri() {
  const configured = Deno.env.get("META_REDIRECT_URI")?.trim();
  if (configured && !configured.includes("zivosmedia.com")) return configured;
  return "https://zivosmedia.com/auth/meta/callback";
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

Deno.serve(withSecurity("oauth-callback", async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error_message") ||
    url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorReason = url.searchParams.get("error_reason");

  if (!state) {
    return htmlRedirect(addQueryParams(`${PREVIEW_FALLBACK}/connect/callback`, {
      error: error || "missing_state",
      error_code: errorCode,
      error_reason: errorReason,
    }));
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: stateRow } = await admin
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();

  if (!stateRow) {
    return htmlRedirect(`${PREVIEW_FALLBACK}/connect/callback?error=invalid_state`);
  }
  admin.from("oauth_states").delete().eq("state", state).then(() => {});

  const returnBase = allowedReturnUrl(stateRow.return_url);

  if (error || !code) {
    return htmlRedirect(addQueryParams(returnBase, {
      error: error || "no_code",
      error_code: errorCode,
      error_reason: errorReason,
    }));
  }

  try {
    if (stateRow.platform === "meta" || stateRow.platform === "instagram") {
      const appId = getMetaAppId();
      const appSecret = getMetaAppSecret();
      console.log("oauth-callback using META_APP_ID", { appIdLength: appId.length, appIdSuffix: appId.slice(-4) });
      const redirectUri = getMetaRedirectUri();

      const tokRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
      );
      const tok = await tokRes.json();
      if (!tok.access_token) throw new Error(tok.error?.message || "token exchange failed");

      const longRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tok.access_token}`
      );
      const long = await longRes.json();
      const userToken = long.access_token || tok.access_token;
      const expiresIn = long.expires_in || tok.expires_in || 5184000;

      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${userToken}`);
      const me = await meRes.json();

      const encryptedUserToken = await encryptToken(userToken);

      const { data: account, error: upErr } = await admin
        .from("store_ad_accounts")
        .upsert(
          {
            store_id: stateRow.store_id,
            platform: stateRow.platform,
            status: "connected",
            access_token: encryptedUserToken,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            scopes: "pages_show_list,pages_read_engagement,ads_management,business_management",
            user_external_id: me.id,
            display_name: me.name,
            connected_at: new Date().toISOString(),
            connected_by: stateRow.user_id,
          },
          { onConflict: "store_id,platform" }
        )
        .select("id")
        .single();
      if (upErr) throw upErr;

      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture,instagram_business_account{id,username,profile_picture_url}&access_token=${userToken}`
      );
      const pagesJson = await pagesRes.json();
      const pages = pagesJson.data || [];

      await admin.from("store_ad_pages").delete().eq("account_id", account.id);
      const rows: any[] = [];
      for (const pg of pages) {
        rows.push({
          account_id: account.id,
          store_id: stateRow.store_id,
          platform: "meta",
          page_type: "fb_page",
          external_id: pg.id,
          name: pg.name,
          picture_url: pg.picture?.data?.url || null,
          access_token: pg.access_token ? await encryptToken(pg.access_token) : null,
        });
        if (pg.instagram_business_account) {
          rows.push({
            account_id: account.id,
            store_id: stateRow.store_id,
            platform: "instagram",
            page_type: "ig_account",
            external_id: pg.instagram_business_account.id,
            name: pg.instagram_business_account.username,
            picture_url: pg.instagram_business_account.profile_picture_url || null,
            metadata: { fb_page_id: pg.id },
          });
        }
      }

      const adActsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name,currency,account_status&access_token=${userToken}`
      );
      const adActs = (await adActsRes.json()).data || [];
      for (const a of adActs) {
        rows.push({
          account_id: account.id,
          store_id: stateRow.store_id,
          platform: "meta",
          page_type: "ad_account",
          external_id: a.id,
          name: a.name,
          metadata: { account_id: a.account_id, currency: a.currency, status: a.account_status },
        });
      }
      if (rows.length) {
        await admin.from("store_ad_pages").insert(rows);
      }

      return htmlRedirect(
        `${returnBase}?platform=${stateRow.platform}&account_id=${account.id}&store_id=${stateRow.store_id}&status=ok`,
        "Linking your Facebook account..."
      );
    }

    return htmlRedirect(addQueryParams(returnBase, {
      error: "platform_not_configured",
      platform: stateRow.platform,
    }));
  } catch (e) {
    return htmlRedirect(addQueryParams(returnBase, {
      error: (e as Error).message,
    }));
  }
}, { allowedMethods: ["GET"], rateLimit: "admin_action", strictCors: true, skipWaf: true, trackNetwork: "suspicious" }));
