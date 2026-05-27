/**
 * salon-send-campaign
 * -------------------
 * Owner triggers this from the SalonCampaignsSection UI. It expands the
 * cohort, materializes per-recipient rows, runs a consent-gating pass, then
 * fans out the SMS + email sends in rate-limited batches. The campaign row
 * tracks the status machine (draft → sending → sent/failed) and the
 * per-recipient table records the final per-message outcome.
 *
 * Auth: the user must be the store owner (or platform admin). We do an
 * explicit auth.uid()-against-owner_id check rather than relying on RLS
 * because the function uses the service role for downstream writes.
 *
 * Idempotency: every recipient row has a UNIQUE idempotency_key shaped
 * `campaign-{campaign_id}-{client_id}`. Re-running the function for a
 * campaign already in 'sent'/'sending' is refused — the status guard
 * trigger also enforces this at the DB level.
 */
import { serve, createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Lightweight {{merge_tag}} interpolation; reused from send-transactional-email.
const interpolate = (s: string, data: Record<string, unknown>) =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
    const v = data[key];
    return v == null ? "" : String(v);
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Recipient {
  client_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  marketing_opt_in: boolean;
}

const firstNameOf = (full: string): string =>
  (full?.trim().split(/\s+/)[0] ?? "").trim() || "there";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });

  // Pull the caller's auth header to identify the user. Then use a service-
  // role client for downstream writes (cohort expansion + recipient inserts).
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return j(401, { error: "Unauthorized" });
  const callerClient = createClient(supabaseUrl, auth.slice(7));
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData?.user) return j(401, { error: "Unauthorized" });
  const userId = userData.user.id;

  const supabase = createClient(supabaseUrl, serviceKey);

  let campaignId: string;
  try {
    const body = await req.json();
    campaignId = body.campaign_id ?? body.campaignId;
  } catch {
    return j(400, { error: "campaign_id required" });
  }
  if (!campaignId) return j(400, { error: "campaign_id required" });

  // ---- Load + authorize -----------------------------------------------------
  const { data: campaign, error: cErr } = await supabase
    .from("salon_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (cErr || !campaign) return j(404, { error: "Campaign not found" });

  const { data: store } = await supabase
    .from("store_profiles")
    .select("id, name, slug, phone, owner_id")
    .eq("id", (campaign as any).store_id)
    .maybeSingle();
  if (!store) return j(404, { error: "Store not found" });

  // Authorize: owner OR admin.
  if ((store as any).owner_id !== userId) {
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) return j(403, { error: "Not authorized for this store" });
  }

  if ((campaign as any).status !== "draft") {
    return j(409, { error: `Campaign is ${(campaign as any).status}, only draft campaigns can be sent.` });
  }

  // ---- Resolve cohort -------------------------------------------------------
  // Use the user's RLS-scoped client so the RPC sees the right auth.uid().
  const { data: cohort, error: cohortErr } = await callerClient
    .rpc("salon_campaign_resolve_cohort", {
      p_store_id: (campaign as any).store_id,
      p_kind: (campaign as any).cohort_kind,
      p_params: (campaign as any).cohort_params ?? {},
    });
  if (cohortErr) {
    await supabase
      .from("salon_campaigns")
      .update({ status: "failed", error: `cohort_resolve: ${cohortErr.message}`.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return j(500, { error: cohortErr.message });
  }
  const recipients = (cohort ?? []) as Recipient[];

  // Empty cohort: short-circuit.
  if (recipients.length === 0) {
    await supabase
      .from("salon_campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: 0, sent_count: 0, failed_count: 0, skipped_count: 0, updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return j(200, { ok: true, recipients: 0 });
  }

  // ---- Flip to 'sending' (also runs the status guard for body validation) --
  const { error: flipErr } = await supabase
    .from("salon_campaigns")
    .update({ status: "sending", recipient_count: recipients.length, updated_at: new Date().toISOString() })
    .eq("id", campaignId);
  if (flipErr) return j(400, { error: flipErr.message });

  // ---- Bulk insert per-recipient rows -------------------------------------
  // Use a per-row idempotency_key keyed to (campaign, client) so even if this
  // function is retried mid-fanout, the unique index dedups.
  const rows = recipients.map((r) => ({
    campaign_id: campaignId,
    client_id: r.client_id,
    client_name: r.display_name,
    client_phone: r.phone,
    client_email: r.email,
    idempotency_key: `campaign-${campaignId}-${r.client_id}`,
    status: "pending" as const,
  }));
  // upsert by idempotency_key — handles retry gracefully.
  const { error: insErr } = await supabase
    .from("salon_campaign_recipients")
    .upsert(rows as never, { onConflict: "idempotency_key" });
  if (insErr) {
    console.warn("[salon-send-campaign] recipients insert failed", insErr);
  }

  // ---- Fanout in batches of 50 with 250ms gap -----------------------------
  const c = campaign as any;
  const wantSms = c.channel_sms && c.sms_body && c.sms_body.trim().length > 0;
  const wantEmail = c.channel_email && c.body_html && c.body_html.trim().length > 0;
  const subject = c.subject ?? "A message from your salon";
  const salonName = c.sender_name_override || (store as any).name || "your salon";
  const salonPhone = (store as any).phone;
  const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com";
  const bookingUrl = (store as any).slug ? `${appUrl}/salon/${(store as any).slug}` : appUrl;

  const BATCH = 50;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await Promise.all(slice.map(async (r) => {
      const idempotencyKey = `campaign-${campaignId}-${r.client_id}`;
      const data: Record<string, unknown> = {
        client_first_name: firstNameOf(r.display_name),
        client_name: r.display_name,
        salon_name: salonName,
        salon_phone: salonPhone,
        booking_url: bookingUrl,
        // store_id triggers per-store template override lookup in send-transactional-email,
        // but campaigns ARE the override — we don't want it to pull another override on top.
        // So we intentionally omit store_id from templateData here.
      };

      // Pre-check: skip if no contact at all OR opt-outs leave nothing to send.
      const canSmsForThis = wantSms && r.sms_opt_in && r.phone;
      const canEmailForThis = wantEmail && r.email_opt_in && r.email;
      if (!canSmsForThis && !canEmailForThis) {
        const skipReason = (!r.phone && !r.email) ? "skipped_no_contact" : "skipped_opt_out";
        await supabase
          .from("salon_campaign_recipients")
          .update({ status: skipReason, updated_at: new Date().toISOString() })
          .eq("idempotency_key", idempotencyKey);
        skipped++;
        return;
      }

      let anySent = false;
      let lastError: string | null = null;

      if (canEmailForThis) {
        try {
          const emailBody = interpolate(c.body_html, data);
          const emailSubject = interpolate(subject, data);
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "salon-campaign-passthrough",
              recipientEmail: r.email,
              idempotencyKey: `${idempotencyKey}-email`,
              templateData: {
                subject: emailSubject,
                body_html: emailBody,
                salon_name: salonName,
              },
            },
          });
          anySent = true;
        } catch (e) {
          lastError = String((e as Error).message || e);
        }
      }

      if (canSmsForThis) {
        try {
          // TCPA compliance: every marketing SMS MUST include an opt-out
          // instruction. Auto-append the footer if the owner's body doesn't
          // already mention STOP / unsubscribe (case-insensitive match).
          // The twilio-webhook already handles the inbound STOP keyword.
          let smsBody = interpolate(c.sms_body, data);
          if (!/\b(stop|unsubscribe)\b/i.test(smsBody)) {
            const footer = " Reply STOP to opt out.";
            // Keep total under 1200 chars (Twilio's hard limit, used elsewhere).
            const maxBody = 1200 - footer.length;
            if (smsBody.length > maxBody) smsBody = smsBody.slice(0, maxBody);
            smsBody = smsBody + footer;
          }
          await supabase.functions.invoke("send-sms", {
            body: {
              to: r.phone,
              body: smsBody,
              event_type: "salon_campaign",
              user_id: null,
            },
          });
          anySent = true;
        } catch (e) {
          lastError = String((e as Error).message || e);
        }
      }

      await supabase
        .from("salon_campaign_recipients")
        .update({
          status: anySent ? "sent" : "failed",
          sent_at: anySent ? new Date().toISOString() : null,
          error: anySent ? null : (lastError ?? "no_channel_succeeded"),
        })
        .eq("idempotency_key", idempotencyKey);

      if (anySent) sent++;
      else failed++;
    }));

    if (i + BATCH < recipients.length) await sleep(250);
  }

  // ---- Re-tally + flip to 'sent' ------------------------------------------
  const { data: finalCounts } = await supabase
    .from("salon_campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);
  let cSent = 0, cFailed = 0, cSkipped = 0;
  for (const row of (finalCounts ?? []) as any[]) {
    if (row.status === "sent") cSent++;
    else if (row.status === "failed") cFailed++;
    else if (row.status?.startsWith?.("skipped")) cSkipped++;
  }

  await supabase
    .from("salon_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_count: cSent,
      failed_count: cFailed,
      skipped_count: cSkipped,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return j(200, { ok: true, recipients: recipients.length, sent: cSent, failed: cFailed, skipped: cSkipped });
});
