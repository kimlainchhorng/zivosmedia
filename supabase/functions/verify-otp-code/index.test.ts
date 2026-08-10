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
    body: { email: "x@y.com", code: "12", purpose: "signup" },
  });
  assertValidationError(res, "code");
});

Deno.test("verify-otp-code — invalid email returns 400", async () => {
  const res = await callFn("verify-otp-code", {
    body: { email: "nope", code: "123456", purpose: "signup" },
  });
  assertValidationError(res, "email");
});

Deno.test("verify-otp-code — requires an explicit purpose", async () => {
  const res = await callFn("verify-otp-code", { body: { email: "x@y.com", code: "123456" } });
  assertValidationError(res, "purpose");
});

Deno.test("verify-otp-code — rejects caller-selected account targets", async () => {
  const res = await callFn("verify-otp-code", {
    body: { email: "x@y.com", code: "123456", purpose: "signup", userId: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "userId");
});
