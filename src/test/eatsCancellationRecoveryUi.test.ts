import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/pages/EatsTrackingPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("Eats cancellation recovery UI", () => {
  it("treats refunded orders as terminal and never retries intentional no-refund cancellations", () => {
    expect(source).toContain(
      '["cancelled", "refunded"].includes(order.status)',
    );
    expect(source).toContain('order.payment_status === "refund_pending"');
    expect(source).toContain('error !== "cancelled_no_refund"');
  });

  it("retries the authoritative cancellation endpoint without creating a new charge", () => {
    const start = source.indexOf("const recoverCancellation = useCallback");
    const end = source.indexOf("// Fetch restaurant name", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const recovery = source.slice(start, end);

    expect(recovery).toContain('"cancel-eats-order"');
    expect(recovery).toContain('reason: "cancellation_recovery_retry"');
    expect(recovery).toContain("(data as any)?.ok !== true");
    expect(recovery).toContain('(data as any)?.status !== "cancelled"');
    expect(recovery).toContain("cancellationRecoveryInFlightRef.current");
    expect(recovery).not.toContain("create-eats-order");
    expect(recovery).not.toContain("create-eats-payment");
  });

  it("shows a truthful manual retry after the automatic recovery attempt remains pending", () => {
    expect(source).toContain("Cancellation needs one more check");
    expect(source).toContain("Retry cancellation recovery");
    expect(source).toContain("It never");
    expect(source).toContain("creates a new order or charge.");
    expect(source).toContain("cancellationRecoveryAttemptedRef.current");
  });
});
