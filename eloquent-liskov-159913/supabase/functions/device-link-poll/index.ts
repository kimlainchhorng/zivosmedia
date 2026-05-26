// Poll endpoint: the issuer device asks "has my QR been scanned yet?"
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

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error } = await userClient
      .from("device_link_tokens")
      .select("claimed_at, claimed_by_device_label, expires_at")
      .eq("token", token)
      .eq("issuer_user_id", userData.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return new Response(JSON.stringify({ status: "missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.claimed_at) {
      return new Response(
        JSON.stringify({
          status: "claimed",
          deviceLabel: row.claimed_by_device_label,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("device-link-poll error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
