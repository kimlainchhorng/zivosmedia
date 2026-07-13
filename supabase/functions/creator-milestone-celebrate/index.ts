/**
 * creator-milestone-celebrate
 * ---------------------------
 * Server-side owner check for marking creator milestones as celebrated.
 * Milestone rows are system-awarded proof/status rows, so clients should not
 * update the table directly.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("creator-milestone-celebrate", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) return json({ error: "Invalid auth" }, 401);

    const body = await req.json().catch(() => ({}));
    const milestoneId = String(body.milestone_id || "").trim();
    if (!milestoneId) return json({ error: "milestone_id required" }, 400);

    const { data: milestone, error: readError } = await supabase
      .from("creator_milestones")
      .select("id, creator_id")
      .eq("id", milestoneId)
      .maybeSingle();
    if (readError) throw readError;
    if (!milestone || (milestone as any).creator_id !== userData.user.id) {
      return json({ error: "Milestone not found" }, 404);
    }

    const { error: updateError } = await supabase
      .from("creator_milestones")
      .update({ is_celebrated: true })
      .eq("id", milestoneId)
      .eq("creator_id", userData.user.id);
    if (updateError) throw updateError;

    return json({ ok: true, milestone_id: milestoneId, is_celebrated: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[creator-milestone-celebrate]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
