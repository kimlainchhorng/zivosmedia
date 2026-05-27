import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("verify-otp-sms — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("verify-otp-sms");
  assertCors(res);
});

Deno.test("verify-otp-sms — missing fields returns 400", async () => {
  const res = await callFn("verify-otp-sms", { body: {} });
  assertValidationError(res);
});

Deno.test("verify-otp-sms — invalid phone returns 400", async () => {
  const res = await callFn("verify-otp-sms", {
    body: { phone_e164: "555", code: "123456", user_id: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "phone_e164");
});

Deno.test("verify-otp-sms — non-6-digit code returns 400", async () => {
  const res = await callFn("verify-otp-sms", {
    body: { phone_e164: "+15551234567", code: "abc", user_id: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "code");
});
