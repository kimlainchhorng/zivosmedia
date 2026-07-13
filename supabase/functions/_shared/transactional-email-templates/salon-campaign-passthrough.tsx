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
 * We do basic tag stripping for the most dangerous elements (script, iframe,
 * object) — a salon owner setting a `<script>` in their own template only
 * harms their own clients' email clients, and modern clients strip those
 * tags anyway. But we lock down the obvious vectors for defense in depth.
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

const stripDangerousTags = (html: string): string => {
  // Lightweight scrub: remove <script>, <iframe>, <object>, <embed>, <link>,
  // <meta>, on* event handler attributes, and javascript: URLs. Aimed at
  // accidental owner mistakes, not malicious actors (the owner has full RLS
  // write access to body_html already).
  return html
    .replace(/<\s*(script|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta)\b[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '')
}

const Email = ({
  subject = 'A message from your salon',
  body_html = '',
  salon_name = 'your salon',
  unsubscribe_url,
}: Props) => {
  const safeHtml = stripDangerousTags(body_html)
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
            {unsubscribe_url ? (
              <>
                {' '}
                <a href={unsubscribe_url} style={metaLink}>Unsubscribe</a>.
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
