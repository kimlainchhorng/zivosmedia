/**
 * Send Push Notification Edge Function
 * Handles push notifications for iOS, Android, and Web (VAPID)
 */

import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

interface PushRequest {
  user_id?: string;
  user_ids?: string[];  // batch: send to multiple users in one call
  device_token_id?: string;
  notification_type: string;
  category?: "transactional" | "marketing" | "social" | "chat";
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  order_id?: string;
  image_url?: string;
}

type NotificationCategory = NonNullable<PushRequest["category"]>;

const marketingTypes = new Set([
  "admin_broadcast",
  "app_update",
  "boost_activated",
  "marketing",
  "promo",
  "promotion",
]);

function inferCategory(payload: PushRequest): NotificationCategory {
  if (payload.category) return payload.category;
  const dataCategory = payload.data?.category;
  if (
    dataCategory === "transactional" ||
    dataCategory === "marketing" ||
    dataCategory === "social" ||
    dataCategory === "chat"
  ) {
    return dataCategory;
  }

  const type = payload.notification_type.toLowerCase();
  if (marketingTypes.has(type) || type.includes("campaign") || type.includes("promo")) {
    return "marketing";
  }
  if (type.startsWith("chat_") || type === "incoming_call") return "chat";
  if (
    type.startsWith("social_") ||
    type.includes("follow") ||
    type.includes("friend") ||
    type.includes("post_")
  ) {
    return "social";
  }
  return "transactional";
}

function preferenceAllowsPush(prefs: any, category: NotificationCategory): {
  allowed: boolean;
  reason?: string;
} {
  if (prefs?.push_enabled === false) {
    return { allowed: false, reason: "push_disabled" };
  }
  if (category === "marketing" && prefs?.marketing_enabled !== true) {
    return { allowed: false, reason: "marketing_disabled" };
  }
  if (category === "transactional" && prefs?.operational_enabled === false) {
    return { allowed: false, reason: "operational_disabled" };
  }
  if ((category === "social" || category === "chat") && prefs?.automated_messages_enabled === false) {
    return { allowed: false, reason: "automated_messages_disabled" };
  }
  return { allowed: true };
}

serve(withSecurity("send-push-notification", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Accept either an authenticated user JWT or the service-role key (for
  // internal callers like cron jobs / other edge functions).
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseUrlEarly = Deno.env.get("SUPABASE_URL");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isServiceCall = !!serviceKey && authHeader === `Bearer ${serviceKey}`;
  if (!isServiceCall) {
    if (!supabaseUrlEarly || !anonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const userClient = createClient(supabaseUrlEarly, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: PushRequest | null = null;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Request body must be a JSON object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, user_ids, device_token_id, notification_type, title, body, data, image_url } = payload;

    if (!title || !notification_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, notification_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const category = inferCategory(payload);

    // Get device tokens from device_tokens table
    let tokens: any[] = [];

    if (device_token_id) {
      const { data: token } = await supabase
        .from("device_tokens")
        .select("*")
        .eq("id", device_token_id)
        .eq("is_active", true)
        .single();
      if (token) tokens = [token];
    } else if (user_ids && user_ids.length > 0) {
      // Batch: fetch tokens for all users in one query
      const { data: batchTokens } = await supabase
        .from("device_tokens")
        .select("*")
        .in("user_id", user_ids)
        .eq("is_active", true);
      tokens = batchTokens || [];
    } else if (user_id) {
      const { data: userTokens } = await supabase
        .from("device_tokens")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", true);
      tokens = userTokens || [];
    }

    // Also get web push subscriptions (VAPID)
    let webSubscriptions: any[] = [];
    const targetUserIds = user_ids && user_ids.length > 0 ? user_ids : user_id ? [user_id] : [];
    if (targetUserIds.length > 0) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", targetUserIds)
        .eq("is_active", true)
        .eq("platform", "web");
      webSubscriptions = subs || [];
    }

    const recipientUserIds = Array.from(
      new Set(
        [
          ...tokens.map(token => token.user_id),
          ...webSubscriptions.map(sub => sub.user_id),
        ].filter(Boolean)
      )
    );

    if (recipientUserIds.length > 0) {
      const { data: prefsRows } = await supabase
        .from("notification_preferences")
        .select("user_id,push_enabled,marketing_enabled,operational_enabled,automated_messages_enabled")
        .in("user_id", recipientUserIds);

      const prefsByUser = new Map<string, any>(
        (prefsRows || []).map((prefs: any) => [prefs.user_id, prefs])
      );
      const blockedRecipients: Record<string, string> = {};

      for (const uid of recipientUserIds) {
        const decision = preferenceAllowsPush(prefsByUser.get(uid), category);
        if (!decision.allowed) blockedRecipients[uid] = decision.reason || "preference_disabled";
      }

      tokens = tokens.filter(token => !blockedRecipients[token.user_id]);
      webSubscriptions = webSubscriptions.filter(sub => !blockedRecipients[sub.user_id]);

      if (Object.keys(blockedRecipients).length > 0 && tokens.length === 0 && webSubscriptions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            skipped: true,
            reason: "recipient_preferences_disabled",
            blocked_recipients: blockedRecipients,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (tokens.length === 0 && webSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No active device tokens found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    // Send to device tokens (mobile apps)
    for (const token of tokens) {
      const log = await createNotificationLog(supabase, {
        user_id: token.user_id,
        device_token_id: token.id,
        notification_type,
        title,
        body,
        data,
      });

      try {
        let sendResult: { success: boolean; error?: string } = { success: false };

        // Always include notification_type in data so clients can route correctly
        const enrichedData = { notification_type, ...(data || {}) };

        if (token.platform === "web") {
          // Legacy web tokens - use web push
          sendResult = await sendWebPush(token.token, { title, body, data: enrichedData });
        } else if (token.platform === "ios") {
          sendResult = await sendAPNS(token.token, { title, body, data: enrichedData, image_url });
        } else if (token.platform === "android") {
          sendResult = await sendFCM(token.token, { title, body, data: enrichedData, image_url });
        }

        await updateNotificationLog(supabase, log?.id, sendResult);
        results.push({ token_id: token.id, platform: token.platform, ...sendResult });
      } catch (sendError) {
        console.error("Push send error:", sendError);
        await updateNotificationLog(supabase, log?.id, { 
          success: false, 
          error: sendError instanceof Error ? sendError.message : "Unknown error" 
        });
        results.push({
          token_id: token.id,
          platform: token.platform,
          success: false,
          error: sendError instanceof Error ? sendError.message : "Unknown error",
        });
      }
    }

    // Send to web push subscriptions (VAPID)
    for (const sub of webSubscriptions) {
      const log = await createNotificationLog(supabase, {
        user_id: sub.user_id,
        notification_type,
        title,
        body,
        data,
      });

      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const sendResult = await sendVAPIDWebPush(subscription, { title, body, data });
        
        // If subscription is expired, mark as inactive
        if (!sendResult.success && sendResult.expired) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        }

        await updateNotificationLog(supabase, log?.id, sendResult);
        results.push({ subscription_id: sub.id, platform: "web", ...sendResult });
      } catch (sendError) {
        console.error("Web push error:", sendError);
        await updateNotificationLog(supabase, log?.id, { 
          success: false, 
          error: sendError instanceof Error ? sendError.message : "Unknown error" 
        });
        results.push({
          subscription_id: sub.id,
          platform: "web",
          success: false,
          error: sendError instanceof Error ? sendError.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        sent: successCount,
        failed: results.length - successCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

// Helper: Create notification log
async function createNotificationLog(
  supabase: any,
  data: {
    user_id: string;
    device_token_id?: string;
    notification_type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }
) {
  const { data: log, error } = await supabase
    .from("push_notification_logs")
    .insert({
      user_id: data.user_id,
      device_token_id: data.device_token_id,
      notification_type: data.notification_type,
      title: data.title,
      body: data.body,
      data: data.data || {},
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create log:", error);
    return null;
  }
  return log;
}

// Helper: Update notification log
async function updateNotificationLog(
  supabase: any,
  logId: string | undefined,
  result: { success: boolean; error?: string }
) {
  if (!logId) return;
  
  await supabase
    .from("push_notification_logs")
    .update({
      status: result.success ? "sent" : "failed",
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error,
    })
    .eq("id", logId);
}

// VAPID Web Push implementation
async function sendVAPIDWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body?: string; data?: Record<string, unknown> }
): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.log("[WebPush] VAPID keys not configured, skipping");
    return { success: true }; // Don't fail if not configured yet
  }

  try {
    // Import web-push dynamically
    const webpush = await import("npm:web-push@3.6.7");
    
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body || "",
      icon: "/pwa-icons/icon-192x192.png",
      badge: "/pwa-icons/icon-192x192.png",
      data: payload.data || {},
      tag: payload.data?.type || "default",
    });

    await webpush.sendNotification(subscription, pushPayload);
    
    console.log(`[WebPush] Sent to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    return { success: true };
  } catch (error: any) {
    console.error("[WebPush] Send error:", error);
    
    // Check if subscription is expired (410 Gone)
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      return { success: false, error: "Subscription expired", expired: true };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Web push failed" 
    };
  }
}

// Legacy web push (placeholder)
async function sendWebPush(
  token: string,
  payload: { title: string; body?: string; data?: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  console.error("[WebPush Legacy] Not implemented — push NOT sent to:", token.substring(0, 30), payload.title);
  return { success: false, error: "Legacy web push not implemented" };
}

// APNs implementation via FCM (Firebase handles APNs routing for Capacitor apps)
async function sendAPNS(
  token: string,
  payload: { title: string; body?: string; data?: Record<string, unknown>; image_url?: string }
): Promise<{ success: boolean; error?: string }> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID") || "com.hizovo.app";
  const privateKeyRaw = Deno.env.get("APNS_PRIVATE_KEY");
  const apnsEnvironment = (Deno.env.get("APNS_ENV") || "development").toLowerCase();
  const apnsHost = apnsEnvironment === "production"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";

  if (!keyId || !teamId || !privateKeyRaw) {
    console.error("[APNS] Missing APNS credentials");
    return { success: false, error: "Missing APNS credentials" };
  }

  try {
    const privateKeyPem = privateKeyRaw.includes("-----BEGIN")
      ? privateKeyRaw
      : privateKeyRaw.replace(/\\n/g, "\n");

    const tokenJwt = await createAPNsJWT({ keyId, teamId, privateKeyPem });

    const apnsPayload: Record<string, unknown> = {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body || "",
        },
        sound: "default",
        badge: 1,
        "mutable-content": 1,
      },
      ...(payload.data || {}),
    };

    // Include image URL for Notification Service Extension to download
    if (payload.image_url) {
      apnsPayload.image_url = payload.image_url;
    }

    const response = await fetch(`${apnsHost}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${tokenJwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(apnsPayload),
    });

    if (response.status === 200) {
      console.log(`[APNS] Sent to token: ${token.substring(0, 16)}...`);
      return { success: true };
    }

    const errorText = await response.text();
    console.error("[APNS] Send failed:", response.status, errorText);
    return { success: false, error: `APNS ${response.status}: ${errorText}` };
  } catch (error) {
    console.error("[APNS] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "APNS send failed",
    };
  }
}

async function createAPNsJWT(params: {
  keyId: string;
  teamId: string;
  privateKeyPem: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: params.keyId, typ: "JWT" };
  const claims = { iss: params.teamId, iat: now };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const key = await importP8PrivateKey(params.privateKeyPem);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );

  const signature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  return `${signingInput}.${signature}`;
}

async function importP8PrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const der = base64ToBytes(clean);
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── FCM HTTP v1 (Android) ───────────────────────────────────────────────────
// Google decommissioned the legacy `/fcm/send` + "Authorization: key=<server
// key>" API. We now mint a short-lived OAuth2 access token from a Firebase
// service account and POST to the v1 endpoint.
//
// Setup: set the `FCM_SERVICE_ACCOUNT_JSON` Supabase secret to the FULL service
// account JSON (Firebase console → Project settings → Service accounts →
// Generate new private key). No secret is hard-coded here.
interface FcmServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

// Module-level token cache — reused across calls within a warm isolate so a
// batch send mints the OAuth2 token once, not once per device.
let cachedFcmToken: { token: string; expiresAt: number } | null = null;

function parseFcmServiceAccount(): FcmServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa?.client_email || !sa?.private_key || !sa?.project_id) return null;
    return sa as FcmServiceAccount;
  } catch {
    return null;
  }
}

async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const der = base64ToBytes(clean);
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getFcmAccessToken(sa: FcmServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedFcmToken && cachedFcmToken.expiresAt - 60 > now) {
    return cachedFcmToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const key = await importRsaPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth2 token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  cachedFcmToken = {
    token: json.access_token,
    expiresAt: now + (Number(json.expires_in) || 3600),
  };
  return cachedFcmToken.token;
}

async function sendFCM(
  token: string,
  payload: { title: string; body?: string; data?: Record<string, unknown>; image_url?: string }
): Promise<{ success: boolean; error?: string }> {
  const sa = parseFcmServiceAccount();
  if (!sa) {
    // Surface missing credentials as a real failure so push_notification_logs
    // and alerting reflect reality (never report success when nothing was sent).
    console.error("[FCM] Missing/invalid FCM_SERVICE_ACCOUNT_JSON — native push NOT sent");
    return { success: false, error: "Missing FCM service account" };
  }

  // FCM v1 `data` values must all be strings.
  const stringData: Record<string, string> = {};
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) stringData[k] = String(v ?? "");
  }
  if (payload.image_url) stringData.image_url = payload.image_url;

  // Route to an Android notification channel when the caller hints one
  // (createChannel on the client must register a matching channel id).
  const channelId =
    (payload.data?.android_channel_id as string) ||
    (payload.data?.channel_id as string) ||
    (payload.data?.category as string) ||
    "default";

  const message: Record<string, unknown> = {
    token,
    notification: {
      title: payload.title,
      body: payload.body || "",
      ...(payload.image_url ? { image: payload.image_url } : {}),
    },
    data: stringData,
    android: {
      priority: "HIGH",
      notification: {
        sound: "default",
        channel_id: channelId,
        ...(payload.image_url ? { image: payload.image_url } : {}),
      },
    },
  };

  try {
    const accessToken = await getFcmAccessToken(sa);
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    if (response.ok) {
      console.log(`[FCM] Sent to token: ${token.substring(0, 20)}...`);
      return { success: true };
    }

    const errorText = await response.text();
    console.error("[FCM] Send failed:", response.status, errorText);
    // Detect stale tokens so the caller can deactivate them (v1 returns
    // 404 / UNREGISTERED / NOT_FOUND for unregistered or invalid tokens).
    let fcmCode = "";
    try {
      const parsed = JSON.parse(errorText);
      fcmCode = parsed?.error?.details?.[0]?.errorCode || parsed?.error?.status || "";
    } catch { /* non-JSON error body */ }
    if (response.status === 404 || fcmCode === "UNREGISTERED" || fcmCode === "NOT_FOUND") {
      return { success: false, error: "UNREGISTERED" };
    }
    return { success: false, error: `FCM ${response.status}: ${errorText}` };
  } catch (error) {
    console.error("[FCM] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "FCM send failed",
    };
  }
}
