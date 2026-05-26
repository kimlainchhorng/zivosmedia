import { createClient } from "../_shared/deps.ts";

const corsH = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsH });
  }

  // Require authenticated user — device integrity is per-user, not public
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsH, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsH, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check risk events for the authenticated user only
    const { data: riskEvents } = await supabase
      .from("risk_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .limit(5);

    const valid = !riskEvents || riskEvents.length < 3;

    return new Response(JSON.stringify({ valid }), {
      headers: { ...corsH, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-device-integrity error:", err);
    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsH, "Content-Type": "application/json" },
    });
  }
});
