import { describe, expect, it } from "vitest";

import { edgeFunctionErrorMessage, isEdgeFunctionMissing } from "./edgeFunctionError";

/**
 * The distinction these two helpers draw decides whether a caller may fall
 * back to writing the table itself.
 *
 * BusOperatorConsole used a bare `catch` for that decision, so every failure
 * looked like "the function isn't deployed". capture-bus-payment now answers
 * 409 "This payment was refunded and cannot be captured." — under the old code
 * that refusal was swallowed and the booking was marked confirmed anyway, with
 * a "Booking confirmed." toast. The guard existed and the UI overrode it.
 *
 * So the rule under test: a status means the function answered, and only 404
 * (or no HTTP response at all) means it is missing.
 */

/** supabase-js FunctionsHttpError for a non-2xx that carries a JSON body. */
function httpError(status: number, body: unknown, asString = false) {
  return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    name: "FunctionsHttpError",
    context: { status, body: asString ? JSON.stringify(body) : body },
  });
}

describe("isEdgeFunctionMissing", () => {
  it("is true for a 404 from the gateway", () => {
    expect(isEdgeFunctionMissing(httpError(404, { message: "Not Found" }))).toBe(true);
  });

  it("is true when the request never reached a function", () => {
    expect(isEdgeFunctionMissing(Object.assign(new Error("failed"), { name: "FunctionsFetchError" }))).toBe(true);
    expect(isEdgeFunctionMissing(Object.assign(new Error("relay"), { name: "FunctionsRelayError" }))).toBe(true);
  });

  it.each([400, 401, 403, 409, 429, 500, 503])(
    "is false for %i — the function answered, and that answer must not be overwritten",
    (status) => {
      expect(isEdgeFunctionMissing(httpError(status, { error: "nope" }))).toBe(false);
    },
  );

  it("is false for no error at all", () => {
    expect(isEdgeFunctionMissing(null)).toBe(false);
    expect(isEdgeFunctionMissing(undefined)).toBe(false);
  });
});

describe("edgeFunctionErrorMessage", () => {
  it("surfaces the message the function sent, not the SDK's generic one", () => {
    const error = httpError(409, { error: "This payment was refunded and cannot be captured." });
    expect(edgeFunctionErrorMessage(error, "Couldn't confirm booking.")).toBe(
      "This payment was refunded and cannot be captured.",
    );
  });

  it("reads a body that arrives as a JSON string", () => {
    const error = httpError(409, { error: "Tips for this period have already been paid out." }, true);
    expect(edgeFunctionErrorMessage(error, "fallback")).toBe(
      "Tips for this period have already been paid out.",
    );
  });

  it("accepts `message` as well as `error`", () => {
    expect(edgeFunctionErrorMessage(httpError(400, { message: "Invalid id" }), "fallback")).toBe("Invalid id");
  });

  it("falls back when the body is absent, unparseable, or blank", () => {
    expect(edgeFunctionErrorMessage(httpError(500, undefined), "fallback")).toBe("fallback");
    expect(edgeFunctionErrorMessage(
      Object.assign(new Error("x"), { context: { status: 500, body: "<html>502</html>" } }),
      "fallback",
    )).toBe("fallback");
    expect(edgeFunctionErrorMessage(httpError(400, { error: "   " }), "fallback")).toBe("fallback");
  });
});
