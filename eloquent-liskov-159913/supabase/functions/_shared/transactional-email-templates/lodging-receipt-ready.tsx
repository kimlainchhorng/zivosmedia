import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { guestName?: string; propertyName?: string; reservationNumber?: string; downloadUrl?: string; generatedAt?: string; expiresAt?: string; message?: string }

const Email = ({ guestName = 'Guest', propertyName = 'Your stay', reservationNumber = '', downloadUrl, generatedAt, expiresAt, message }: Props) => (
  <Html lang="en"><Head /><Preview>Your ZIVO lodging receipt is ready</Preview><Body style={main}><Container style={container}>
    <Section style={badge}>ZIVO Lodging</Section><Heading style={h1}>Your receipt is ready</Heading>
    <Text style={text}>Hi {guestName}, {message || 'your lodging receipt has been saved from the original reservation snapshot.'}</Text>
    <Text style={meta}>{propertyName}<br />Reservation {reservationNumber}{generatedAt ? <><br />Generated {generatedAt}</> : null}</Text>
    {downloadUrl ? <Button href={downloadUrl} style={button}>Download receipt</Button> : null}
    {expiresAt ? <Text style={small}>This secure link expires {expiresAt}.</Text> : null}
  </Container></Body></Html>
)

export const template = { component: Email, subject: (p: Props) => `Your ZIVO lodging receipt${p.reservationNumber ? ` — ${p.reservationNumber}` : ''}`, displayName: 'Lodging receipt ready', previewData: { guestName: 'Alex', propertyName: 'ZIVO Suites', reservationNumber: 'L-2048', downloadUrl: 'https://hizivo.com/receipt', generatedAt: 'Apr 23, 2026', expiresAt: 'Apr 30, 2026' } } satisfies TemplateEntry<Props>
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '28px 22px' }
const badge = { color: '#16a34a', fontWeight: 700, fontSize: '13px', marginBottom: '16px' }
const h1 = { color: '#111827', fontSize: '24px', margin: '0 0 14px', lineHeight: '1.25' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '1.6' }
const meta = { color: '#4b5563', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', fontSize: '14px', lineHeight: '1.5' }
const button = { backgroundColor: '#16a34a', color: '#ffffff', padding: '12px 18px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', marginTop: '12px' }
const small = { color: '#6b7280', fontSize: '12px', lineHeight: '1.5' }
