/**
 * moderation-appeal-submit
 * ------------------------
 * Creates moderation appeals server-side after verifying that the appealed
 * moderation action belongs to the authenticated user.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_APPEAL = 1_000;

type Body = {
  action_id?: unknown;
  appeal_text?: unknown;
  evidence_urls?: unknown;
};

serve(withSecurity("moderation-appeal-submit", async (req, ctx) => {
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
  const actionId = cleanUuid(body.action_id);
  const appealText = cleanText(body.appeal_text, MAX_APPEAL);
  if (!actionId || !appealText || appealText.length < 12) {
    return json({ error: "Invalid appeal" }, 400);
  }

  const { data: action, error: actionError } = await admin
    .from("moderation_actions")
    .select("id,target_user_id")
    .eq("id", actionId)
    .eq("target_user_id", user.id)
    .maybeSingle();

  if (actionError) {
    console.error("[moderation-appeal-submit] action lookup", actionError.message);
    return json({ error: "Appeal validation failed" }, 500);
  }
  if (!action) return json({ error: "Moderation action not found" }, 404);

  const { data: existing, error: existingError } = await admin
    .from("appeal_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("action_id", actionId)
    .maybeSingle();

  if (existingError) {
    console.error("[moderation-appeal-submit] existing lookup", existingError.message);
    return json({ error: "Appeal validation failed" }, 500);
  }
  if (existing) return json({ ok: true, id: existing.id, alreadySubmitted: true });

  const { data, error } = await admin
    .from("appeal_requests")
    .insert({
      user_id: user.id,
      action_id: actionId,
      appeal_text: appealText,
      evidence_urls: cleanEvidenceUrls(body.evidence_urls),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[moderation-appeal-submit]", error.message);
    return json({ error: "Appeal submission failed" }, 500);
  }

  return json({ ok: true, id: data?.id ?? null, alreadySubmitted: false });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 80);
  if (!text) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function cleanEvidenceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\/[^\s]+$/i.test(item))
    .slice(0, 8);
}
