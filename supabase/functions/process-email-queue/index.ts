import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const RESEND_API_URL = "https://api.resend.com/emails";
const BATCH_SIZE = 20;

Deno.serve(withSecurity("process-email-queue", async (_req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not set");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Claim a batch: atomically move rows from 'queued' → 'processing'
  // to prevent concurrent invocations from double-sending.
  const runId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_queued_emails",
    { p_run_id: runId, p_limit: BATCH_SIZE },
  );

  if (claimError) {
    // claim_queued_emails may not exist yet — fall back to a direct query.
    // The fallback is safe for low-volume usage but not concurrent-safe.
    const { data: rows, error: fetchError } = await supabase
      .from("email_send_log")
      .select("message_id, metadata")
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Failed to fetch queued emails", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to read queue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await processRows(rows ?? [], supabase, resendApiKey);
    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const results = await processRows(claimed ?? [], supabase, resendApiKey);
  return new Response(
    JSON.stringify(results),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}));

async function processRows(
  rows: Array<{ message_id: string; metadata: Record<string, unknown> }>,
  supabase: ReturnType<typeof createClient>,
  resendApiKey: string,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    const { message_id, metadata } = row;
    if (!metadata) { skipped++; continue; }

    const to = metadata.to as string;
    const from = metadata.from as string;
    const subject = metadata.subject as string;
    const html = metadata.html as string;
    const text = metadata.text as string | undefined;

    if (!to || !from || !subject || !html) {
      console.warn("Skipping malformed queue entry", { message_id });
      await supabase.from("email_send_log")
        .update({ status: "failed", error_message: "Malformed payload" })
        .eq("message_id", message_id);
      skipped++;
      continue;
    }

    try {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
          "Idempotency-Key": message_id,
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Resend error", { message_id, status: res.status, body });
        await supabase.from("email_send_log")
          .update({ status: "failed", error_message: JSON.stringify(body) })
          .eq("message_id", message_id);
        failed++;
      } else {
        await supabase.from("email_send_log")
          .update({ status: "sent" })
          .eq("message_id", message_id);
        sent++;
      }
    } catch (err) {
      console.error("Unexpected error sending email", { message_id, err });
      await supabase.from("email_send_log")
        .update({ status: "failed", error_message: String(err) })
        .eq("message_id", message_id);
      failed++;
    }
  }

  console.log("process-email-queue complete", { sent, failed, skipped, total: rows.length });
  return { sent, failed, skipped };
}
