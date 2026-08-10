import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("send-otp-email — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("send-otp-email");
  assertCors(res);
});

Deno.test("send-otp-email — missing email returns 400", async () => {
  const res = await callFn("send-otp-email", { body: {} });
  assertValidationError(res, "email");
});

Deno.test("send-otp-email — invalid email returns 400", async () => {
  const res = await callFn("send-otp-email", { body: { email: "nope", purpose: "signup" } });
  assertValidationError(res, "email");
});

Deno.test("send-otp-email — requires an explicit purpose", async () => {
  const res = await callFn("send-otp-email", { body: { email: "x@y.com" } });
  assertValidationError(res, "purpose");
});

Deno.test("send-otp-email — rejects caller-selected account targets", async () => {
  const res = await callFn("send-otp-email", {
    body: { email: "x@y.com", purpose: "signup", userId: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "userId");
});
