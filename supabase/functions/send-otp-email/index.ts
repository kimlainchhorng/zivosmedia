/**
 * send-otp-email — issues a 6-digit OTP and emails it via Resend.
 *
 * Public endpoint (caller is unauthenticated). Uses shared toolkit for CORS,
 * Zod-style validation, and standardized error envelopes. Success response
 * shape preserved: { success: true, message, expiresAt }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import { generateOtpCode, hashOtpCode } from "../_shared/otp.ts";
import type { SecurityContext } from "../_shared/withSecurity.ts";

const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL")?.trim() || "info@hizivo.com";
const resendFromName = Deno.env.get("RESEND_FROM_NAME")?.trim() || "ZIVO";
const OTP_RESEND_COOLDOWN_SECONDS = 30;

const Body = v.object({
  email: v.email,
  userId: v.optionalString,
});

const handler = withErrorHandling(async (req: Request, ctx?: SecurityContext): Promise<Response> => {
  const corsHeaders = ctx?.corsHeaders ?? {};
  if (req.method === "OPTIONS") return preflight(ctx?.corsHeaders ?? req);

  const body = await parseBody(req, Body);
  const email = (body.email as string).trim().toLowerCase();
  const userId = (body.userId as string | undefined) ?? null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new HttpError(500, "Server configuration error");
  }
  if (!resendApiKey) {
    throw new HttpError(500, "Email delivery is not configured");
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = Date.now();

  // Rate limiting: max 5 OTP requests per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", oneHourAgo);

  if (recentCount && recentCount >= 5) {
    throw new HttpError(429, "Too many verification requests. Please wait before trying again.", {
      retryAfter: 3600,
    });
  }

  const { data: recentPendingOtp, error: recentPendingError } = await supabase
    .from("otp_codes")
    .select("created_at, expires_at")
    .eq("email", email)
    .is("verified_at", null)
    .gt("expires_at", new Date(now).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentPendingError) {
    console.error("Failed to inspect recent OTP request:", recentPendingError);
  }

  if (recentPendingOtp?.created_at) {
    const createdAtMs = new Date(recentPendingOtp.created_at).getTime();
    const elapsedSeconds = Math.floor((now - createdAtMs) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new HttpError(429, "A verification code was sent recently. Please wait before requesting another.", {
        code: "OTP_RESEND_COOLDOWN",
        retryAfter: OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
      });
    }
  }

  const code = generateOtpCode();
  const codeHash = await hashOtpCode(email, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate existing pending codes for this email
  await supabase
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("email", email)
    .is("verified_at", null);

  const { data: insertedOtp, error: insertError } = await supabase
    .from("otp_codes")
    .insert({
      email,
      user_id: userId,
      code: codeHash,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !insertedOtp?.id) {
    console.error("Failed to store OTP:", insertError);
    throw new HttpError(500, "Failed to generate verification code");
  }

  const idempotencyKey = `otp-email/${insertedOtp.id}`;

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: [email],
        subject: "Your ZIVO verification code",
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a; overflow: hidden;">
                <tr>
                  <td style="padding: 32px 32px 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">ZIVO ID</h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #a1a1aa;">Secure Account Verification</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <p style="margin: 0 0 24px; font-size: 14px; color: #a1a1aa; text-align: center;">
                      Enter this code to verify your email address:
                    </p>
                    <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${code}</span>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                      This code expires in <strong style="color: #a1a1aa;">10 minutes</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px; background-color: #09090b; border-top: 1px solid #27272a;">
                    <p style="margin: 0; font-size: 11px; color: #52525b; text-align: center;">
                      If you didn't request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 11px; color: #52525b; text-align: center;">
                &copy; ${new Date().getFullYear()} ZIVO LLC. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
      }),
    });
    const emailResult = await emailResponse.json().catch(() => null);

    if (!emailResponse.ok) {
      await markOtpDeliveryFailed(supabase, insertedOtp.id);
      console.error("Failed to send OTP email:", {
        status: emailResponse.status,
        result: emailResult,
        idempotencyKey,
      });
      throw new HttpError(502, "Failed to send verification email");
    }

    console.log("OTP email sent successfully", {
      resendId: typeof emailResult === "object" && emailResult && "id" in emailResult
        ? (emailResult as { id?: string }).id
        : undefined,
      idempotencyKey,
    });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      await markOtpDeliveryFailed(supabase, insertedOtp.id);
      console.error("Failed to send OTP email:", error);
    }
    throw new HttpError(502, "Failed to send verification email");
  }

  return ok(corsHeaders, { success: true, message: "Verification code sent", expiresAt });
}, "send-otp-email");

async function markOtpDeliveryFailed(
  supabase: ReturnType<typeof createClient>,
  otpId: string,
) {
  const { error } = await supabase
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", otpId);

  if (error) {
    console.error("Failed to invalidate undelivered OTP:", error);
  }
}

serve(withSecurity("send-otp-email", handler, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
