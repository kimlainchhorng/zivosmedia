import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  storeName?: string
  orderId?: string
  deliveryAddress?: string
  totalAmount?: string
  paymentMethod?: string
  trackUrl?: string
}

const Email = ({
  storeName = 'your store',
  orderId = '',
  deliveryAddress,
  totalAmount,
  paymentMethod,
  trackUrl,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Order confirmed at {storeName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>ZIVO Grocery</Section>
        <Heading style={h1}>Your shopping is on 🛒</Heading>
        <Text style={text}>
          We received your payment and a ZIVO shopper is being matched to fulfil your order at <strong>{storeName}</strong>.
        </Text>

        <Section style={card}>
          <Text style={kvLabel}>Order</Text>
          <Text style={kvValue}>{orderId.slice(0, 8) || '—'}</Text>
          <Hr style={hr} />
          <Text style={kvLabel}>Store</Text>
          <Text style={kvValue}>{storeName}</Text>
          {deliveryAddress ? <><Text style={kvLabel}>Delivering to</Text><Text style={kvValue}>{deliveryAddress}</Text></> : null}
          {totalAmount ? <><Hr style={hr} /><Text style={kvLabel}>Paid {paymentMethod ? `via ${paymentMethod}` : ''}</Text><Text style={kvValueStrong}>{totalAmount}</Text></> : null}
        </Section>

        {trackUrl ? (
          <Section style={ctaSection}>
            <Button href={trackUrl} style={button}>Track your order</Button>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>You can cancel from the order tracking page until shopping starts. Refunds go back to the same payment method.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (p: Props) => `Order confirmed${p.orderId ? ` — ${p.orderId.slice(0, 8)}` : ''} · ${p.storeName ?? 'ZIVO Grocery'}`,
  displayName: 'Grocery order confirmed',
  previewData: {
    storeName: 'Costco Phnom Penh',
    orderId: 'abcd1234',
    deliveryAddress: '123 Riverside, Phnom Penh',
    totalAmount: '$54.20',
    paymentMethod: 'Card',
    trackUrl: 'https://hizivo.com/grocery/track/abc',
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
const footer = { color: '#9ca3af', fontSize: '11px', lineHeight: '1.5', marginTop: '12px' }
