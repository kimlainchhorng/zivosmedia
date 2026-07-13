import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  guestName?: string
  propertyName?: string
  reservationNumber?: string
  checkIn?: string
  checkOut?: string
  nights?: number
  guestsCount?: number
  paidAmount?: string
  paymentMethod?: string
  hostPhone?: string
  manageUrl?: string
  message?: string
}

const Email = ({
  guestName = 'Guest',
  propertyName = 'Your stay',
  reservationNumber = '',
  checkIn,
  checkOut,
  nights,
  guestsCount,
  paidAmount,
  paymentMethod,
  hostPhone,
  manageUrl,
  message,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your booking at {propertyName} is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>ZIVO Lodging</Section>
        <Heading style={h1}>You're booked at {propertyName}</Heading>
        <Text style={text}>
          Hi {guestName}, {message || 'we received your payment and locked in your stay. Save this email — you may need the reservation number at check-in.'}
        </Text>

        <Section style={card}>
          <Text style={kvLabel}>Reservation</Text>
          <Text style={kvValue}>{reservationNumber || '—'}</Text>
          <Hr style={hr} />
          <Text style={kvLabel}>Check-in</Text>
          <Text style={kvValue}>{checkIn || '—'}</Text>
          <Text style={kvLabel}>Check-out</Text>
          <Text style={kvValue}>{checkOut || '—'}</Text>
          {nights ? <><Text style={kvLabel}>Nights</Text><Text style={kvValue}>{nights}</Text></> : null}
          {guestsCount ? <><Text style={kvLabel}>Guests</Text><Text style={kvValue}>{guestsCount}</Text></> : null}
          {paidAmount ? <><Hr style={hr} /><Text style={kvLabel}>Paid {paymentMethod ? `via ${paymentMethod}` : ''}</Text><Text style={kvValueStrong}>{paidAmount}</Text></> : null}
        </Section>

        {manageUrl ? (
          <Section style={ctaSection}>
            <Button href={manageUrl} style={button}>Manage your booking</Button>
          </Section>
        ) : null}

        {hostPhone ? (
          <Text style={small}>Need to reach the property? <strong>{hostPhone}</strong></Text>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>ZIVO is the marketplace; the property is the merchant of record for your stay. You can cancel from your trip detail page subject to the cancellation policy you accepted at booking.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (p: Props) => `Booking confirmed${p.reservationNumber ? ` — ${p.reservationNumber}` : ''} · ${p.propertyName ?? 'Your stay'}`,
  displayName: 'Lodging booking confirmed',
  previewData: {
    guestName: 'Alex',
    propertyName: 'Koh Sdach Resort',
    reservationNumber: 'L-2048',
    checkIn: 'Apr 24, 2026',
    checkOut: 'Apr 27, 2026',
    nights: 3,
    guestsCount: 2,
    paidAmount: '$284.00',
    paymentMethod: 'PayPal',
    hostPhone: '+855 12 345 678',
    manageUrl: 'https://hizivo.com/trips',
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
const ctaSection = { textAlign: 'center' as const, margin: '20px 0 8px' }
const button = { backgroundColor: '#111827', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }
const small = { color: '#4b5563', fontSize: '13px', lineHeight: '1.5', marginTop: '8px' }
const footer = { color: '#9ca3af', fontSize: '11px', lineHeight: '1.5', marginTop: '12px' }
