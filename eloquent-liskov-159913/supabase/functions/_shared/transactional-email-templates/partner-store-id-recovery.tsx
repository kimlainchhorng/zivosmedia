/// <reference types="npm:@types/react@18.3.1" />
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

interface StoreSummary {
  name?: string
  accountId?: string
}

interface PartnerStoreIdRecoveryProps {
  businessEmail?: string
  stores?: StoreSummary[]
  loginUrl?: string
  supportUrl?: string
}

const main = {
  backgroundColor: '#f6f7fb',
  fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  padding: '32px 0',
}

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '32px',
  boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
}

const brandPill = {
  display: 'inline-block',
  backgroundColor: '#16a34a',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}

const title = {
  color: '#0f172a',
  fontSize: '28px',
  lineHeight: '1.2',
  fontWeight: '800',
  margin: '18px 0 10px',
}

const text = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 16px',
}

const storeCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '18px 20px',
  marginBottom: '14px',
}

const accountCode = {
  display: 'inline-block',
  marginTop: '10px',
  backgroundColor: '#052e16',
  color: '#86efac',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '18px',
  fontWeight: '800',
  letterSpacing: '0.08em',
  fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
}

const cta = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  borderRadius: '12px',
  padding: '14px 22px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
}

function PartnerStoreIdRecoveryEmail({
  businessEmail = 'partner@hizivo.com',
  stores = [{ name: 'Mommy Seafood', accountId: 'CBD0013F47A' }],
  loginUrl = 'https://hizivo.com/partner-login',
  supportUrl = 'https://hizivo.com/help',
}: PartnerStoreIdRecoveryProps) {
  return (
    <Html>
      <Head />
      <Preview>Your ZIVO Store Account ID is ready</Preview>
      <Body style={main}>
        <Container style={card}>
          <Text style={brandPill}>ZIVO Partner</Text>
          <Heading style={title}>Here is your Store Account ID</Heading>
          <Text style={text}>
            We received a Store ID recovery request for <strong>{businessEmail}</strong>.
            Use the account ID below to sign in to your ZIVO partner dashboard.
          </Text>

          <Section>
            {stores.map((store, index) => (
              <Section key={`${store.accountId ?? 'store'}-${index}`} style={storeCard}>
                <Text style={{ ...text, margin: 0, fontWeight: '700', color: '#0f172a' }}>
                  {store.name || `Store ${index + 1}`}
                </Text>
                <Text style={accountCode}>{store.accountId || 'CBD00000000'}</Text>
              </Section>
            ))}
          </Section>

          <Text style={text}>
            Tip: on the login screen you can enter the code exactly as shown above.
          </Text>

          <Section style={{ textAlign: 'center', margin: '28px 0 24px' }}>
            <Button href={loginUrl} style={cta}>Open Partner Sign In</Button>
          </Section>

          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

          <Text style={{ ...text, fontSize: '13px', marginBottom: '8px' }}>
            If you did not request this email, you can ignore it.
          </Text>
          <Text style={{ ...text, fontSize: '13px', marginBottom: 0 }}>
            Need help? Visit <a href={supportUrl} style={{ color: '#16a34a' }}>ZIVO Support</a>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PartnerStoreIdRecoveryEmail,
  subject: (props: PartnerStoreIdRecoveryProps) => {
    const firstStore = props.stores?.[0]?.accountId
    return firstStore
      ? `Your ZIVO Store Account ID: ${firstStore}`
      : 'Your ZIVO Store Account ID'
  },
  displayName: 'Partner store ID recovery',
  previewData: {
    businessEmail: 'kimlain@hizivo.com',
    stores: [{ name: 'Mommy Seafood ម៉ាមី ស៊ីហ៊្វូត', accountId: 'CBD0013F47A' }],
    loginUrl: 'https://hizivo.com/partner-login',
    supportUrl: 'https://hizivo.com/help',
  },
} satisfies TemplateEntry<PartnerStoreIdRecoveryProps>
