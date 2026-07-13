/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Button,
  Heading,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <AuthEmailShell preview={`Confirm your ${siteName} email change`}>
    <Text style={styles.eyebrow}>Security confirmation</Text>
    <Heading style={styles.h1}>Confirm your email change</Heading>
    <Text style={styles.text}>
      You requested to change your {siteName} email from{' '}
      <Link href={`mailto:${email}`} style={styles.link}>
        {email}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={styles.link}>
        {newEmail}
      </Link>
      .
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Confirm email change
    </Button>
    <Text style={styles.footer}>
      If you did not request this change, secure your account immediately and
      do not open the confirmation link.
    </Text>
  </AuthEmailShell>
)

export default EmailChangeEmail
