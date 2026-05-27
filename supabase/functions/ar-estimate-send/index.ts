/**
 * ar-estimate-send
 * ----------------
 * Sends a customer-facing estimate link via email (Resend) or SMS (send-sms).
 * Auto-generates a share_token if the estimate doesn't have one yet, so the
 * link is always valid. Marks the estimate as status='sent' on first dispatch.
 *
 * User explicitly approved the reminder-dispatch pattern on 2026-05-27; this
 * function follows the same shape: verify_jwt=false, service-role internal
 * guard, generic CORS, no automatic side effects beyond the requested send.
 *
 * Body: { estimate_id: string, channel: "email" | "sms" }
 * Returns: { ok: true, channel, share_url: string }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.106.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return /^\+[1-9]\d{6,14}$/.test(cleaned) ? cleaned : null;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  if (/^\d{11,15}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

function fmtDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON body" });
  }
  const estimateId: string | undefined = body?.estimate_id;
  const channel: string | undefined = body?.channel;
  if (!estimateId || !channel || (channel !== "email" && channel !== "sms")) {
    return j(400, { error: "estimate_id and channel ('email' | 'sms') required" });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: est, error: estErr } = await supabase
    .from("ar_estimates")
    .select("*")
    .eq("id", estimateId)
    .single();
  if (estErr || !est) return j(404, { error: "Estimate not found" });

  let token: string = est.share_token;
  if (!token) {
    token = crypto.randomUUID();
    const { error: tokErr } = await supabase
      .from("ar_estimates")
      .update({ share_token: token })
      .eq("id", estimateId);
    if (tokErr) return j(500, { error: `Could not generate share token: ${tokErr.message}` });
  }

  const { data: store } = await supabase
    .from("restaurants")
    .select("id, name, phone")
    .eq("id", est.store_id)
    .single();
  const storeName: string = store?.name || "Your shop";
  const storePhone: string = store?.phone || "";

  const origin = req.headers.get("Origin") || Deno.env.get("AR_PUBLIC_APP_ORIGIN") || "https://hizivo.com";
  const url = `${origin}/estimate/${token}`;

  const customerFirstName = (est.customer_name ?? "").trim().split(" ")[0] || "there";
  const vehicle = est.vehicle_label || "your vehicle";
  const total = fmtDollars(est.total_cents);

  const subject = `Estimate ${est.number} from ${storeName}`;
  const textBody =
    `Hi ${customerFirstName}, ${storeName} has prepared estimate ${est.number} for ${vehicle}` +
    (total ? ` — total ${total}.` : ".") +
    ` View & approve: ${url}` +
    (storePhone ? ` Call ${storePhone} with questions.` : "");

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;
  const fromEmail =
    Deno.env.get("AR_ESTIMATE_FROM_EMAIL") ||
    Deno.env.get("AR_REMINDER_FROM_EMAIL") ||
    "noreply@hizivo.com";

  try {
    if (channel === "email") {
      if (!est.customer_email) return j(400, { error: "Estimate has no customer email" });
      if (!resend) return j(503, { error: "Email provider not configured" });

      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;padding:24px;color:#111;line-height:1.55">
  <p style="margin:0 0 12px">Hi ${customerFirstName},</p>
  <p style="margin:0 0 16px"><strong>${storeName}</strong> has prepared estimate <strong>${est.number}</strong> for ${vehicle}${total ? ` — total <strong>${total}</strong>` : ""}.</p>
  <p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">View &amp; approve estimate</a></p>
  <p style="margin:0 0 8px;color:#666;font-size:13px">Or open this link: <a href="${url}" style="color:#0ea5e9;word-break:break-all">${url}</a></p>
  <p style="margin:16px 0 4px;color:#666;font-size:13px">${storePhone ? `Questions? Call <strong>${storePhone}</strong>.` : "Reply to this email with any questions."}</p>
  <p style="margin:8px 0 0">— ${storeName}</p>
</div>`;

      const { error: emailError } = await resend.emails.send({
        from: `${storeName} <${fromEmail}>`,
        to: [est.customer_email],
        subject,
        html,
      });
      if (emailError) return j(500, { error: `Resend: ${(emailError as any)?.message ?? String(emailError)}` });
    } else {
      const phone = normalizePhoneE164(est.customer_phone);
      if (!phone) return j(400, { error: "Estimate has no valid customer phone (need E.164 or 10-digit)" });

      const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phone,
          body: textBody.slice(0, 480),
          event_type: "ar_estimate_send",
        }),
      });
      if (!smsRes.ok) {
        const errBody = await smsRes.text().catch(() => "");
        return j(502, { error: `send-sms ${smsRes.status}: ${errBody.slice(0, 200)}` });
      }
    }

    // Mark estimate as sent / record first dispatch time.
    const updates: Record<string, any> = {};
    if (!est.sent_at) updates.sent_at = new Date().toISOString();
    if (est.status === "draft") updates.status = "sent";
    if (Object.keys(updates).length > 0) {
      await supabase.from("ar_estimates").update(updates).eq("id", estimateId);
    }

    return j(200, { ok: true, channel, share_url: url });
  } catch (e) {
    console.error("ar-estimate-send failed", e);
    return j(500, { error: e instanceof Error ? e.message : "send failed" });
  }
});
