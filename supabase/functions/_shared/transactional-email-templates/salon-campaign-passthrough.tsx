/**
 * salon-campaign-passthrough
 * --------------------------
 * Wraps an owner-authored campaign body in the standard ZIVO email chrome.
 * Unlike `notification-generic` (which renders body as plain <Text>), this
 * template renders the body as HTML — the owner composes their own paragraphs,
 * links, line breaks in the salon admin's campaign editor, and we honor that.
 *
 * SECURITY NOTE: body_html comes from an authenticated salon owner via RLS-
 * protected writes to salon_campaigns.body_html (which has a length cap).
 * Email clients are not a sufficient security boundary, so the body is
 * reduced to a small formatting/link allowlist before React renders it.
 */
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  subject?: string
  body_html?: string
  salon_name?: string
  /** Unsubscribe link the recipient can click — defaults to a placeholder. */
  unsubscribe_url?: string
}

const CAMPAIGN_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'blockquote', 'a',
])
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const decodeBasicEntities = (value: string): string => value
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const safeHref = (value: string): string | null => {
  const decoded = decodeBasicEntities(value).trim()
  if (!decoded || /[\u0000-\u001f\u007f]/.test(decoded)) return null
  try {
    const url = new URL(decoded)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? decoded : null
  } catch {
    return null
  }
}

const readHref = (attributes: string): string | null => {
  const match = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)
  return safeHref(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
}

const sanitizeCampaignHtml = (html: string): string => {
  const input = String(html ?? '').slice(0, 20000)
  const tokenPattern = /<!--[\s\S]*?-->|<[^>]*>/g
  let cursor = 0
  let output = ''

  for (const match of input.matchAll(tokenPattern)) {
    const token = match[0]
    const index = match.index ?? 0
    output += escapeHtml(input.slice(cursor, index))
    cursor = index + token.length

    if (token.startsWith('<!--')) continue
    const tag = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b([\s\S]*?)\/?>$/i)
    if (!tag) continue

    const closing = Boolean(tag[1])
    const name = tag[2].toLowerCase()
    if (!CAMPAIGN_TAGS.has(name)) continue
    if (closing) {
      output += `</${name}>`
      continue
    }
    if (name === 'br') {
      output += '<br />'
    } else if (name === 'a') {
      const href = readHref(tag[3])
      if (href) output += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`
    } else {
      output += `<${name}>`
    }
  }

  return output + escapeHtml(input.slice(cursor))
}

const Email = ({
  subject = 'A message from your salon',
  body_html = '',
  salon_name = 'your salon',
  unsubscribe_url,
}: Props) => {
  const safeHtml = sanitizeCampaignHtml(body_html)
  const safeUnsubscribeUrl = unsubscribe_url ? safeHref(unsubscribe_url) : null
  return (
    <Html lang="en">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge}>{salon_name}</Section>
          <Heading style={h1}>{subject}</Heading>
          <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: safeHtml }} />
          <Hr style={hr} />
          <Text style={meta}>
            You're receiving this because you opted in to marketing offers from {salon_name}.
            {safeUnsubscribeUrl ? (
              <>
                {' '}
                <a href={safeUnsubscribeUrl} style={metaLink}>Unsubscribe</a>.
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f7f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  margin: 0,
  padding: '32px 0',
}
const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  margin: '0 auto',
  padding: '32px',
  maxWidth: 560,
}
const badge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#7a51a8',
  marginBottom: 16,
}
const h1: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#0b0a0d',
  margin: '0 0 16px',
}
const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.55,
  color: '#1f2937',
}
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0 12px',
}
const meta: React.CSSProperties = {
  fontSize: 11,
  color: '#6b7280',
  lineHeight: 1.5,
}
const metaLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'underline',
}

export const template: TemplateEntry<Props> = {
  component: Email,
  subject: (props) => props.subject || 'A message from your salon',
  displayName: 'Salon — Campaign passthrough',
  previewData: {
    subject: 'A special offer from your salon',
    body_html: '<p>Hi <strong>Sam</strong>,</p><p>Book a visit this weekend and get 20% off your favorite service.</p>',
    salon_name: 'Demo Salon',
  },
}
