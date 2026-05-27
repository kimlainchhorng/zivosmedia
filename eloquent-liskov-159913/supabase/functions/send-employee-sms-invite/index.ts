/**
 * send-employee-sms-invite — sends a branded SMS invite to a new store employee.
 *
 * Body: { storeEmployeeId: uuid, phone: string (E.164), storeName?: string, role?: string }
 * The caller's JWT must own the store associated with the employee row.
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

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      return json(500, { error: "twilio_not_configured" });
    }

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "unauthenticated" });

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json(401, { error: "unauthenticated" });

    const body = await req.json().catch(() => ({}));
    const storeEmployeeId: string | undefined = body.storeEmployeeId;
    const phone: string | undefined = body.phone;
    const storeName: string = (body.storeName || "your team").toString().slice(0, 80);
    const role: string = (body.role || "staff").toString().slice(0, 40);

    if (!storeEmployeeId || !phone) {
      return json(400, { error: "missing_fields" });
    }
    if (!/^\+\d{6,16}$/.test(phone)) {
      return json(400, { error: "invalid_phone_e164" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch employee + verify owner
    const { data: emp, error: empErr } = await admin
      .from("store_employees")
      .select("id, store_id, name")
      .eq("id", storeEmployeeId)
      .maybeSingle();
    if (empErr || !emp) return json(404, { error: "employee_not_found" });

    const { data: store } = await admin
      .from("store_profiles")
      .select("id, owner_id, name")
      .eq("id", emp.store_id)
      .maybeSingle();
    if (!store || store.owner_id !== user.id) {
      return json(403, { error: "not_store_owner" });
    }

    // Rate limit: max 5 SMS invites per phone per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("store_employee_invites")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("channel", "sms")
      .gte("sent_at", oneDayAgo);
    if ((count ?? 0) >= 5) {
      return json(429, { error: "rate_limited", message: "Too many SMS invites today." });
    }

    // Create invite token
    const inviteToken = generateToken();
    const { error: insErr } = await admin.from("store_employee_invites").insert({
      store_id: emp.store_id,
      store_employee_id: emp.id,
      channel: "sms",
      phone,
      token: inviteToken,
      sent_by: user.id,
    });
    if (insErr) return json(500, { error: "invite_insert_failed", detail: insErr.message });

    const link = `https://hizivo.com/auth/accept-invite?token=${inviteToken}`;
    const messageBody = `You're invited to join ${store.name || storeName} on ZIVO as ${role}. Set up your account: ${link}`;

    // Send via Twilio Messages API
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_FROM_NUMBER,
          Body: messageBody,
        }),
      },
    );
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error("Twilio error", twilioData);
      return json(502, { error: "twilio_send_failed", detail: twilioData?.message });
    }

    return json(200, { ok: true, sid: twilioData.sid });
  } catch (e) {
    console.error("send-employee-sms-invite error", e);
    return json(500, { error: "internal_error", detail: String(e) });
  }
});
