import { assertCors, assertValidationError, callFn, preflight } from "../_shared/test-utils.ts";

Deno.test("public-signup — OPTIONS preflight returns CORS headers", async () => {
  const res = await preflight("public-signup");
  assertCors(res);
});

Deno.test("public-signup — missing email returns 400", async () => {
  const res = await callFn("public-signup", { body: { password: "longenoughpw", fullName: "A" } });
  assertValidationError(res, "email");
});

Deno.test("public-signup — short password returns 400", async () => {
  const res = await callFn("public-signup", {
    body: { email: "x@y.com", password: "short", fullName: "A" },
  });
  assertValidationError(res, "password");
});

Deno.test("public-signup — missing fullName returns 400", async () => {
  const res = await callFn("public-signup", {
    body: { email: "x@y.com", password: "longenoughpw" },
  });
  assertValidationError(res, "fullName");
});

Deno.test("public-signup — invalid email returns 400", async () => {
  const res = await callFn("public-signup", {
    body: { email: "not-an-email", password: "longenoughpw", fullName: "A" },
  });
  assertValidationError(res, "email");
});
