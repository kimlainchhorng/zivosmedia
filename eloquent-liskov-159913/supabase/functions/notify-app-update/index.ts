/**
 * notify-app-update — Send push notifications to all iOS users
 * about a new app version available in the App Store.
 *
 * Called by admin when a new iOS version is published.
 * Body: { version: string, release_notes?: string }
 */

import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STORE_URL = "https://apps.apple.com/us/app/zivo-customer/id6759480121";
const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(jwt);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { version, release_notes } = body;

    if (!version) {
      return new Response(JSON.stringify({ error: "version is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the release
    const { data: release } = await supabase
      .from("app_version_releases")
      .insert({
        platform: "ios",
        version,
        store_url: STORE_URL,
        release_notes: release_notes || null,
        notify_users: true,
      })
      .select()
      .single();

    // Fetch all active iOS device tokens
    const { data: iosTokens, error: tokenError } = await supabase
      .from("device_tokens")
      .select("id, user_id, token, platform, app_version")
      .eq("platform", "ios")
      .eq("is_active", true);

    if (tokenError) {
      console.error("Error fetching tokens:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out users already on this version
    const tokensToNotify = (iosTokens || []).filter(
      (t: any) => t.app_version !== version
    );

    let sentCount = 0;
    const fcmKey = Deno.env.get("FCM_SERVER_KEY");

    // Send notifications in batches
    for (let i = 0; i < tokensToNotify.length; i += BATCH_SIZE) {
      const batch = tokensToNotify.slice(i, i + BATCH_SIZE);

      for (const token of batch) {
        try {
          // Use the existing send-push-notification function internally
          await supabase.functions.invoke("send-push-notification", {
            body: {
              device_token_id: token.id,
              notification_type: "app_update",
              title: `🚀 ZIVO ${version} is here!`,
              body: release_notes || "A new version of ZIVO is available. Update now for the best experience!",
              data: {
                type: "app_update",
                version,
                store_url: STORE_URL,
                deep_link: STORE_URL,
              },
            },
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to token ${token.id}:`, err);
        }
      }
    }

    // Mark notifications as sent
    if (release?.id) {
      await supabase
        .from("app_version_releases")
        .update({ notifications_sent_at: new Date().toISOString() })
        .eq("id", release.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        version,
        total_ios_tokens: iosTokens?.length || 0,
        eligible_tokens: tokensToNotify.length,
        notifications_sent: sentCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-app-update error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
