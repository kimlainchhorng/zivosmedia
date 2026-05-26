/**
 * notification-generic
 * --------------------
 * Fallback transactional email used by notify-dispatch whenever an event
 * fires that doesn't have its own bespoke template (e.g. ride status,
 * marketplace order updates, creator subscriber events). Renders the
 * dispatcher's `title` and `body` as a clean branded email so users still
 * receive the message rather than us silently dropping it.
 *
 * The dispatcher already passes `title`, `body`, `event_type`, and any deep
 * link `url` in templateData, so this template just needs to surface them.
 */
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  title?: string
  body?: string
  url?: string
  event_type?: string
}

const PUBLIC_URL =
  Deno.env.get('SITE_URL') ?? 'https://hizovo.com'

const Email = ({ title = 'New notification', body, url, event_type }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>ZIVO</Section>
        <Heading style={h1}>{title}</Heading>
        {body ? <Text style={text}>{body}</Text> : null}

        {url ? (
          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button
              href={url.startsWith('http') ? url : `${PUBLIC_URL}${url}`}
              style={button}
            >
              Open in Zivo
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={meta}>
          You're receiving this because you have notifications enabled for this
          activity. Manage your preferences in the app under Settings →
          Notifications.
        </Text>
        {event_type ? (
          <Text style={metaTiny}>Event: {event_type}</Text>
        ) : null}
      </Container>
    </Body>
  </Html>
)

const main: React.CSSProperties = {
  backgroundColor: '#f6f7f9',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  margin: 0,
  padding: '32px 0',
}
const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  margin: '0 auto',
  maxWidth: 560,
  padding: '32px 28px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}
const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#111827',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  padding: '6px 10px',
  borderRadius: 999,
  marginBottom: 18,
}
const h1: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 22,
  fontWeight: 700,
  margin: '0 0 8px',
  lineHeight: 1.3,
}
const text: React.CSSProperties = {
  color: '#334155',
  fontSize: 15,
  lineHeight: 1.55,
  margin: '8px 0 0',
}
const button: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  borderRadius: 10,
  display: 'inline-block',
  fontSize: 14,
  fontWeight: 600,
  padding: '12px 22px',
  textDecoration: 'none',
}
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '28px 0 16px',
}
const meta: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.5,
  margin: 0,
}
const metaTiny: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 11,
  margin: '8px 0 0',
}

export const template: TemplateEntry<Props> = {
  component: Email,
  subject: (props) => props.title || 'Zivo notification',
  displayName: 'Generic notification',
  previewData: {
    title: 'Your order has shipped',
    body: 'The seller dropped your package off with the courier just now.',
    url: '/marketplace',
    event_type: 'marketplace_order_shipped',
  },
}
