/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Button,
  Heading,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <AuthEmailShell preview={`You have been invited to ${siteName}`}>
    <Text style={styles.eyebrow}>Workspace invitation</Text>
    <Heading style={styles.h1}>You have been invited</Heading>
    <Text style={styles.text}>
      You have been invited to join{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      . Accept the invitation to create your account and enter the workspace.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={styles.footer}>
      If you were not expecting this invitation, you can safely ignore this
      email.
    </Text>
  </AuthEmailShell>
)

export default InviteEmail
