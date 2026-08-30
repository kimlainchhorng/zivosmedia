import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The bus flow used to end like this:
 *
 *     try {
 *       const { data: pay, error } = await invoke("create-bus-payment-intent", ...)
 *       ...
 *       goStep("confirmed");
 *       toast.success(t("bus.booked_toast"));   // "Bus booked! Your e-ticket is ready."
 *     } catch {
 *       goStep("confirmed");
 *       toast.success(t("bus.booked_toast"));   // ...and again, on failure
 *     }
 *
 * The catch told the passenger their seat was booked and their e-ticket ready
 * when no card had been authorised at all. The operator got a booking nobody
 * paid for. And create-bus-payment-intent is not deployed — it answers 404 —
 * so that catch was firing on every single card booking, not as an edge case.
 *
 * There was never a silent-success path worth preserving either: the function
 * returns a client_secret or it returns an error, nothing else, so the
 * no-client_secret branch was the same lie by a different route.
 *
 * This asserts the shape rather than the wording: nothing in the payment
 * helper may announce success, and the success toast must stay reachable only
 * from a path that has a client_secret.
 */

const source = readFileSync(
  resolve(process.cwd(), "src/pages/app/BusBookingPage.tsx"),
  "utf8",
);

/**
 * Comments are not code. The doc comment on startBusPayment quotes the exact
 * broken snippet this file forbids, so a scan of the raw source finds it and
 * reports the fix as the bug. (The same trap already bit once this session:
 * a comment containing `withIdempotency(` broke a test doing indexOf on it.)
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const code = stripComments(source);

/** The body of a `catch { ... }` block, non-greedy to the closing brace. */
function catchBlocks(text: string): string[] {
  return [...text.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([\s\S]*?)\n\s{4}\}/g)].map((m) => m[1]);
}

describe("bus booking never claims a seat is paid for when it is not", () => {
  it("has a payment helper that is reached instead of an inline try/catch", () => {
    expect(source).toContain("const startBusPayment = async (");
    expect(source).toContain("await startBusPayment(");
  });

  it("never announces a booking from a catch block", () => {
    const offenders = catchBlocks(code).filter((b) => /toast\.success|booked_toast/.test(b));
    expect(
      offenders,
      "A catch block announcing success is how the passenger was told their " +
        "e-ticket was ready after the payment call failed:\n" +
        offenders.map((o) => `  ${o.trim().slice(0, 140)}`).join("\n"),
    ).toEqual([]);
  });

  it("never advances to the confirmed step from a catch block", () => {
    const offenders = catchBlocks(code).filter((b) => /goStep\("confirmed"\)/.test(b));
    expect(offenders, "The confirmed screen must not be reachable from a failure path.").toEqual([]);
  });

  it("treats a missing client_secret as a failure, not a silent success", () => {
    const helper = /const startBusPayment = async \([\s\S]*?\n {2}\};/.exec(code)?.[0] ?? "";
    expect(helper, "startBusPayment not found").not.toBe("");
    expect(helper).toMatch(/if \(!pay\?\.client_secret\) throw/);
    expect(helper).not.toContain("booked_toast");
  });

  it("does not book the same seats twice when payment is retried", () => {
    // createdBookingId is set the moment create_bus_booking succeeds. Retrying
    // the whole handler would ask for seats that the first hold already owns.
    expect(source).toMatch(/if \(createdBookingId\) \{[\s\S]{0,220}?startBusPayment\(createdBookingId/);
  });

  it("ships the message it shows on failure", () => {
    const core = readFileSync(resolve(process.cwd(), "src/i18n/translations.core.ts"), "utf8");
    expect(core).toContain('"bus.err_payment_unavailable"');
  });
});
