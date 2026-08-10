import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("public-signup — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("public-signup");
  assertCors(res);
});

Deno.test("public-signup — missing email returns 400", async () => {
  const res = await callFn("public-signup", { body: {} });
  assertValidationError(res, "email");
});

Deno.test("public-signup — rejects pre-verification credentials", async () => {
  const res = await callFn("public-signup", {
    body: { email: "x@y.com", password: "short", fullName: "A" },
  });
  assertValidationError(res, "password");
});

Deno.test("public-signup — rejects caller-selected account targets", async () => {
  const res = await callFn("public-signup", {
    body: { email: "x@y.com", userId: "00000000-0000-0000-0000-000000000000" },
  });
  assertValidationError(res, "userId");
});

Deno.test("public-signup — invalid email returns 400", async () => {
  const res = await callFn("public-signup", {
    body: { email: "not-an-email" },
  });
  assertValidationError(res, "email");
});
