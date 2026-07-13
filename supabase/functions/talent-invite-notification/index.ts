/**
 * talent-invite-notification
 * --------------------------
 * Server-gated notification creation for employer-to-talent job invites.
 * This prevents arbitrary browser inserts into the job_invite notification
 * template while keeping the invite workflow lightweight.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  target_user_id?: unknown;
};

serve(withSecurity("talent-invite-notification", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const targetUserId = cleanUuid(body.target_user_id);
  if (!targetUserId || targetUserId === user.id) return json({ error: "Invalid invite target" }, 400);

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("user_id, open_to_work")
    .eq("user_id", targetUserId)
    .eq("open_to_work", true)
    .maybeSingle();

  if (targetError) {
    console.error("[talent-invite-notification:target]", targetError.message);
    return json({ error: "Could not validate invite target" }, 500);
  }
  if (!target?.user_id) return json({ error: "Talent profile is not accepting invites" }, 404);

  const { error } = await admin
    .from("notifications")
    .insert({
      user_id: targetUserId,
      actor_id: user.id,
      title: "You've been invited to apply",
      body: "An employer thinks you're a great fit. Check open jobs on Zivo Careers.",
      category: "operational",
      channel: "in_app",
      template: "job_invite",
      action_url: "/personal/find-employee",
      status: "sent",
    });

  if (error) {
    console.error("[talent-invite-notification:insert]", error.message);
    return json({ error: "Could not send invite" }, 500);
  }

  return json({ ok: true, target_user_id: targetUserId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}
