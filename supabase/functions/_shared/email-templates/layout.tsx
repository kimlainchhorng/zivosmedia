/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface AuthEmailShellProps {
  preview: string
  children: React.ReactNode
}

export function AuthEmailShell({ preview, children }: AuthEmailShellProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.main}>
        <Container style={styles.outer}>
          <Section style={styles.brandRow}>
            <Text style={styles.brandMark}>Z</Text>
            <Text style={styles.brandName}>ZIVO</Text>
          </Section>
          <Container style={styles.card}>{children}</Container>
          <Text style={styles.legal}>
            ZIVO LLC · Secure account email · zivosmedia.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const styles = {
  main: {
    margin: 0,
    backgroundColor: '#f8fafc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  outer: {
    width: '100%',
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 18px',
  },
  brandRow: {
    textAlign: 'center' as const,
    marginBottom: '18px',
  },
  brandMark: {
    display: 'inline-block',
    width: '46px',
    height: '46px',
    lineHeight: '46px',
    margin: '0 auto 8px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg,#111827 0%,#0f766e 62%,#38bdf8 100%)',
    color: '#ffffff',
    fontSize: '27px',
    fontWeight: 900,
    textAlign: 'center' as const,
  },
  brandName: {
    margin: '0',
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 900,
    letterSpacing: '0.24em',
    textAlign: 'center' as const,
  },
  card: {
    overflow: 'hidden',
    borderRadius: '22px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    padding: '34px 30px',
    boxShadow: '0 18px 45px rgba(15,23,42,0.08)',
  },
  eyebrow: {
    margin: '0 0 10px',
    color: '#0f766e',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  },
  h1: {
    margin: '0 0 14px',
    color: '#0f172a',
    fontSize: '26px',
    lineHeight: '1.18',
    fontWeight: 900,
  },
  text: {
    margin: '0 0 18px',
    color: '#475569',
    fontSize: '15px',
    lineHeight: '1.6',
  },
  button: {
    display: 'inline-block',
    margin: '8px 0 20px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg,#111827 0%,#0f766e 100%)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 800,
    padding: '14px 22px',
    textDecoration: 'none',
  },
  code: {
    margin: '8px 0 22px',
    borderRadius: '18px',
    border: '1px solid #dbeafe',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: '"SF Mono", Consolas, Monaco, monospace',
    fontSize: '32px',
    fontWeight: 900,
    letterSpacing: '0.28em',
    lineHeight: '1',
    padding: '22px 18px',
    textAlign: 'center' as const,
  },
  link: {
    color: '#0f766e',
    fontWeight: 700,
    textDecoration: 'underline',
  },
  footer: {
    margin: '18px 0 0',
    borderTop: '1px solid #e5e7eb',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: '1.55',
    paddingTop: '18px',
  },
  legal: {
    margin: '18px 0 0',
    color: '#94a3b8',
    fontSize: '11px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
  },
} as const
