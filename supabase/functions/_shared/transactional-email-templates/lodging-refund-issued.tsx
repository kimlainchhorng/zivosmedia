import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  guestName?: string
  propertyName?: string
  reservationNumber?: string
  refundAmount?: string
  paymentMethod?: string
  refundStatus?: string
  expectedDays?: string
}

const Email = ({
  guestName = 'Guest',
  propertyName = 'Your stay',
  reservationNumber = '',
  refundAmount,
  paymentMethod,
  refundStatus = 'in progress',
  expectedDays = '5–10 business days',
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Refund {refundStatus} for your booking at {propertyName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>ZIVO Lodging</Section>
        <Heading style={h1}>Your refund is {refundStatus}</Heading>
        <Text style={text}>
          Hi {guestName}, we've processed the refund for your booking at <strong>{propertyName}</strong>. {refundStatus === 'complete' ? 'The funds have been returned to your original payment method.' : `It usually takes ${expectedDays} for the funds to appear depending on your bank.`}
        </Text>

        <Section style={card}>
          <Text style={kvLabel}>Reservation</Text>
          <Text style={kvValue}>{reservationNumber || '—'}</Text>
          {refundAmount ? <><Hr style={hr} /><Text style={kvLabel}>Refund amount{paymentMethod ? ` (back to ${paymentMethod})` : ''}</Text><Text style={kvValueStrong}>{refundAmount}</Text></> : null}
          <Text style={kvLabel}>Status</Text>
          <Text style={kvValue} className="capitalize">{refundStatus}</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>If you don't see the refund after {expectedDays}, contact us through your trip detail page and we'll help track it down.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (p: Props) => `Refund ${p.refundStatus ?? 'in progress'}${p.reservationNumber ? ` — ${p.reservationNumber}` : ''} · ${p.propertyName ?? 'ZIVO Lodging'}`,
  displayName: 'Lodging refund issued',
  previewData: {
    guestName: 'Alex',
    propertyName: 'Koh Sdach Resort',
    reservationNumber: 'L-2048',
    refundAmount: '$142.00',
    paymentMethod: 'PayPal',
    refundStatus: 'in progress',
    expectedDays: '5–10 business days',
  },
} satisfies TemplateEntry<Props>

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '28px 22px' }
const badge = { color: '#dc2743', fontWeight: 700, fontSize: '13px', marginBottom: '16px' }
const h1 = { color: '#111827', fontSize: '24px', margin: '0 0 14px', lineHeight: '1.25' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '1.6' }
const card = { backgroundColor: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 18px', margin: '16px 0' }
const kvLabel = { color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '8px 0 2px' }
const kvValue = { color: '#111827', fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }
const kvValueStrong = { color: '#111827', fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }
const hr = { borderColor: '#e5e7eb', margin: '12px 0' }
const footer = { color: '#9ca3af', fontSize: '11px', lineHeight: '1.5', marginTop: '12px' }
