/**
 * public-signup — starts an email-ownership proof for a new account.
 *
 * This endpoint is intentionally public, so it must never create an Auth user
 * or accept a password as authoritative state. The browser holds signup
 * details only in its current session and submits them after the recipient has
 * proven control of the email with a purpose-bound OTP.
 */
import { withErrorHandling, HttpError, ValidationError } from "../_shared/errors.ts";
import { v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const Body = v.object({
  email: v.email,
});

async function parsePublicSignupBody(req: Request): Promise<{ email: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError({ _root: ["Invalid JSON body"] });
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError({ _root: ["Expected an object"] });
  }

  // Reject (rather than quietly retain) legacy signup fields. A password or
  // target user ID is not accepted until the recipient has proved email
  // ownership in verify-otp-code.
  const unexpected = Object.keys(raw as Record<string, unknown>).filter((key) => key !== "email");
  if (unexpected.length > 0) {
    throw new ValidationError({
      [unexpected[0]]: ["Signup details are accepted only after email verification"],
    });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);
  return { email: String(parsed.data.email).trim().toLowerCase() };
}

const handler = withErrorHandling(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return preflight(req);

  const { email } = await parsePublicSignupBody(req);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new HttpError(500, "Server configuration error");

  // The OTP issuer owns the HMAC secret, recipient binding, and rate limit.
  // This internal call contains no password, profile, or caller-selected user
  // identity; an existing account can never be modified through public signup.
  const otpResponse = await fetch(`${supabaseUrl}/functions/v1/send-otp-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose: "signup" }),
  });
  const otpPayload = await otpResponse.json().catch(() => null);

  if (!otpResponse.ok || !otpPayload?.success) {
    const status = otpResponse.status >= 400 && otpResponse.status < 600 ? otpResponse.status : 500;
    throw new HttpError(status, otpPayload?.error || "Could not send verification code");
  }

  return ok(req, {
    success: true,
    email,
    email_verification_required: true,
  });
}, "public-signup");

Deno.serve(withSecurity("public-signup", handler, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "auth_register",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
