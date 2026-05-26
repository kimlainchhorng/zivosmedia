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
  const res = await callFn("send-otp-email", { body: { email: "nope" } });
  assertValidationError(res, "email");
});
