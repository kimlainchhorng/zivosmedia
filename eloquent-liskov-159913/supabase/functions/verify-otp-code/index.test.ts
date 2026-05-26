import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("verify-otp-code — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("verify-otp-code");
  assertCors(res);
});

Deno.test("verify-otp-code — missing fields returns 400", async () => {
  const res = await callFn("verify-otp-code", { body: {} });
  assertValidationError(res);
});

Deno.test("verify-otp-code — non-6-digit code returns 400", async () => {
  const res = await callFn("verify-otp-code", {
    body: { email: "x@y.com", code: "12" },
  });
  assertValidationError(res, "code");
});

Deno.test("verify-otp-code — invalid email returns 400", async () => {
  const res = await callFn("verify-otp-code", {
    body: { email: "nope", code: "123456" },
  });
  assertValidationError(res, "email");
});
