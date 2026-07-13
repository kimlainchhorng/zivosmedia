/**
 * verify-otp-sms — verifies a phone OTP via Twilio Verify.
 *
 * Public endpoint (mid-signup or phone-add flow). Uses shared toolkit for CORS,
 * Zod-style validation, and standardized error envelopes. Success response
 * shape preserved: { success: true, message }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const Body = v.object({
  phone_e164: v.e164,
  code: v.exactDigits(6),
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
  const code = body.code as string;
  const user_id = body.user_id as string;

  const checkResponse = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone_e164, Code: code }),
    },
  );

  const checkData = await checkResponse.json();

  if (!checkResponse.ok) {
    console.error("Twilio Verify check error:", checkData);
    if (checkResponse.status === 404) {
      throw new HttpError(400, "No valid verification code found. Please request a new code.", {
        success: false,
        code: "NO_VALID_CODE",
      });
    }
    if (checkResponse.status === 429) {
      throw new HttpError(429, "Too many failed attempts. Please request a new code.", {
        success: false,
        code: "MAX_ATTEMPTS",
      });
    }
    throw new HttpError(400, checkData.message || "Verification failed", { success: false });
  }

  if (checkData.status !== "approved") {
    throw new HttpError(400, "Incorrect code. Please try again.", {
      success: false,
      code: "INVALID_CODE",
    });
  }

  const { error: prefsError } = await supabase
    .from("notification_preferences")
    .update({
      phone_number: phone_e164,
      phone_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user_id);

  if (prefsError) {
    await supabase.from("notification_preferences").upsert({
      user_id,
      phone_number: phone_e164,
      phone_verified: true,
      email_enabled: true,
      sms_enabled: true,
      in_app_enabled: true,
    });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone_e164,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
      sms_consent: true,
    })
    .eq("user_id", user_id);

  if (profileError) {
    console.error("Failed to update profile:", profileError);
  } else {
    console.log("Phone verified for user:", user_id);
  }

  return ok(req, { success: true, message: "Phone number verified successfully" });
}, "verify-otp-sms");

serve(withSecurity("verify-otp-sms", handler, {
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 90,
}));
