import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  hmacEmailOtpCode,
  isEmailOtpPurpose,
  timingSafeEqualOtpHmac,
} from "../../supabase/functions/_shared/otpSecurity.ts";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

test("email OTP HMAC is deterministic and bound to record, recipient, purpose, account, and code", async () => {
  const secret = "z".repeat(32);
  const input = {
    id: "a3bb189e-8bf9-3888-9912-ace4e6543002",
    email: "Person@Example.com",
    purpose: "signup",
    userId: null,
    code: "123456",
  };

  const original = await hmacEmailOtpCode(secret, input);
  assert.equal(original.length, 64);
  assert.equal(original, await hmacEmailOtpCode(secret, input));
  assert.notEqual(original, await hmacEmailOtpCode(secret, { ...input, code: "123457" }));
  assert.notEqual(original, await hmacEmailOtpCode(secret, { ...input, purpose: "password_change" }));
  assert.notEqual(original, await hmacEmailOtpCode(secret, { ...input, email: "other@example.com" }));
  assert.notEqual(original, await hmacEmailOtpCode(secret, { ...input, userId: "b3bb189e-8bf9-3888-9912-ace4e6543002" }));
  assert.equal(timingSafeEqualOtpHmac(original, original), true);
  assert.equal(timingSafeEqualOtpHmac(original, `${original.slice(0, -1)}0`), false);
  assert.equal(isEmailOtpPurpose("signup"), true);
  assert.equal(isEmailOtpPurpose("unknown"), false);
});

test("public signup cannot create or alter an account before email proof", () => {
  const signup = read("supabase/functions/public-signup/index.ts");
  const verify = read("supabase/functions/verify-otp-code/index.ts");

  assert.match(signup, /parsePublicSignupBody/);
  assert.match(signup, /body: JSON\.stringify\(\{ email, purpose: "signup" \}\)/);
  assert.match(signup, /Signup details are accepted only after email verification/);
  assert.doesNotMatch(signup, /auth\.admin\.createUser/);
  assert.doesNotMatch(signup, /auth\.admin\.updateUserById/);

  assert.match(verify, /hmacEmailOtpCode/);
  assert.match(verify, /code_hmac/);
  assert.match(verify, /bindExistingAccount/);
  assert.match(verify, /request\.purpose === "signup" \? null : await bindExistingAccount/);
  assert.match(verify, /Signup details are required to finish creating your account/);
  assert.match(verify, /if \(!await consumeOtp\(service, otpRecord, request, binding\)\)/);
  assert.match(verify, /auth\.admin\.createUser\(/);
  assert.match(verify, /code: "account_exists"/);
  assert.doesNotMatch(verify, /otpRecord\.code(?!_hmac)/);
});

test("all email OTP clients supply an explicit purpose without a caller-selected target", () => {
  const auth = read("src/contexts/AuthContext.tsx");
  const signupVerify = read("src/pages/VerifyOTP.tsx");
  const newDevice = read("src/pages/VerifyNewDevice.tsx");
  const passwordChange = read("src/components/auth/PasswordChangeVerifyDialog.tsx");
  const callback = read("src/pages/AuthCallback.tsx");

  assert.match(auth, /savePendingSignup\(/);
  assert.match(auth, /body: \{ email: normalizedEmail \}/);
  assert.doesNotMatch(auth, /body:\s*\{[\s\S]{0,240}password/);
  assert.match(signupVerify, /purpose: isSignup \? "signup" : "email_verification"/);
  assert.match(signupVerify, /signup_data: signupData/);
  assert.match(signupVerify, /if \(mode === "email_verification"\) return/);
  assert.match(newDevice, /body: \{ email, code: otp, purpose: "new_device" \}/);
  assert.match(newDevice, /body: \{ email, purpose: "new_device" \}/);
  assert.doesNotMatch(newDevice, /zivo_device_otp_userid/);
  assert.match(passwordChange, /purpose: "password_change"/);
  assert.match(callback, /body: \{ email: user\.email, purpose: "email_verification" \}/);
  assert.doesNotMatch(callback, /body: \{ email: user\.email, userId: user\.id \}/);
});

test("migration invalidates legacy plaintext OTPs and limits table access to service role", () => {
  const migration = read("supabase/migrations/20260809184000_harden_public_email_otp_identity.sql");
  const config = read("supabase/config.toml");

  assert.match(migration, /code = NULL/);
  assert.match(migration, /code_hmac = NULL/);
  assert.match(migration, /verified_at = COALESCE\(verified_at, now\(\)\)/);
  assert.match(migration, /UPDATE public\.otp_codes SET signup_data = NULL WHERE signup_data IS NOT NULL/);
  assert.match(migration, /CHECK \(code IS NULL\)/);
  assert.match(migration, /CHECK \(verified_at IS NOT NULL OR \(code_hmac IS NOT NULL/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.otp_codes FROM PUBLIC/);
  assert.match(migration, /TO service_role/);
  assert.match(migration, /otp_codes_service_role_only/);
  assert.match(config, /\[functions\.public-signup\]\s+verify_jwt = false/);
  assert.match(config, /\[functions\.send-otp-email\]\s+verify_jwt = false/);
  assert.match(config, /\[functions\.verify-otp-code\]\s+verify_jwt = false/);
});
