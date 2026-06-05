/**
 * send-otp-email — issues a 6-digit OTP and emails it via Resend.
 *
 * Public endpoint (caller is unauthenticated). Uses shared toolkit for CORS,
 * Zod-style validation, and standardized error envelopes. Success response
 * shape preserved: { success: true, message, expiresAt }.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { Resend } from "npm:resend@2.0.0";
import { withSecurity } from "../_shared/withSecurity.ts";
import { withErrorHandling, HttpError } from "../_shared/errors.ts";
import { parseBody, v } from "../_shared/validate.ts";
import { ok, preflight } from "../_shared/respond.ts";
import type { SecurityContext } from "../_shared/withSecurity.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const Body = v.object({
  email: v.email,
  userId: v.optionalString,
});

const SITE_NAME = "ZIVO";
const FROM_DOMAIN = "zivosmedia.com";

function generateOtpCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
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

  const body = await parseBody(req, Body);
  const email = (body.email as string).trim().toLowerCase();
  const userId = (body.userId as string | undefined) ?? null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    throw new HttpError(500, "Server configuration error");
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate existing pending codes for this email
  await supabase
    .from("otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("email", email)
    .is("verified_at", null);

  const { error: insertError } = await supabase
    .from("otp_codes")
    .insert({
      email,
      user_id: userId,
      code,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("Failed to store OTP:", insertError);
    throw new HttpError(500, "Failed to generate verification code");
  }

  const { html, text } = renderOtpEmail(code, expiresAt);
  const emailResponse = await resend.emails.send({
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    to: [email],
    subject: "Your ZIVO verification code",
    html,
    text,
  });

  if (emailResponse.error) {
    console.error("Failed to send OTP email:", emailResponse.error);
    throw new HttpError(502, "Failed to send verification email");
  }

  console.log("OTP email sent successfully", { resendId: emailResponse.data?.id });

  return ok(corsHeaders, { success: true, message: "Verification code sent", expiresAt });
}, "send-otp-email");

serve(withSecurity("send-otp-email", handler, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "auth_otp",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
