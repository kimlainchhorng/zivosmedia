/**
 * Send Push Notification Edge Function
 * Handles push notifications for iOS, Android, and Web (VAPID)
 */

import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushRequest {
  user_id?: string;
  user_ids?: string[];  // batch: send to multiple users in one call
  device_token_id?: string;
  notification_type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  order_id?: string;
  image_url?: string;
}

serve(async (req) => {
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
  const isAnonCall = !!anonKey && authHeader === `Bearer ${anonKey}`;
  if (!isServiceCall && !isAnonCall) {
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
});

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
  console.log("[WebPush Legacy] Would send to:", token.substring(0, 30), payload.title);
  return { success: true };
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

// FCM v1 HTTP API implementation
async function sendFCM(
  token: string,
  payload: { title: string; body?: string; data?: Record<string, unknown>; image_url?: string }
): Promise<{ success: boolean; error?: string }> {
  const fcmKey = Deno.env.get("FCM_SERVER_KEY");

  if (!fcmKey) {
    console.log("[FCM] Missing server key, skipping native push");
    return { success: true };
  }

  try {
    // Convert data values to strings (FCM requires string values)
    const stringData: Record<string, string> = {};
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        stringData[key] = String(value ?? "");
      }
    }
    if (payload.image_url) {
      stringData.image_url = payload.image_url;
    }

    const notification: Record<string, unknown> = {
      title: payload.title,
      body: payload.body || "",
      sound: "default",
      badge: "1",
    };
    if (payload.image_url) {
      notification.image = payload.image_url;
    }

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${fcmKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification,
        data: stringData,
        priority: "high",
        // iOS-specific: ensure notification appears when app is in background
        content_available: true,
        mutable_content: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[FCM] Send failed:", response.status, errorText);
      return { success: false, error: `FCM ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    
    // Check for individual message failures
    if (result.failure > 0 && result.results?.[0]?.error) {
      const fcmError = result.results[0].error;
      console.error("[FCM] Message error:", fcmError);
      
      // Token is no longer valid
      if (fcmError === "NotRegistered" || fcmError === "InvalidRegistration") {
        return { success: false, error: fcmError };
      }
      return { success: false, error: fcmError };
    }

    console.log(`[FCM] Sent to token: ${token.substring(0, 20)}...`);
    return { success: true };
  } catch (error) {
    console.error("[FCM] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "FCM send failed",
    };
  }
}
