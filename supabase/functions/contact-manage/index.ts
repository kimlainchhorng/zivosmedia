/**
 * contact-manage
 * --------------
 * Server-gated contact-list mutations. Clients can read contacts via RLS, but
 * add/remove/favorite/rename and request acceptance are validated here.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["add", "remove", "favorite", "rename", "accept_request"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  contact_user_id?: unknown;
  request_id?: unknown;
  favorite?: unknown;
  custom_name?: unknown;
  added_via?: unknown;
};

serve(withSecurity("contact-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid contact request" }, 400);

  if (action === "accept_request") {
    const requestId = cleanUuid(body.request_id);
    if (!requestId) return json({ error: "Invalid contact request" }, 400);
    return acceptRequest(admin, user.id, requestId, json);
  }

  const contactUserId = cleanUuid(body.contact_user_id);
  if (!contactUserId || contactUserId === user.id) return json({ error: "Invalid contact request" }, 400);

  if (action === "remove") {
    const { error } = await admin
      .from("user_contacts")
      .delete()
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    if (error) return fail("remove", error, json);
    return json({ ok: true, action });
  }

  if (action === "favorite") {
    if (typeof body.favorite !== "boolean") return json({ error: "Invalid contact request" }, 400);
    const { error } = await admin
      .from("user_contacts")
      .update({ favorite: body.favorite })
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    if (error) return fail("favorite", error, json);
    return json({ ok: true, action });
  }

  if (action === "rename") {
    const customName = cleanCustomName(body.custom_name);
    if (customName === undefined) return json({ error: "Invalid contact request" }, 400);
    const { error } = await admin
      .from("user_contacts")
      .update({ custom_name: customName })
      .eq("owner_id", user.id)
      .eq("contact_user_id", contactUserId);
    if (error) return fail("rename", error, json);
    return json({ ok: true, action });
  }

  const { error } = await admin
    .from("user_contacts")
    .upsert({
      owner_id: user.id,
      contact_user_id: contactUserId,
      custom_name: cleanCustomName(body.custom_name) ?? null,
      added_via: cleanAddedVia(body.added_via),
    }, { onConflict: "owner_id,contact_user_id" });
  if (error) return fail("add", error, json);
  return json({ ok: true, action });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function acceptRequest(
  admin: ReturnType<typeof createClient>,
  userId: string,
  requestId: string,
  json: (body: unknown, status?: number) => Response,
) {
  const { data: request, error: lookupError } = await admin
    .from("contact_requests")
    .select("id, from_user_id, to_user_id, status")
    .eq("id", requestId)
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (lookupError) return fail("accept-lookup", lookupError, json);
  if (!request?.from_user_id) return json({ error: "Contact request not found" }, 404);

  const fromUserId = request.from_user_id as string;
  const { error: updateError } = await admin
    .from("contact_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("to_user_id", userId);
  if (updateError) return fail("accept-update", updateError, json);

  const { error: contactError } = await admin
    .from("user_contacts")
    .upsert([
      { owner_id: userId, contact_user_id: fromUserId, added_via: "request" },
      { owner_id: fromUserId, contact_user_id: userId, added_via: "request" },
    ], { onConflict: "owner_id,contact_user_id" });
  if (contactError) return fail("accept-contacts", contactError, json);

  await admin
    .from("contact_requests")
    .update({ status: "accepted" })
    .eq("from_user_id", userId)
    .eq("to_user_id", fromUserId)
    .eq("status", "pending");

  return json({ ok: true, action: "accept_request" });
}

function cleanAction(value: unknown): "add" | "remove" | "favorite" | "rename" | "accept_request" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "add" | "remove" | "favorite" | "rename" | "accept_request" : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanCustomName(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const name = value.trim();
  if (name.length > 80) return undefined;
  return name || null;
}

function cleanAddedVia(value: unknown): string {
  if (typeof value !== "string") return "username";
  const via = value.trim().slice(0, 40);
  return /^[a-z0-9:_-]+$/i.test(via) ? via : "username";
}

function fail(action: string, error: { message?: string }, json: (body: unknown, status?: number) => Response) {
  console.error(`[contact-manage:${action}]`, error.message);
  return json({ error: "Could not update contacts" }, 500);
}
