// Claim a device-link token. Caller (the SCANNING device) must already be
// signed in to the SAME account as the QR issuer. On success, the issuer
// device's poll endpoint will report the link as claimed.
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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, deviceLabel } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: fetchErr } = await admin
      .from("device_link_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!row) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.claimed_at) {
      return new Response(JSON.stringify({ error: "Code already used" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.issuer_user_id !== userData.user.id) {
      // Security: only the same account can approve a link.
      return new Response(
        JSON.stringify({ error: "This QR code belongs to a different account. Sign in to that account first." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updErr } = await admin
      .from("device_link_tokens")
      .update({
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: userData.user.id,
        claimed_by_device_label: (deviceLabel as string | undefined)?.slice(0, 80) ?? null,
      })
      .eq("token", token);

    if (updErr) throw updErr;

    // Register the scanning device in linked_devices so it shows up on the list.
    await admin.from("linked_devices").upsert(
      {
        user_id: userData.user.id,
        device_fingerprint: deviceLabel ? `scan-${deviceLabel}` : `scan-${crypto.randomUUID()}`,
        device_label: deviceLabel ?? "Linked device",
        user_agent: req.headers.get("user-agent") ?? null,
        platform: null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" },
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("device-link-claim error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
