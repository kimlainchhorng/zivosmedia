/**
 * send-otp-sms — sends a phone verification code via Twilio Verify.
 *
 * Public endpoint (signup/verification). Uses shared toolkit for CORS,
 * Zod-style validation, and standardized error envelopes. Success response
 * shape preserved: { success: true, message, expires_in }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const Body = v.object({
  phone_e164: v.e164,
  user_id: v.uuid,
});

const handler = withErrorHandling(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new HttpError(500, "Twilio Verify not configured", { success: false });
  }

  const body = await parseBody(req, Body);
  const phone_e164 = body.phone_e164 as string;
  const user_id = body.user_id as string;

  // Rate limit: max 5 OTP requests per phone per hour (app-level)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("sms_otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("phone_e164", phone_e164)
    .gte("created_at", oneHourAgo);

  if (recentCount && recentCount >= 5) {
    throw new HttpError(429, "Too many verification attempts. Please try again in an hour.", {
      success: false,
      code: "RATE_LIMITED",
    });
  }

  const verifyResponse = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone_e164, Channel: "sms" }),
    },
  );

  const verifyData = await verifyResponse.json();

  if (!verifyResponse.ok) {
    console.error("Twilio Verify error:", verifyData);
    throw new HttpError(500, verifyData.message || "Failed to send verification code", { success: false });
  }

  await supabase.from("sms_otp_codes").insert({
    user_id,
    phone_e164,
    code: "VERIFY_API",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const maskedPhone = "***-***-" + phone_e164.slice(-4);
  await supabase.from("notification_audit").insert({
    user_id,
    channel: "sms",
    event_type: "otp",
    destination_masked: maskedPhone,
    provider_id: verifyData.sid || null,
    status: "sent",
    error: null,
  });

  console.log(`Twilio Verify sent to ${maskedPhone} for user ${user_id}, SID: ${verifyData.sid}`);

  return ok(req, { success: true, message: "Verification code sent", expires_in: 600 });
}, "send-otp-sms");

serve(withSecurity("send-otp-sms", handler, {
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 90,
}));
