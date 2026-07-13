/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Button,
  Heading,
  Link,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <AuthEmailShell preview={`Confirm your ${siteName} email`}>
    <Text style={styles.eyebrow}>Welcome to ZIVO</Text>
    <Heading style={styles.h1}>Confirm your email</Heading>
    <Text style={styles.text}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>
      . Verify{' '}
      <Link href={`mailto:${recipient}`} style={styles.link}>
        {recipient}
      </Link>{' '}
      to finish securing your account.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Verify email
    </Button>
    <Text style={styles.footer}>
      If you did not create this account, you can safely ignore this email.
    </Text>
  </AuthEmailShell>
)

export default SignupEmail
