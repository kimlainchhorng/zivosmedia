/**
 * send-employee-email-invite — creates an invite token + delegates to send-transactional-email.
 *
 * Body: { storeEmployeeId: uuid, email: string, storeName?: string, role?: string }
 */
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json(401, { error: "unauthenticated" });

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { error: "unauthenticated" });

    const body = await req.json().catch(() => ({}));
    const storeEmployeeId: string | undefined = body.storeEmployeeId;
    const email: string | undefined = body.email;
    const storeName: string = (body.storeName || "your team").toString().slice(0, 80);
    const role: string = (body.role || "staff").toString().slice(0, 40);

    if (!storeEmployeeId || !email) return json(400, { error: "missing_fields" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json(400, { error: "invalid_email" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: emp } = await admin
      .from("store_employees")
      .select("id, store_id")
      .eq("id", storeEmployeeId)
      .maybeSingle();
    if (!emp) return json(404, { error: "employee_not_found" });

    const { data: store } = await admin
      .from("store_profiles")
      .select("id, owner_id, name")
      .eq("id", emp.store_id)
      .maybeSingle();
    if (!store || store.owner_id !== user.id) {
      return json(403, { error: "not_store_owner" });
    }

    const inviteToken = generateToken();
    const { error: insErr } = await admin.from("store_employee_invites").insert({
      store_id: emp.store_id,
      store_employee_id: emp.id,
      channel: "email",
      email,
      token: inviteToken,
      sent_by: user.id,
    });
    if (insErr) return json(500, { error: "invite_insert_failed", detail: insErr.message });

    const loginUrl = `https://hizivo.com/auth/accept-invite?token=${inviteToken}`;

    // Delegate actual email send to send-transactional-email (uses queue + suppression)
    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName: "employee-invite",
        recipientEmail: email,
        idempotencyKey: `employee-invite-${inviteToken}`,
        templateData: { email, role, loginUrl },
      }),
    });
    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      console.error("send-transactional-email failed", sendData);
      return json(502, { error: "email_send_failed", detail: sendData });
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("send-employee-email-invite error", e);
    return json(500, { error: "internal_error", detail: String(e) });
  }
});
