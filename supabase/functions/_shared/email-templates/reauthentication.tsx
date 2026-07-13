/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Heading,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { AuthEmailShell, styles } from './layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthEmailShell preview="Your ZIVO verification code">
    <Text style={styles.eyebrow}>Identity check</Text>
    <Heading style={styles.h1}>Confirm it is you</Heading>
    <Text style={styles.text}>Use this code to confirm your identity:</Text>
    <Text style={styles.code}>{token}</Text>
    <Text style={styles.footer}>
      This code expires shortly. If you did not request this, you can safely
      ignore this email.
    </Text>
  </AuthEmailShell>
)

export default ReauthenticationEmail
