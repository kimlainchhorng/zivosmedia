/**
 * verify-otp-code — verifies the email OTP issued by send-otp-email.
 *
 * Public endpoint (caller is mid-signup, no session yet). Uses shared toolkit
 * for CORS, Zod-style validation, and standardized error envelopes. Success
 * response shape preserved: { success: true, message, userId, actionLink }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { rateLimit } from "../_shared/rateLimiter.ts";

const Body = v.object({
  email: v.email,
  code: v.exactDigits(6),
});

const handler = withErrorHandling(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight(req);

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const ipRl = rateLimit(ip, "auth_otp");
  if (!ipRl.allowed) {
    throw new HttpError(429, "Too many verification attempts. Please wait before trying again.", {
      retryAfter: ipRl.retryAfter,
    });
  }

  const body = await parseBody(req, Body);
  const normalizedEmail = (body.email as string).toLowerCase();
  const code = body.code as string;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const resolveUserId = async () => {
    const { data: profileMatch, error: profileLookupError } = await supabase
      .from("profiles")
      .select("user_id, id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (profileLookupError) {
      console.error("Failed to look up profile for OTP verification:", profileLookupError);
    }

    const profileUserId = profileMatch?.user_id ?? profileMatch?.id;
    if (profileUserId) return profileUserId;

    const { data: userList, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error("Failed to look up auth user for OTP verification:", usersError);
      return null;
    }

    return (
      userList.users.find((user) => user.email?.toLowerCase() === normalizedEmail)?.id ?? null
    );
  };

  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", normalizedEmail)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !otpRecord) {
    throw new HttpError(400, "No valid verification code found. Please request a new code.", {
      code: "NO_VALID_CODE",
    });
  }

  if (otpRecord.attempts >= 5) {
    await supabase
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);
    throw new HttpError(429, "Too many failed attempts. Please request a new code.", {
      code: "MAX_ATTEMPTS",
    });
  }

  if (otpRecord.code !== code) {
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);
    const remainingAttempts = 5 - (otpRecord.attempts + 1);
    throw new HttpError(
      400,
      `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
      { code: "INVALID_CODE", remainingAttempts },
    );
  }

  await supabase
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  const resolvedUserId = otpRecord.user_id ?? (await resolveUserId());

  if (resolvedUserId && !otpRecord.user_id) {
    const { error: otpUpdateError } = await supabase
      .from("otp_codes")
      .update({ user_id: resolvedUserId })
      .eq("id", otpRecord.id);
    if (otpUpdateError) {
      console.error("Failed to backfill OTP user_id:", otpUpdateError);
    }
  }

  if (resolvedUserId) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(resolvedUserId, {
      email_confirm: true,
    });
    if (updateError) {
      console.error("Failed to confirm email in auth:", updateError);
    } else {
      console.log("Email confirmed in auth for user:", resolvedUserId);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .or(`user_id.eq.${resolvedUserId},id.eq.${resolvedUserId}`);
    if (profileError) {
      console.error("Failed to update profile email_verified:", profileError);
    } else {
      console.log("Profile email_verified updated for user:", resolvedUserId);
    }
  }

  let actionLink: string | null = null;
  if (resolvedUserId) {
    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });
      if (linkError) {
        console.error("Failed to generate magic link:", linkError);
      } else {
        actionLink = linkData?.properties?.action_link ?? null;
      }
    } catch (e) {
      console.error("generateLink threw:", e);
    }
  }

  return ok(req, {
    success: true,
    message: "Email verified successfully",
    userId: resolvedUserId,
    actionLink,
  });
}, "verify-otp-code");

serve(withSecurity("verify-otp-code", handler, { rateLimit: "auth_otp" }));
