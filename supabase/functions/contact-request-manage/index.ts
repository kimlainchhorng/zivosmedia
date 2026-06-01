/**
 * contact-request-manage
 * ----------------------
 * Server-gated lifecycle for contact requests. The sender owns send/cancel/
 * resend; the recipient owns decline. Acceptance remains in contact-manage
 * because it creates reciprocal user_contacts rows.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["send", "decline", "cancel", "resend"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 280;

type Body = {
  action?: unknown;
  to_user_id?: unknown;
  request_id?: unknown;
  message?: unknown;
};

serve(withSecurity("contact-request-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid contact request action" }, 400);

  if (action === "send") {
    const toUserId = cleanUuid(body.to_user_id);
    const message = cleanMessage(body.message);
    if (!toUserId || toUserId === user.id || message === undefined) {
      return json({ error: "Invalid contact request" }, 400);
    }
    return sendRequest(admin, user.id, toUserId, message, json);
  }

  const requestId = cleanUuid(body.request_id);
  if (!requestId) return json({ error: "Invalid contact request" }, 400);

  if (action === "decline") {
    const { error } = await admin
      .from("contact_requests")
      .update({ status: "declined" })
      .eq("id", requestId)
      .eq("to_user_id", user.id)
      .eq("status", "pending");
    if (error) return fail("decline", error, json);
    return json({ ok: true, action });
  }

  if (action === "cancel") {
    const { error } = await admin
      .from("contact_requests")
      .delete()
      .eq("id", requestId)
      .eq("from_user_id", user.id);
    if (error) return fail("cancel", error, json);
    return json({ ok: true, action });
  }

  const { data: existing, error: lookupError } = await admin
    .from("contact_requests")
    .select("id, to_user_id, message")
    .eq("id", requestId)
    .eq("from_user_id", user.id)
    .maybeSingle();
  if (lookupError) return fail("resend-lookup", lookupError, json);
  if (!existing?.to_user_id) return json({ error: "Contact request not found" }, 404);

  const { error: deleteError } = await admin
    .from("contact_requests")
    .delete()
    .eq("id", requestId)
    .eq("from_user_id", user.id);
  if (deleteError) return fail("resend-delete", deleteError, json);

  return sendRequest(admin, user.id, existing.to_user_id as string, existing.message as string | null, json);
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function sendRequest(
  admin: ReturnType<typeof createClient>,
  fromUserId: string,
  toUserId: string,
  message: string | null,
  json: (body: unknown, status?: number) => Response,
) {
  const { error } = await admin
    .from("contact_requests")
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      status: "pending",
    });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if ((error as { code?: string }).code === "23505" || msg.includes("duplicate") || msg.includes("already exists")) {
      return json({ ok: true, duplicate: true });
    }
    return fail("send", error, json);
  }

  return json({ ok: true });
}

function cleanAction(value: unknown): "send" | "decline" | "cancel" | "resend" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "send" | "decline" | "cancel" | "resend" : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanMessage(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const message = value.trim();
  if (message.length > MAX_MESSAGE_LENGTH) return undefined;
  return message || null;
}

function fail(action: string, error: { message?: string }, json: (body: unknown, status?: number) => Response) {
  console.error(`[contact-request-manage:${action}]`, error.message);
  return json({ error: "Could not update contact request" }, 500);
}
