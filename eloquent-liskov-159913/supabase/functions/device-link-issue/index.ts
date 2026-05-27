// Issue a short-lived device-link token (the QR payload) for the caller.
// Caller must be authenticated. Returns { token, expiresAt }.
import { createClient } from "../_shared/deps.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const issuerLabel = (body?.deviceLabel as string | undefined)?.slice(0, 80) ?? null;

    // Cleanup any prior unclaimed tokens older than 10 min for hygiene.
    await supabase.rpc("cleanup_expired_device_link_tokens");

    // Generate 32 random bytes -> base64url
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from("device_link_tokens")
      .insert({
        token,
        issuer_user_id: userData.user.id,
        issuer_device_label: issuerLabel,
        expires_at: expiresAt,
      });

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ token, expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("device-link-issue error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
