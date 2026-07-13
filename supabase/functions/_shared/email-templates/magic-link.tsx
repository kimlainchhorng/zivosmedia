/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Button,
  Heading,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <AuthEmailShell preview={`Your secure login link for ${siteName}`}>
    <Text style={styles.eyebrow}>Secure sign-in</Text>
    <Heading style={styles.h1}>Your ZIVO login link</Heading>
    <Text style={styles.text}>
      Use the button below to sign in to {siteName}. This link is time-limited
      and should only be opened by you.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Sign in securely
    </Button>
    <Text style={styles.footer}>
      If you did not request this link, you can safely ignore this email. Your
      account remains protected.
    </Text>
  </AuthEmailShell>
)

export default MagicLinkEmail
