/**
 * send-otp-email — issues a purpose-bound, HMAC-protected email OTP.
 *
 * Public callers can request only a signup proof. Existing-account flows must
 * present an authenticated session whose current email matches the recipient;
 * callers never select the Auth user ID that an OTP can affect.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { Resend } from "npm:resend@2.0.0";
import { requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, HttpError, ValidationError } from "../_shared/errors.ts";
import { v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import type { SecurityContext } from "../_shared/withSecurity.ts";
import {
  generateEmailOtpCode,
  hmacEmailOtpCode,
  isEmailOtpPurpose,
  normalizeOtpEmail,
  requireOtpHmacSecret,
  type EmailOtpPurpose,
} from "../_shared/otpSecurity.ts";

const Body = v.object({
  email: v.email,
  purpose: (value) => isEmailOtpPurpose(value) ? null : "Must be a supported OTP purpose",
});

const SITE_NAME = "ZIVO";
const FROM_DOMAIN = "zivosmedia.com";
const OTP_TTL_MS = 10 * 60 * 1000;

type OtpRequest = {
  email: string;
  purpose: EmailOtpPurpose;
};

type AccountBinding = {
  userId: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseOtpRequest(req: Request): Promise<OtpRequest> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError({ _root: ["Invalid JSON body"] });
  }
  if (!isObject(raw)) throw new ValidationError({ _root: ["Expected an object"] });

  // Legacy callers could choose the user record that verification modified.
  // Fail closed rather than accepting or reinterpreting a caller-owned target.
  for (const key of ["userId", "user_id", "targetUserId", "target_user_id"]) {
    if (Object.hasOwn(raw, key)) {
      throw new ValidationError({ [key]: ["Target user IDs are not accepted for email OTPs"] });
    }
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);
  return {
    email: normalizeOtpEmail(String(parsed.data.email)),
    purpose: parsed.data.purpose as EmailOtpPurpose,
  };
}

async function bindAuthenticatedRecipient(req: Request, email: string): Promise<AccountBinding> {
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

function scopedOtpQuery(query: any, request: OtpRequest, binding: AccountBinding | null) {
  const scoped = query.eq("email", request.email).eq("purpose", request.purpose);
  return binding ? scoped.eq("user_id", binding.userId) : scoped.is("user_id", null);
}

function renderOtpEmail(code: string, expiresAt: string) {
  const expiresTime = new Date(expiresAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const text = [
    `Your ${SITE_NAME} verification code is ${code}.`,
    `It expires at ${expiresTime}.`,
    "If you did not request this code, you can ignore this email.",
    "",
    "ZIVO LLC",
    "zivosmedia.com",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your ${SITE_NAME} verification code</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 18px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding:0 0 18px;">
                <div style="width:46px;height:46px;line-height:46px;border-radius:16px;background:linear-gradient(135deg,#111827 0%,#0f766e 62%,#38bdf8 100%);color:#fff;font-size:27px;font-weight:900;text-align:center;">Z</div>
                <div style="margin-top:8px;color:#0f172a;font-size:13px;font-weight:900;letter-spacing:.24em;">ZIVO</div>
              </td>
            </tr>
            <tr>
              <td style="background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:34px 30px;box-shadow:0 18px 45px rgba(15,23,42,.08);">
                <p style="margin:0 0 10px;color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">Account verification</p>
                <h1 style="margin:0 0 14px;color:#0f172a;font-size:26px;line-height:1.18;font-weight:900;">Your verification code</h1>
                <p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.6;">Enter this code in ZIVO to continue. The code expires in 10 minutes.</p>
                <div style="margin:8px 0 22px;border-radius:18px;border:1px solid #dbeafe;background:#f8fafc;color:#0f172a;font-family:'SF Mono',Consolas,Monaco,monospace;font-size:32px;font-weight:900;letter-spacing:.28em;line-height:1;padding:22px 18px;text-align:center;">${code}</div>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.55;">Expires at <strong style="color:#0f172a;">${expiresTime}</strong>.</p>
                <p style="margin:18px 0 0;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.55;padding-top:18px;">If you did not request this code, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">ZIVO LLC · Secure account email · zivosmedia.com</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

const handler = withErrorHandling(async (req: Request, ctx?: SecurityContext): Promise<Response> => {
  const corsHeaders = ctx?.corsHeaders ?? {};
  if (req.method === "OPTIONS") return preflight(ctx?.corsHeaders ?? req);

  const request = await parseOtpRequest(req);
  const binding = request.purpose === "signup"
    ? null
    : await bindAuthenticatedRecipient(req, request.email);

  let otpSecret: string;
  try {
    otpSecret = requireOtpHmacSecret();
  } catch {
    throw new HttpError(503, "Email verification is temporarily unavailable", {
      code: "otp_hmac_not_configured",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    throw new HttpError(500, "Server configuration error");
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Rate limiting: max 5 OTP requests per recipient + purpose per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countError } = await scopedOtpQuery(
    supabase.from("otp_codes").select("id", { count: "exact", head: true }),
    request,
    binding,
  ).gte("created_at", oneHourAgo);
  if (countError) {
    console.error("Failed to count OTP requests:", countError);
    throw new HttpError(503, "Email verification is temporarily unavailable");
  }
  if (recentCount && recentCount >= 5) {
    throw new HttpError(429, "Too many verification requests. Please wait before trying again.", {
      retryAfter: 3600,
    });
  }

  const code = generateEmailOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const id = crypto.randomUUID();
  const codeHmac = await hmacEmailOtpCode(otpSecret, {
    id,
    email: request.email,
    purpose: request.purpose,
    userId: binding?.userId ?? null,
    code,
  });

  // Invalidate only codes in the same recipient/purpose/account scope. A
  // public signup request cannot invalidate a password-change or device code.
  const { error: invalidateError } = await scopedOtpQuery(
    supabase.from("otp_codes").update({ verified_at: new Date().toISOString() }),
    request,
    binding,
  ).is("verified_at", null);
  if (invalidateError) {
    console.error("Failed to invalidate prior OTPs:", invalidateError);
    throw new HttpError(503, "Email verification is temporarily unavailable");
  }

  const { error: insertError } = await supabase
    .from("otp_codes")
    .insert({
      id,
      email: request.email,
      user_id: binding?.userId ?? null,
      purpose: request.purpose,
      code: null,
      code_hmac: codeHmac,
      attempts: 0,
      expires_at: expiresAt,
    });
  if (insertError) {
    console.error("Failed to store OTP:", insertError);
    throw new HttpError(503, "Email verification is temporarily unavailable");
  }

  const { html, text } = renderOtpEmail(code, expiresAt);
  const emailResponse = await new Resend(resendApiKey).emails.send({
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    to: [request.email],
    subject: "Your ZIVO verification code",
    html,
    text,
  });
  if (emailResponse.error) {
    // Do not leave a usable code behind when delivery was not confirmed.
    await supabase.from("otp_codes").update({ verified_at: new Date().toISOString() }).eq("id", id);
    console.error("Failed to send OTP email:", emailResponse.error);
    throw new HttpError(502, "Failed to send verification email");
  }

  console.log("OTP email sent successfully", { resendId: emailResponse.data?.id, purpose: request.purpose });
  return ok(corsHeaders, { success: true, message: "Verification code sent", expiresAt });
}, "send-otp-email");

serve(withSecurity("send-otp-email", handler, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
