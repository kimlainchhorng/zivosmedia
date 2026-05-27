/**
 * Register Push Token Edge Function
 * Saves native iOS (APNs) and Android (FCM) push tokens for authenticated users
 * Called by the Capacitor push notification plugin after registration
 */

import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

interface TokenRequest {
  token: string;
  platform: "ios" | "android" | "web";
  deactivate?: boolean;
}

serve(withSecurity("register-push-token", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: supabaseKey,
      },
    });

    let user = null;

    if (authResponse.ok) {
      user = await authResponse.json();
    }

    if (!authResponse.ok || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, platform, deactivate }: TokenRequest = await req.json();

    if (!token || !platform) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token, platform" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle deactivation request (logout / unregister)
    if (deactivate) {
      await supabase
        .from("device_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("token", token);

      console.log(`[register-push-token] Deactivated token for user ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, deactivated: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    const { data: existingToken, error: existingTokenError } = await supabase
      .from("device_tokens")
      .select("id")
      .eq("token", token)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingTokenError) {
      console.error("[register-push-token] Lookup error:", existingTokenError);
      return new Response(
        JSON.stringify({ error: "Failed to look up token", details: existingTokenError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data = null;
    let error = null;

    if (existingToken?.id) {
      const updateResult = await supabase
        .from("device_tokens")
        .update({
          user_id: user.id,
          token,
          platform,
          is_active: true,
          updated_at: now,
          last_used_at: now,
        })
        .eq("id", existingToken.id)
        .select("id")
        .single();

      data = updateResult.data;
      error = updateResult.error;
    } else {
      const insertResult = await supabase
        .from("device_tokens")
        .insert({
          user_id: user.id,
          token,
          platform,
          is_active: true,
          updated_at: now,
          last_used_at: now,
        })
        .select("id")
        .single();

      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error("[register-push-token] DB error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save token", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deactivate old tokens for this user on the same platform (keep only latest)
    if (data?.id) {
      await supabase
        .from("device_tokens")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("platform", platform)
        .neq("id", data.id);
    }

    console.log(`[register-push-token] Registered ${platform} token for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, token_id: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-push-token] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}, { rateLimit: "api_general", strictCors: true, trackNetwork: "suspicious" }));
