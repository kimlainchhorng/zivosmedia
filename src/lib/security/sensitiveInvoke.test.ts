import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * invokeSensitive is what stands between a user and a dead button.
 *
 * 25 edge functions call enforceAal2 and answer 403
 * {"error":"Step-up MFA required","code":"mfa_required"} to any session below
 * AAL2. A normal password-only session is aal1 — the owner's own production
 * session decodes to aal:"aal1", amr:["password"] — so that 403 is the common
 * case, not an edge case. A plain supabase.functions.invoke surfaces it as
 * "Edge Function returned a non-2xx status code" and the payout button simply
 * does nothing.
 *
 * The fragile part is detection. The helper's own comment says supabase-js
 * shapes vary across versions, so it checks error.context.body as an object,
 * as a JSON string, AND the error message. If any of those stops matching, the
 * whole mechanism silently degrades back to the bad error — with no test
 * failing and nothing to see in the UI. Hence this file.
 *
 * The last case is the one that describes production today: with no factor
 * enrolled, useStepUpMfa toasts "Two-factor authentication is not enabled" and
 * resolves false. invokeSensitive must NOT retry then — a second call would
 * just produce a second 403.
 */

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

const { invokeSensitive } = await import("./sensitiveInvoke");

/** supabase-js FunctionsHttpError, in the shapes seen across SDK versions. */
function mfaError(shape: "object" | "string" | "message-only") {
  const body = { error: "Step-up MFA required", code: "mfa_required" };
  if (shape === "message-only") {
    return Object.assign(new Error("mfa_required"), {});
  }
  return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    context: { status: 403, body: shape === "string" ? JSON.stringify(body) : body },
  });
}

describe("invokeSensitive", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it("passes a success straight through and never prompts", async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const ensureAal2 = vi.fn();

    const result = await invokeSensitive("eats-payout-request", { body: {} }, ensureAal2);

    expect(result).toEqual({ data: { ok: true }, error: null });
    expect(ensureAal2).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it.each(["object", "string", "message-only"] as const)(
    "recognises mfa_required when the error carries it as %s, then retries",
    async (shape) => {
      mocks.invoke
        .mockResolvedValueOnce({ data: null, error: mfaError(shape) })
        .mockResolvedValueOnce({ data: { ok: true }, error: null });
      const ensureAal2 = vi.fn().mockResolvedValue(true);

      const result = await invokeSensitive(
        "lodge-payout-request",
        { body: { amount_cents: 500 } },
        ensureAal2,
        "Authorize payout request",
      );

      expect(ensureAal2).toHaveBeenCalledWith("Authorize payout request");
      expect(mocks.invoke).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: { ok: true }, error: null });
    },
  );

  it("retries with the same function and options, so the body is not lost", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: mfaError("object") })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const opts = { body: { store_id: "s1", amount_cents: 900 }, headers: { "Idempotency-Key": "k1" } };

    await invokeSensitive("merchant-payout-request", opts, vi.fn().mockResolvedValue(true));

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, "merchant-payout-request", opts);
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, "merchant-payout-request", opts);
  });

  it("leaves a non-MFA failure alone rather than prompting for a code", async () => {
    // Prompting on an unrelated 500 would ask the user for 2FA and then fail
    // anyway — worse than the error they should have seen.
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: { status: 500, body: { error: "Could not load points" } },
    });
    mocks.invoke.mockResolvedValue({ data: null, error });
    const ensureAal2 = vi.fn();

    const result = await invokeSensitive("loyalty-points-manage", { body: {} }, ensureAal2);

    expect(ensureAal2).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(result.error).toBe(error);
  });

  it("does not retry when the challenge is declined or unavailable", async () => {
    // This is production today: no enrolled factor, so useStepUpMfa toasts
    // "Two-factor authentication is not enabled" and resolves false. Retrying
    // would only earn a second 403.
    mocks.invoke.mockResolvedValue({ data: null, error: mfaError("object") });
    const ensureAal2 = vi.fn().mockResolvedValue(false);

    const result = await invokeSensitive("paypal-payout", { body: {} }, ensureAal2);

    expect(ensureAal2).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(result.data).toBeNull();
    expect(result.error?.message).toMatch(/two-factor/i);
  });
});
