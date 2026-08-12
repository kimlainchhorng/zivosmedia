// Upsert the calling device into linked_devices on app boot / link.
//
// linked_devices is the live device registry: useLinkedDevices reads it, the
// 20260601111500 server gate protects it, and api-operations-readiness pins
// the chain. (This comment used to say `user_devices` — that is the LEGACY
// table nothing registers into; only account-delete-self and account-export
// still touch it for cleanup/export, and the legacy /devices page reads it.)
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("device-register", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

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

    const { fingerprint, label, platform } = await req.json();
    if (!fingerprint) {
      return new Response(JSON.stringify({ error: "fingerprint required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin.from("linked_devices").upsert(
      {
        user_id: userData.user.id,
        device_fingerprint: String(fingerprint).slice(0, 120),
        device_label: (label as string | undefined)?.slice(0, 80) ?? "This device",
        user_agent: req.headers.get("user-agent") ?? null,
        platform: (platform as string | undefined)?.slice(0, 40) ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_fingerprint" },
    );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("device-register error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
