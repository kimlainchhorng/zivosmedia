import { createClient } from "../_shared/deps.ts";
import { WebhookError, verifyWebhookRequest } from 'npm:@lovable.dev/webhooks-js'
import { Webhook } from 'npm:svix@1.76.0'
import { withSecurity } from "../_shared/withSecurity.ts";

type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe' | 'provider_suppressed'

// Suppression event payload sent by the Go API when Mailgun reports
// a bounce, complaint, or unsubscribe. Kept for backwards compatibility.
interface SuppressionPayload {
  email: string
  reason: SuppressionReason
  message_id?: string
  metadata?: Record<string, unknown>
  is_retry: boolean
  retry_count: number
}

interface ResendWebhookEvent {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    from?: string
    to?: string[]
    subject?: string
    template_id?: string
    tags?: Record<string, string>
    bounce?: Record<string, unknown>
  }
}

function parseSuppressionPayload(body: string): SuppressionPayload {
  const parsed = JSON.parse(body)
  if (!parsed.data) {
    throw new Error('Missing data field in payload')
  }
  const data = parsed.data as SuppressionPayload
  if (!data.email || !data.reason) {
    throw new Error('Missing required fields: email, reason')
  }
  return data
}

function parseResendWebhookEvent(event: ResendWebhookEvent, svixId: string | null): SuppressionPayload[] {
  const eventType = event.type
  const data = event.data ?? {}
  const recipients = Array.isArray(data.to) ? data.to.filter((email) => typeof email === 'string' && email.includes('@')) : []

  if (!recipients.length) {
    throw new Error('Missing recipient email in Resend webhook payload')
  }

  const reason = mapResendEventToReason(eventType)
  if (!reason) return []

  return recipients.map((email) => ({
    email,
    reason,
    message_id: data.email_id ?? svixId ?? undefined,
    metadata: {
      provider: 'resend',
      event_type: eventType,
      event_created_at: event.created_at ?? null,
      svix_id: svixId,
      from: data.from ?? null,
      subject: data.subject ?? null,
      template_id: data.template_id ?? null,
      tags: data.tags ?? null,
      bounce: data.bounce ?? null,
    },
    is_retry: false,
    retry_count: 0,
  }))
}

function mapResendEventToReason(eventType: string): SuppressionReason | null {
  switch (eventType) {
    case 'email.bounced':
      return 'bounce'
    case 'email.complained':
      return 'complaint'
    case 'email.suppressed':
      return 'provider_suppressed'
    default:
      return null
  }
}

function jsonResponse(data: Record<string, unknown>, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(withSecurity("handle-email-suppression", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, corsHeaders, 405)
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendWebhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, corsHeaders, 500)
  }

  let payloads: SuppressionPayload[]
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (svixId || svixTimestamp || svixSignature) {
    if (!resendWebhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET is not configured')
      return jsonResponse({ error: 'Webhook secret not configured' }, corsHeaders, 500)
    }

    try {
      const body = await req.text()
      const wh = new Webhook(resendWebhookSecret)
      const event = wh.verify(body, {
        'svix-id': svixId ?? '',
        'svix-timestamp': svixTimestamp ?? '',
        'svix-signature': svixSignature ?? '',
      }) as ResendWebhookEvent
      payloads = parseResendWebhookEvent(event, svixId)
    } catch (error) {
      console.error('Invalid Resend webhook signature or payload', { error })
      return jsonResponse({ error: 'Invalid signature' }, corsHeaders, 401)
    }
  } else {
    if (!apiKey) {
      console.error('LOVABLE_API_KEY is not configured')
      return jsonResponse({ error: 'Webhook secret not configured' }, corsHeaders, 500)
    }

    // Verify HMAC signature using the Lovable API Key (same as auth-email-hook)
    try {
      const verified = await verifyWebhookRequest({
        req,
        secret: apiKey,
        parser: parseSuppressionPayload,
      })
      payloads = [verified.payload]
    } catch (error) {
      if (error instanceof WebhookError) {
        switch (error.code) {
          case 'invalid_signature':
            console.error('Invalid webhook signature')
            return jsonResponse({ error: 'Invalid signature' }, corsHeaders, 401)
          case 'stale_timestamp':
            console.error('Stale webhook timestamp')
            return jsonResponse({ error: 'Stale timestamp' }, corsHeaders, 401)
          case 'invalid_payload':
          case 'invalid_json':
            console.error('Invalid payload', { code: error.code })
            return jsonResponse({ error: 'Invalid payload' }, corsHeaders, 400)
          default:
            console.error('Webhook verification failed', {
              code: error.code,
              message: error.message,
            })
            return jsonResponse({ error: 'Verification failed' }, corsHeaders, 401)
        }
      }
      console.error('Unexpected error during verification', { error })
      return jsonResponse({ error: 'Internal error' }, corsHeaders, 500)
    }
  }

  if (!payloads.length) {
    return jsonResponse({ success: true, ignored: true }, corsHeaders)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  for (const payload of payloads) {
    const normalizedEmail = payload.email.toLowerCase()

    // 1. Upsert to suppressed_emails (idempotent — safe for retries)
    const { error: suppressError } = await supabase
      .from('suppressed_emails')
      .upsert(
        {
          email: normalizedEmail,
          reason: payload.reason,
          metadata: payload.metadata ?? null,
        },
        { onConflict: 'email' },
      )

    if (suppressError) {
      console.error('Failed to upsert suppressed email', {
        error: suppressError,
        email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
      })
      return jsonResponse({ error: 'Failed to write suppression' }, corsHeaders, 500)
    }

    // 2. Append a new log entry for the suppression event (never update existing rows)
    const sendLogStatus = mapReasonToStatus(payload.reason)
    const sendLogMessage = mapReasonToMessage(payload.reason)

    const { error: insertError } = await supabase
      .from('email_send_log')
      .insert({
        message_id: payload.message_id ?? null,
        template_name: 'system',
        recipient_email: normalizedEmail,
        status: sendLogStatus,
        error_message: sendLogMessage,
        metadata: payload.metadata ?? null,
      })

    if (insertError) {
      // Non-fatal — log and continue. The suppression was already recorded.
      console.warn('Failed to insert email_send_log', {
        error: insertError,
      })
    }

    console.log('Suppression processed', {
      email_redacted: normalizedEmail[0] + '***@' + normalizedEmail.split('@')[1],
      reason: payload.reason,
      is_retry: payload.is_retry,
      retry_count: payload.retry_count,
      has_message_id: !!payload.message_id,
    })
  }

  return jsonResponse({ success: true, processed: payloads.length }, corsHeaders)
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true, skipWaf: true }))

function mapReasonToStatus(
  reason: string,
): 'bounced' | 'complained' | 'suppressed' {
  switch (reason) {
    case 'bounce':
      return 'bounced'
    case 'complaint':
      return 'complained'
    case 'provider_suppressed':
      return 'suppressed'
    default:
      return 'suppressed'
  }
}

function mapReasonToMessage(reason: string): string {
  switch (reason) {
    case 'bounce':
      return 'Permanent bounce — email address is invalid or rejected'
    case 'complaint':
      return 'Spam complaint — recipient marked email as spam'
    case 'provider_suppressed':
      return 'Provider suppression — Resend blocked delivery to protect sender reputation'
    case 'unsubscribe':
      return 'Recipient unsubscribed'
    default:
      return 'Email suppressed'
  }
}
