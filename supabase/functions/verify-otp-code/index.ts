/**
 * verify-otp-code — consumes a purpose-bound HMAC email OTP.
 *
 * Public verification may create only a brand-new signup identity after proof
 * of the recipient email. Every existing-account purpose requires the current
 * authenticated account and can affect only that same account.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, HttpError, ValidationError } from "../_shared/errors.ts";
import { v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { rateLimit } from "../_shared/rateLimiter.ts";
import type { SecurityContext } from "../_shared/withSecurity.ts";
import {
  hmacEmailOtpCode,
  isEmailOtpPurpose,
  normalizeOtpEmail,
  requireOtpHmacSecret,
  timingSafeEqualOtpHmac,
  type EmailOtpPurpose,
} from "../_shared/otpSecurity.ts";

const Body = v.object({
  email: v.email,
  code: v.exactDigits(6),
  purpose: (value) => isEmailOtpPurpose(value) ? null : "Must be a supported OTP purpose",
  signup_data: (value) => value === undefined || value === null || (typeof value === "object" && !Array.isArray(value))
    ? null
    : "Must be an object",
});

type SignupDetails = {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  signupSource: string | null;
};

type VerificationRequest = {
  email: string;
  code: string;
  purpose: EmailOtpPurpose;
  signupData: unknown;
};

type ExistingAccountBinding = {
  userId: string;
};

type OtpRecord = {
  id: string;
  email: string;
  user_id: string | null;
  purpose: EmailOtpPurpose;
  code_hmac: string | null;
  attempts: number;
  expires_at: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseVerificationRequest(req: Request): Promise<VerificationRequest> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError({ _root: ["Invalid JSON body"] });
  }
  if (!isObject(raw)) throw new ValidationError({ _root: ["Expected an object"] });

  for (const key of ["userId", "user_id", "targetUserId", "target_user_id"]) {
    if (Object.hasOwn(raw, key)) {
      throw new ValidationError({ [key]: ["Target user IDs are not accepted for email OTPs"] });
    }
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);
  return {
    email: normalizeOtpEmail(String(parsed.data.email)),
    code: String(parsed.data.code),
    purpose: parsed.data.purpose as EmailOtpPurpose,
    signupData: parsed.data.signup_data,
  };
}

function calculateAge(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = now.getUTCMonth() < dob.getUTCMonth()
    || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function validateSignupData(value: unknown, verifiedEmail: string): SignupDetails | null {
  if (value === undefined || value === null) return null;
  if (!isObject(value)) throw new HttpError(400, "Invalid signup details", { code: "invalid_signup_details" });

  const allowedFields = new Set(["email", "password", "fullName", "phone", "dateOfBirth", "signupSource"]);
  if (Object.keys(value).some((key) => !allowedFields.has(key))) {
    throw new HttpError(400, "Invalid signup details", { code: "invalid_signup_details" });
  }

  const email = typeof value.email === "string" ? normalizeOtpEmail(value.email) : "";
  const password = typeof value.password === "string" ? value.password : "";
  const fullName = typeof value.fullName === "string" ? value.fullName.trim().replace(/\s+/g, " ") : "";
  const phone = typeof value.phone === "string" && value.phone.trim() ? value.phone.trim().slice(0, 40) : null;
  const signupSource = typeof value.signupSource === "string" && value.signupSource.trim()
    ? value.signupSource.trim().slice(0, 80)
    : null;
  const dateOfBirth = typeof value.dateOfBirth === "string" && value.dateOfBirth.trim()
    ? value.dateOfBirth.trim()
    : null;

  if (email !== verifiedEmail) {
    throw new HttpError(400, "Signup email must match the verified recipient", { code: "signup_email_mismatch" });
  }
  if (password.length < 8 || !fullName) {
    throw new HttpError(400, "Invalid signup details", { code: "invalid_signup_details" });
  }
  if (!dateOfBirth && signupSource !== "zivo_software") {
    throw new HttpError(400, "Date of birth is required.", { code: "invalid_signup_details" });
  }
  if (dateOfBirth) {
    const age = calculateAge(dateOfBirth);
    if (age === null || age > 120) {
      throw new HttpError(400, "Invalid date of birth. Use YYYY-MM-DD.", { code: "invalid_signup_details" });
    }
    if (age < 18) {
      throw new HttpError(403, "You must be 18 or older to sign up.", { code: "age_restricted" });
    }
  }

  return { email, password, fullName, phone, dateOfBirth, signupSource };
}

async function bindExistingAccount(req: Request, email: string): Promise<ExistingAccountBinding> {
  const auth = await requireUser(req);
  await requireUserNotBlocked(auth.userId);
  const { data, error } = await auth.supabase.auth.getUser(auth.token);
  const currentEmail = data.user?.email ? normalizeOtpEmail(data.user.email) : "";
  if (error || !data.user || currentEmail !== email) {
    throw new HttpError(403, "Email OTP recipient must match the authenticated account", {
      code: "otp_recipient_mismatch",
    });
  }
  return { userId: auth.userId };
}

function scopedOtpQuery(query: any, request: VerificationRequest, binding: ExistingAccountBinding | null) {
  const scoped = query.eq("email", request.email).eq("purpose", request.purpose);
  return binding ? scoped.eq("user_id", binding.userId) : scoped.is("user_id", null);
}

async function consumeOtp(
  service: ReturnType<typeof serviceClient>,
  record: OtpRecord,
  request: VerificationRequest,
  binding: ExistingAccountBinding | null,
): Promise<boolean> {
  const { data, error } = await scopedOtpQuery(
    service
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", record.id)
      .eq("attempts", record.attempts)
      .eq("code_hmac", record.code_hmac)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString()),
    request,
    binding,
  ).select("id").maybeSingle();
  if (error) {
    console.error("Failed to consume OTP:", error);
    throw new HttpError(503, "Email verification is temporarily unavailable");
  }
  return Boolean(data?.id);
}

function isExistingAccountError(error: { message?: string } | null): boolean {
  return /already|duplicate|exists|registered/i.test(error?.message ?? "");
}

function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Server configuration error");
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const handler = withErrorHandling(async (req: Request, ctx?: SecurityContext): Promise<Response> => {
  const corsHeaders = ctx?.corsHeaders ?? {};
  if (req.method === "OPTIONS") return preflight(ctx?.corsHeaders ?? req);

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const ipRl = rateLimit(ip, "auth_otp");
  if (!ipRl.allowed) {
    throw new HttpError(429, "Too many verification attempts. Please wait before trying again.", {
      retryAfter: ipRl.retryAfter,
    });
  }

  const request = await parseVerificationRequest(req);
  const binding = request.purpose === "signup" ? null : await bindExistingAccount(req, request.email);
  if (request.purpose !== "signup" && request.signupData !== undefined && request.signupData !== null) {
    throw new HttpError(400, "Signup details are only valid for signup verification", { code: "invalid_otp_purpose" });
  }

  let otpSecret: string;
  try {
    otpSecret = requireOtpHmacSecret();
  } catch {
    throw new HttpError(503, "Email verification is temporarily unavailable", {
      code: "otp_hmac_not_configured",
    });
  }

  const service = serviceClient();
  const { data: otpRecord, error: fetchError } = await scopedOtpQuery(
    service
      .from("otp_codes")
      .select("id, email, user_id, purpose, code_hmac, attempts, expires_at")
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
    request,
    binding,
  ).maybeSingle() as { data: OtpRecord | null; error: { message?: string } | null };

  if (fetchError || !otpRecord) {
    throw new HttpError(400, "No valid verification code found. Please request a new code.", {
      code: "NO_VALID_CODE",
    });
  }

  if (otpRecord.attempts >= 5 || !otpRecord.code_hmac) {
    await scopedOtpQuery(
      service.from("otp_codes").update({ verified_at: new Date().toISOString() }).eq("id", otpRecord.id),
      request,
      binding,
    ).is("verified_at", null);
    throw new HttpError(429, "Too many failed attempts. Please request a new code.", {
      code: "MAX_ATTEMPTS",
    });
  }

  const expectedHmac = await hmacEmailOtpCode(otpSecret, {
    id: otpRecord.id,
    email: request.email,
    purpose: request.purpose,
    userId: binding?.userId ?? null,
    code: request.code,
  });
  if (!timingSafeEqualOtpHmac(otpRecord.code_hmac, expectedHmac)) {
    const { data: attempted, error: attemptError } = await scopedOtpQuery(
      service
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id)
        .eq("attempts", otpRecord.attempts)
        .is("verified_at", null),
      request,
      binding,
    ).select("id").maybeSingle();
    if (attemptError || !attempted) {
      throw new HttpError(400, "No valid verification code found. Please request a new code.", {
        code: "NO_VALID_CODE",
      });
    }
    const remainingAttempts = 5 - (otpRecord.attempts + 1);
    throw new HttpError(
      400,
      `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
      { code: "INVALID_CODE", remainingAttempts },
    );
  }

  // A lost signup session must never turn a code into an account with stale or
  // attacker-provided server state. Keep the code usable so the person can
  // re-enter details in the current browser before completing signup.
  const signupDetails = request.purpose === "signup" ? validateSignupData(request.signupData, request.email) : null;
  if (request.purpose === "signup" && !signupDetails) {
    throw new HttpError(409, "Signup details are required to finish creating your account.", {
      code: "signup_details_required",
    });
  }

  if (!await consumeOtp(service, otpRecord, request, binding)) {
    throw new HttpError(400, "Verification code is expired or already used.", { code: "OTP_ALREADY_USED" });
  }

  if (request.purpose === "signup") {
    const details = signupDetails!;
    // No duplicate fallback or updateUserById path is allowed here. A valid
    // signup OTP may create a new account once, but can never reset an
    // existing account's password or otherwise take it over.
    const { data: createdUser, error: createError } = await service.auth.admin.createUser({
      email: details.email,
      password: details.password,
      email_confirm: true,
      user_metadata: {
        full_name: details.fullName,
        ...(details.phone ? { phone: details.phone } : {}),
        ...(details.dateOfBirth ? { date_of_birth: details.dateOfBirth } : {}),
        created_via: "email_signup_otp",
        ...(details.signupSource ? { signup_source: details.signupSource } : {}),
      },
    });
    if (createError || !createdUser?.user) {
      if (isExistingAccountError(createError)) {
        throw new HttpError(409, "An account already exists for this email. Please sign in or reset your password.", {
          code: "account_exists",
        });
      }
      console.error("Failed to create verified signup user:", createError);
      throw new HttpError(503, "Could not create account. Please try again.");
    }

    const userId = createdUser.user.id;
    const { error: profileError } = await service
      .from("profiles")
      .upsert({
        id: userId,
        user_id: userId,
        full_name: details.fullName,
        email: details.email,
        date_of_birth: details.dateOfBirth,
        email_verified: true,
      }, { onConflict: "id" });
    if (profileError) console.error("Verified signup profile upsert failed:", profileError);

    let actionLink: string | null = null;
    try {
      const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
        type: "magiclink",
        email: details.email,
      });
      if (linkError) console.error("Failed to generate signup magic link:", linkError);
      else actionLink = linkData?.properties?.action_link ?? null;
    } catch (error) {
      console.error("Signup magic link generation failed:", error);
    }

    return ok(corsHeaders, {
      success: true,
      message: "Email verified successfully",
      userId,
      actionLink,
      purpose: request.purpose,
    });
  }

  if (request.purpose === "email_verification") {
    // This branch is reachable only when the signed-in account, OTP row, and
    // recipient email all agree. It cannot confirm an arbitrary user ID.
    const { error: updateError } = await service.auth.admin.updateUserById(binding!.userId, {
      email_confirm: true,
    });
    if (updateError) {
      console.error("Failed to confirm verified account email:", updateError);
      throw new HttpError(503, "Email verification is temporarily unavailable");
    }
    await service
      .from("profiles")
      .update({ email_verified: true })
      .or(`user_id.eq.${binding!.userId},id.eq.${binding!.userId}`);
  }

  return ok(corsHeaders, {
    success: true,
    message: request.purpose === "new_device" ? "Device verification succeeded" : "Identity verified",
    purpose: request.purpose,
  });
}, "verify-otp-code");

serve(withSecurity("verify-otp-code", handler, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
