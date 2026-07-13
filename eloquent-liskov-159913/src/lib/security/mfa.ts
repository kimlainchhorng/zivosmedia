/**
 * MFA (TOTP) challenge helpers for the post-login step-up flow.
 *
 * Supabase Auth issues a session at AAL1 after password verification. If the
 * user has a verified TOTP factor enrolled, we must complete an MFA challenge
 * to step up to AAL2 before granting access to protected pages.
 *
 * Reference: https://supabase.com/docs/guides/auth/auth-mfa
 */
import { supabase } from "@/integrations/supabase/client";

export interface MfaState {
  required: boolean;
  factorId: string | null;
  challengeId: string | null;
}

/**
 * After signInWithPassword, call this to find out whether the user must
 * complete a TOTP challenge to reach AAL2.
 */
export async function getMfaChallenge(): Promise<MfaState> {
  // Determine current and required Authentication Assurance Level
  const { data: aalData, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalErr) {
    return { required: false, factorId: null, challengeId: null };
  }
  const current  = aalData?.currentLevel;
  const required = aalData?.nextLevel;

  // No step-up needed
  if (!required || current === required) {
    return { required: false, factorId: null, challengeId: null };
  }

  // Step-up needed — find the verified TOTP factor
  const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
  if (fErr) return { required: true, factorId: null, challengeId: null };

  const totp = (factors?.totp ?? []).find(f => (f.status as string) === "verified");
  if (!totp) {
    // User is at AAL1 but has no verified factor — no challenge possible
    return { required: false, factorId: null, challengeId: null };
  }

  // Create a challenge
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (cErr || !challenge?.id) {
    return { required: true, factorId: totp.id, challengeId: null };
  }

  return { required: true, factorId: totp.id, challengeId: challenge.id };
}

/**
 * Verify a 6-digit TOTP code against an active challenge.
 * Returns null on success, or an Error on failure.
 */
export async function verifyMfaChallenge(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<Error | null> {
  if (!/^\d{6}$/.test(code)) {
    return new Error("Enter the 6-digit code from your authenticator app");
  }
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  return error ?? null;
}

/**
 * Issue a fresh MFA challenge for an already-authenticated user, used to
 * step up to AAL2 before performing a sensitive action (withdrawal, payout
 * change, account deletion, role change). Returns null if the user has no
 * verified TOTP factor — the caller should fall back to email OTP or block.
 */
export async function startStepUpChallenge(): Promise<MfaState | null> {
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) return null;
  const totp = (factors?.totp ?? []).find(f => (f.status as string) === "verified");
  if (!totp) return null;

  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (cErr || !challenge?.id) return null;

  return { required: true, factorId: totp.id, challengeId: challenge.id };
}

/**
 * True if the current session is at AAL2 (MFA-completed).
 */
export async function isAal2(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  const lvl = data?.currentLevel as string | undefined;
  return lvl === "aal2" || lvl === "aal3";
}
