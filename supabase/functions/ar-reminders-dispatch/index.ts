/**
 * ar-reminders-dispatch
 * ---------------------
 * Sends due Auto Repair service reminders to customers via email (Resend)
 * or SMS (send-sms function). Marks each successfully dispatched reminder as
 * status='sent', sent_at=now(). Reminders without contact info are skipped
 * and left in 'scheduled' so the shop can edit them in.
 *
 * Triggered by pg_cron every 15 minutes (see
 * supabase/migrations/20260527144000_ar_reminders_dispatch_cron.sql).
 * Also callable on-demand with body { "reminder_id": "<uuid>" } from the
 * admin UI to send a single reminder immediately.
 *
 * Body (optional): { reminder_id?: string }
 * Returns: { sent: number, failed: number, skipped: number, due_count: number }
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });

  const supabase = createClient(supabaseUrl, serviceKey);

  // Optional payload: { reminder_id?: string } — admin UI "Send now" button.
  let reminderId: string | null = null;
  if (req.method === "POST") {
    try {
      const b = await req.json();
      reminderId = b?.reminder_id ?? null;
    } catch {
      // No JSON body — treat as cron run.
    }
  }

  let q = supabase
    .from("ar_service_reminders")
    .select("*")
    .eq("status", "scheduled");
  if (reminderId) {
    q = q.eq("id", reminderId);
  } else {
    q = q.lte("due_at", new Date().toISOString());
  }

  const { data: due, error } = await q.limit(100);
  if (error) {
    console.error("ar-reminders-dispatch query failed", error);
    return j(500, { error: error.message });
  }

  const list = due ?? [];
  if (list.length === 0) return j(200, { sent: 0, failed: 0, skipped: 0, due_count: 0 });

  // Bulk-fetch store info for personalization.
  const storeIds = [...new Set(list.map((r: any) => r.store_id).filter(Boolean))];
  const { data: stores } = storeIds.length
    ? await supabase.from("restaurants").select("id, name, phone").in("id", storeIds)
    : { data: [] };
  const storeMap = new Map<string, any>((stores ?? []).map((s: any) => [s.id, s]));

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
  const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;
  const fromEmail = Deno.env.get("AR_REMINDER_FROM_EMAIL") || "noreply@hizivo.com";

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of list) {
    const store = storeMap.get(r.store_id) ?? {};
    const storeName: string = store.name || "Your shop";
    const storePhone: string = store.phone || "";
    const customerName = (r.customer_name ?? "").trim() || "there";
    const vehicle = r.vehicle_label || "your vehicle";

    const subject = `${r.reminder_type} reminder for ${vehicle}`;
    const customBody: string = (r.message ?? "").trim();
    const defaultBody =
      `Hi ${customerName}, it's time for your ${String(r.reminder_type ?? "service").toLowerCase()} on ${vehicle}.` +
      (r.due_mileage ? ` Due around ${Number(r.due_mileage).toLocaleString()} miles.` : "") +
      (storePhone ? ` Call ${storePhone} to schedule.` : "") +
      ` — ${storeName}`;
    const body = customBody || defaultBody;

    try {
      if (r.channel === "email") {
        if (!r.customer_email) { skipped++; continue; }
        if (!resend) {
          console.warn("RESEND_API_KEY not configured — cannot send email reminder", r.id);
          failed++; continue;
        }
        const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;padding:24px;color:#111;line-height:1.55">${body.replace(/\n/g, "<br>")}</div>`;
        const { error: emailError } = await resend.emails.send({
          from: `${storeName} <${fromEmail}>`,
          to: [r.customer_email],
          subject,
          html,
        });
        if (emailError) throw new Error(`resend: ${(emailError as any)?.message ?? String(emailError)}`);
      } else if (r.channel === "sms") {
        const phone = normalizePhoneE164(r.customer_phone);
        if (!phone) { skipped++; continue; }
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: phone,
            body: body.slice(0, 480),
            event_type: "ar_service_reminder",
          }),
        });
        if (!smsRes.ok) {
          const errBody = await smsRes.text().catch(() => "");
          throw new Error(`send-sms ${smsRes.status}: ${errBody.slice(0, 200)}`);
        }
      } else {
        // Unknown channel — leave alone.
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("ar_service_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", r.id);
      if (updateError) console.error("status update failed", r.id, updateError);
      sent++;
    } catch (e) {
      console.error("ar-reminders-dispatch failed for", r.id, e);
      failed++;
    }
  }

  return j(200, { sent, failed, skipped, due_count: list.length });
});
