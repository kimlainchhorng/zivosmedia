/**
 * public-signup — creates an unverified account and triggers an email OTP.
 *
 * Public endpoint (signup happens before auth). Uses shared toolkit for CORS,
 * Zod-style validation, and standardized error envelopes. Success response
 * shape preserved: { success: true, userId }.
 */
import { createClient } from "../_shared/deps.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";

const Body = v.object({
  email: v.email,
  password: v.minLength(8),
  fullName: v.nonEmptyString,
  phone: v.optionalString,
  // Accepted as ISO date string "YYYY-MM-DD". Required for the 18+ gate
  // (enforced below). Optional in the validator so older clients without DOB
  // surface a precise error message rather than a generic schema rejection.
  dateOfBirth: v.optionalString,
});

// 18+ gate: accept ISO "YYYY-MM-DD", reject anything else or under 18.
function calculateAge(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dob = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

const handler = withErrorHandling(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight(req);

  const body = await parseBody(req, Body);
  const normalizedEmail = (body.email as string).trim().toLowerCase();
  const normalizedPassword = body.password as string;
  const normalizedFullName = (body.fullName as string).trim().replace(/\s+/g, " ");
  const normalizedPhone = body.phone ? (body.phone as string).trim() : undefined;
  const rawDob = body.dateOfBirth ? (body.dateOfBirth as string).trim() : "";

  // 18+ enforcement — server side so a malicious client can't bypass.
  if (!rawDob) {
    throw new HttpError(400, "Date of birth is required.");
  }
  const age = calculateAge(rawDob);
  if (age === null) {
    throw new HttpError(400, "Invalid date of birth. Use YYYY-MM-DD.");
  }
  if (age < 18) {
    throw new HttpError(403, "You must be 18 or older to sign up.");
  }
  if (age > 120) {
    throw new HttpError(400, "Invalid date of birth.");
  }
  const normalizedDob = rawDob;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, "Server configuration error");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: false,
    user_metadata: {
      full_name: normalizedFullName,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      date_of_birth: normalizedDob,
      created_via: "email_signup_otp",
    },
  });

  if (createError || !createdUser?.user) {
    throw new HttpError(400, createError?.message || "Could not create account");
  }

  const userId = createdUser.user.id;

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        user_id: userId,
        full_name: normalizedFullName,
        email: normalizedEmail,
        date_of_birth: normalizedDob,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("[public-signup] profile upsert failed", profileError);
  }

  const otpResponse = await fetch(`${supabaseUrl}/functions/v1/send-otp-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail, userId }),
  });

  const otpPayload = await otpResponse.json().catch(() => null);

  if (!otpResponse.ok) {
    console.error("[public-signup] OTP email send failed", otpPayload);
    await adminClient.auth.admin.deleteUser(userId).catch((deleteError) => {
      console.error("[public-signup] failed to rollback user after OTP send failure", deleteError);
    });
    const status = otpResponse.status >= 400 && otpResponse.status < 600 ? otpResponse.status : 500;
    throw new HttpError(status, otpPayload?.error || "Could not send verification code");
  }

  return ok(req, { success: true, userId });
}, "public-signup");

Deno.serve(handler);
