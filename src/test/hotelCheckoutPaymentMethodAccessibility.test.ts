import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const checkoutSource = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelRoomCheckoutPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const compactCheckoutSource = checkoutSource.replace(/\s+/g, " ");

describe("hotel checkout payment-method accessibility", () => {
  it("names the chooser and exposes each option's selected state", () => {
    expect(compactCheckoutSource).toContain(
      '<h2 id="hotel-payment-method-heading"',
    );
    expect(compactCheckoutSource).toContain(
      '<div role="group" aria-labelledby="hotel-payment-method-heading"',
    );
    expect(compactCheckoutSource).toContain("aria-pressed={payMethod === key}");
    expect(compactCheckoutSource).toContain(
      "aria-labelledby={`hotel-payment-method-${key}-label`}",
    );
    expect(compactCheckoutSource).toContain(
      "aria-describedby={`hotel-payment-method-${key}-description`}",
    );
    expect(compactCheckoutSource).toContain(
      "id={`hotel-payment-method-${key}-label`}",
    );
    expect(compactCheckoutSource).toContain(
      "id={`hotel-payment-method-${key}-description`}",
    );
  });

  it("keeps the options keyboard-visible and their decorative icons silent", () => {
    expect(compactCheckoutSource).toContain(
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    );
    expect(compactCheckoutSource).toContain(
      '<Icon aria-hidden className="h-4 w-4"',
    );
    expect(compactCheckoutSource).toContain(
      '<CheckCircle aria-hidden className="ml-auto h-4 w-4 shrink-0 text-primary min-[480px]:absolute min-[480px]:right-3 min-[480px]:top-3"',
    );
  });

  it("preserves the default choice and reservation-owned payment path", () => {
    expect(compactCheckoutSource).toContain(
      'const [payMethod, setPayMethod] = useState<PayMethod>("cash");',
    );
    expect(compactCheckoutSource).toContain(
      'type="button" key={key} aria-pressed={payMethod === key}',
    );
    expect(compactCheckoutSource).toContain(
      "onClick={() => setPayMethod(key)}",
    );
    expect(compactCheckoutSource).toContain(
      'status: payMethod === "cash" ? "confirmed" : "hold",',
    );
    expect(compactCheckoutSource).toContain("payment_method: payMethod,");
  });
});
