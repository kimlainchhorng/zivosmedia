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

interface CountryChangeProps {
  identifier?: string
  detectedAt?: string
  priorCountry?: string
  newCountry?: string
  manageSecurityUrl?: string
  notMeUrl?: string
}

const main = {
  backgroundColor: '#f6f7fb',
  fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  padding: '32px 0',
}

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '480px',
  margin: '0 auto',
  padding: '40px 32px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
}

const heading = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 8px', textAlign: 'center' as const }
const paragraph = { fontSize: '14px', lineHeight: '1.6', color: '#4a4a4a', margin: '0 0 16px' }
const detail = { fontSize: '13px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#6b7280', margin: '4px 0' }
const buttonPrimary = { backgroundColor: '#dc2626', borderRadius: '8px', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 24px', margin: '8px 0' }
const buttonSecondary = { backgroundColor: '#f3f4f6', borderRadius: '8px', color: '#1f2937', fontSize: '14px', fontWeight: '500' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '10px 24px', margin: '8px 0' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', textAlign: 'center' as const, margin: '0' }

function CountryChangeEmail({
  identifier = 'you@example.com',
  detectedAt = new Date().toISOString(),
  priorCountry = 'US',
  newCountry = 'XX',
  manageSecurityUrl = 'https://hizivo.com/account/security',
  notMeUrl = 'https://hizivo.com/account/security?action=lock',
}: CountryChangeProps) {
  const niceDate = (() => { try { return new Date(detectedAt).toLocaleString() } catch { return detectedAt } })()
  return (
    <Html>
      <Head />
      <Preview>Sign-in from a new country to your ZIVO account</Preview>
      <Body style={main}>
        <Container style={card}>
          <Heading style={heading}>🌍 Sign-in from a new country</Heading>
          <Text style={paragraph}>
            Your ZIVO account <strong>{identifier}</strong> was just signed in to from a country you
            haven&apos;t used before. If you&apos;re traveling, you can ignore this email.
          </Text>
          <Section style={{ marginTop: '8px', marginBottom: '16px' }}>
            <Text style={detail}>When: {niceDate}</Text>
            <Text style={detail}>Previous country: {priorCountry}</Text>
            <Text style={detail}>New country: {newCountry}</Text>
          </Section>
          <Text style={paragraph}>
            <strong>If this wasn&apos;t you</strong>, your password may be compromised. Lock your
            account and change your password now:
          </Text>
          <Button href={notMeUrl} style={buttonPrimary}>This wasn&apos;t me — lock my account</Button>
          <Button href={manageSecurityUrl} style={buttonSecondary}>Review my security settings</Button>
          <Hr style={hr} />
          <Text style={footer}>
            Tip: turn on two-factor authentication so attackers can&apos;t sign in with just your password.
          </Text>
          <Text style={footer}>© {new Date().getFullYear()} ZIVO · hizivo.com</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry<CountryChangeProps> = {
  component: CountryChangeEmail,
  subject: () => 'Sign-in from a new country to your ZIVO account',
  displayName: 'Country change login',
  previewData: {
    identifier: 'jane@example.com',
    detectedAt: new Date().toISOString(),
    priorCountry: 'US',
    newCountry: 'KH',
    manageSecurityUrl: 'https://hizivo.com/account/security',
    notMeUrl: 'https://hizivo.com/account/security?action=lock',
  },
}
