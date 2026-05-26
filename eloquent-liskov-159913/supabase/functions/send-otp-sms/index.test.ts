import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("send-otp-sms — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("send-otp-sms");
  assertCors(res);
});

Deno.test("send-otp-sms — missing fields returns 400", async () => {
  const res = await callFn("send-otp-sms", { body: {} });
  assertValidationError(res);
});

Deno.test("send-otp-sms — invalid phone format returns 400", async () => {
  const res = await callFn("send-otp-sms", {
    body: { phone_e164: "555-1234", user_id: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "phone_e164");
});

Deno.test("send-otp-sms — invalid user_id returns 400", async () => {
  const res = await callFn("send-otp-sms", {
    body: { phone_e164: "+15551234567", user_id: "not-a-uuid" },
  });
  assertValidationError(res, "user_id");
});
