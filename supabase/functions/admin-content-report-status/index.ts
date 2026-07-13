/**
 * admin-content-report-status
 * ---------------------------
 * Updates creator/paid-content report status server-side after admin checks.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";

const STATUSES = new Set(["pending", "reviewing", "resolved", "dismissed"]);

type Body = {
  report_id?: unknown;
  status?: unknown;
};

serve(withSecurity("admin-content-report-status", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const mfaErr = enforceAal2(authHeader, corsHeaders);
  if (mfaErr) return mfaErr;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({})) as Body;
  const reportId = cleanUuid(body.report_id);
  const status = cleanStatus(body.status);
  if (!reportId || !status) return json({ error: "Invalid report status" }, 400);

  const patch = status === "pending"
    ? { status, reviewed_at: null, reviewed_by: null }
    : { status, reviewed_at: new Date().toISOString(), reviewed_by: user.id };

  const { data, error } = await admin
    .from("content_reports")
    .update(patch)
    .eq("id", reportId)
    .select("id,status")
    .maybeSingle();

  if (error) {
    console.error("[admin-content-report-status]", error.message);
    return json({ error: "Report status update failed" }, 500);
  }
  if (!data) return json({ error: "Report not found" }, 404);

  return json({ ok: true, id: data.id, status: data.status });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

function cleanStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return STATUSES.has(text) ? text : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}
