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

interface EmployeeInviteProps {
  email?: string
  role?: string
  loginUrl?: string
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

const heading = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#1a1a1a',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#4a4a4a',
  margin: '0 0 16px',
}

const roleTag = {
  display: 'inline-block',
  backgroundColor: '#e8f5e9',
  color: '#2e7d32',
  padding: '4px 12px',
  borderRadius: '16px',
  fontSize: '13px',
  fontWeight: '600' as const,
}

const buttonStyle = {
  backgroundColor: '#16a34a',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#999',
  textAlign: 'center' as const,
  margin: '0',
}

function EmployeeInviteEmail({
  email = 'employee@example.com',
  role = 'support',
  loginUrl = 'https://hizivo.com/auth',
}: EmployeeInviteProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join ZIVO as {role}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Heading style={heading}>🎉 You're Invited to ZIVO</Heading>
          <Text style={paragraph}>
            Hello! You've been invited to join the <strong>ZIVO</strong> team as a staff member.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '16px 0' }}>
            <Text style={{ ...paragraph, margin: '0 0 4px' }}>Your assigned role:</Text>
            <span style={roleTag}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
          </Section>
          <Text style={paragraph}>
            To get started, sign in or create your account using the email address <strong>{email}</strong>. 
            Your role will be assigned automatically once you sign in.
          </Text>
          <Button href={loginUrl} style={buttonStyle}>
            Sign In to ZIVO
          </Button>
          <Hr style={hr} />
          <Text style={footer}>
            This invitation was sent by ZIVO Admin. If you didn't expect this, you can ignore this email.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} ZIVO · hizivo.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry<EmployeeInviteProps> = {
  component: EmployeeInviteEmail,
  subject: (props) => `You're invited to join ZIVO as ${props?.role || 'staff'}`,
  displayName: 'Employee Invitation',
  previewData: {
    email: 'newemployee@example.com',
    role: 'moderator',
    loginUrl: 'https://hizivo.com/auth',
  },
}
