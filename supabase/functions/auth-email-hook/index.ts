import * as React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@2.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = "ZIVO LLC"
const SENDER_DOMAIN = "send.zivosmedia.com"
const ROOT_DOMAIN = "www.zivosmedia.com"
const FROM_DOMAIN = "zivosmedia.com"

const SAMPLE_PROJECT_URL = "https://www.zivosmedia.com"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  magiclink: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  recovery: { siteName: SITE_NAME, confirmationUrl: SAMPLE_PROJECT_URL },
  invite: { siteName: SITE_NAME, siteUrl: SAMPLE_PROJECT_URL, confirmationUrl: SAMPLE_PROJECT_URL },
  email_change: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: SAMPLE_EMAIL, confirmationUrl: SAMPLE_PROJECT_URL },
  reauthentication: { token: '123456' },
}

function normalizeConfirmationUrl(rawUrl: string, emailType: string): string {
  try {
    const parsedUrl = new URL(rawUrl)
    if (emailType === 'recovery') {
      parsedUrl.protocol = 'https:'
      parsedUrl.hostname = ROOT_DOMAIN
      parsedUrl.pathname = '/reset-password'
    }
    return parsedUrl.toString()
  } catch {
    if (emailType === 'recovery') return `https://${ROOT_DOMAIN}/reset-password`
    return rawUrl
  }
}

// Simple timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

// Preview endpoint — returns rendered HTML without sending
async function handlePreview(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')
  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const html = await renderAsync(React.createElement(EmailTemplate, SAMPLE_DATA[type] || {}))
  return new Response(html, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } })
}

// Main webhook handler — sends auth emails via Resend
async function handleWebhook(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  // Auth: accept SUPABASE_AUTH_HOOK_SECRET (set in Supabase hook config) or
  // LOVABLE_API_KEY as fallback. Skip check only if neither secret is configured.
  const hookSecret = Deno.env.get('SUPABASE_AUTH_HOOK_SECRET') || Deno.env.get('LOVABLE_API_KEY')
  if (hookSecret) {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? ''
    if (!timingSafeEqual(token, hookSecret)) {
      console.error('Auth email hook: unauthorized request')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse payload — support both Supabase native hook format and Lovable format
  let emailType: string
  let userEmail: string
  let confirmationUrl: string
  let token: string | undefined
  let newEmail: string | undefined

  if (body.email_data?.email_action_type) {
    // Supabase native Send Email hook format:
    // { user: { email }, email_data: { email_action_type, token, redirect_to, email_new, ... } }
    emailType = body.email_data.email_action_type
    userEmail = body.user?.email || body.email_data?.email || ''
    confirmationUrl = normalizeConfirmationUrl(body.email_data.redirect_to || '', emailType)
    token = body.email_data.token
    newEmail = body.email_data.email_new
  } else if (body.data?.action_type) {
    // Lovable webhook format
    emailType = body.data.action_type
    userEmail = body.data.email || ''
    confirmationUrl = normalizeConfirmationUrl(body.data.url || '', emailType)
    token = body.data.token
    newEmail = body.data.new_email
  } else {
    console.error('Auth email hook: unknown payload format', { keys: Object.keys(body) })
    return new Response(JSON.stringify({ error: 'Unknown payload format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!userEmail) {
    console.error('Auth email hook: missing recipient email', { emailType })
    return new Response(JSON.stringify({ error: 'Missing recipient email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Auth email hook: unknown email type', { emailType })
    return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email hook: sending', { emailType, to: userEmail })

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: userEmail,
    confirmationUrl,
    token,
    email: userEmail,
    newEmail,
  }

  const [html, text] = await Promise.all([
    renderAsync(React.createElement(EmailTemplate, templateProps)),
    renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true }),
  ])

  const resend = new Resend(resendApiKey)
  const { error: sendError } = await resend.emails.send({
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    to: [userEmail],
    subject: EMAIL_SUBJECTS[emailType] || 'Notification',
    html,
    text,
    headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
  })

  if (sendError) {
    console.error('Auth email hook: Resend send failed', { error: sendError, emailType, to: userEmail })

    // Best-effort log to DB (non-fatal — don't let a DB error mask the send error)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      await supabase.from('email_send_log').insert({
        message_id: crypto.randomUUID(),
        template_name: emailType,
        recipient_email: userEmail,
        status: 'failed',
        error_message: typeof sendError === 'object' ? JSON.stringify(sendError) : String(sendError),
      })
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email hook: sent successfully', { emailType, to: userEmail })

  // Best-effort success log
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    await supabase.from('email_send_log').insert({
      message_id: crypto.randomUUID(),
      template_name: emailType,
      recipient_email: userEmail,
      status: 'sent',
    })
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(withSecurity("auth-email-hook", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  if (url.pathname.endsWith('/preview')) return handlePreview(req, corsHeaders)

  try {
    return await handleWebhook(req, corsHeaders)
  } catch (error) {
    console.error('Auth email hook: unhandled error', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}, { rateLimit: "api_general", strictCors: true, allowedMethods: ["POST"], skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }))
