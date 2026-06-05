/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Button,
  Heading,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <AuthEmailShell preview={`Reset your ${siteName} password`}>
    <Text style={styles.eyebrow}>Account recovery</Text>
    <Heading style={styles.h1}>Reset your password</Heading>
    <Text style={styles.text}>
      We received a request to reset your password for {siteName}. Use the
      secure button below to choose a new password.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Reset password
    </Button>
    <Text style={styles.footer}>
      If you did not request a password reset, ignore this email. Your password
      will not change unless you open the secure link.
    </Text>
  </AuthEmailShell>
)

export default RecoveryEmail
