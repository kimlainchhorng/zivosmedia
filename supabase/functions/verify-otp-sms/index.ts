/**
 * verify-otp-sms — verifies a phone OTP via Twilio Verify.
 *
 * Authenticated endpoint for a signed-in user verifying their own phone
 * number. Uses shared toolkit for CORS, Zod-style validation, and
 * standardized error envelopes. Success response shape preserved:
 * { success: true, message }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { requireUser } from "../_shared/auth.ts";
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
  const requestedUserId = body.user_id as string;
  const { userId } = await requireUser(req);

  if (userId !== requestedUserId) {
    throw new HttpError(403, "You can only verify a phone number for your own account", {
      success: false,
      code: "USER_MISMATCH",
    });
  }

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

  // Do not upsert unconditionally: an existing user's explicit SMS choice must
  // survive phone verification, while a newly created preference row starts off.
  const { data: existingPreferences, error: preferenceLookupError } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (preferenceLookupError) {
    console.error("Failed to look up notification preferences:", preferenceLookupError);
  } else if (existingPreferences) {
    const { error: prefsUpdateError } = await supabase
      .from("notification_preferences")
      .update({
        phone_number: phone_e164,
        phone_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (prefsUpdateError) {
      console.error("Failed to update notification preferences:", prefsUpdateError);
    }
  } else {
    const { error: createPrefsError } = await supabase.from("notification_preferences").insert({
      user_id: userId,
      phone_number: phone_e164,
      phone_verified: true,
      email_enabled: true,
      // Phone verification is not consent for ongoing SMS. Keep the safe
      // default explicit even if a deployment's database defaults drift.
      sms_enabled: false,
      in_app_enabled: true,
    });

    if (createPrefsError) {
      console.error("Failed to create notification preferences:", createPrefsError);
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone_e164,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) {
    console.error("Failed to update profile:", profileError);
  } else {
    console.log("Phone verified for user:", userId);
  }

  return ok(req, { success: true, message: "Phone number verified successfully" });
}, "verify-otp-sms");

serve(withSecurity("verify-otp-sms", handler, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 90,
}));
