import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EatsInlinePaymentForm from "./EatsInlinePaymentForm";

const inlineStripePaymentFormMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/payments/InlineStripePaymentForm", () => ({
  default: (props: Record<string, unknown>) => {
    inlineStripePaymentFormMock(props);
    return <div data-testid="inline-stripe-payment-form" />;
  },
}));

beforeEach(() => {
  inlineStripePaymentFormMock.mockClear();
});

describe("EatsInlinePaymentForm", () => {
  it("configures the shared form for immediate USD Eats payment", () => {
    const onCancel = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EatsInlinePaymentForm
        clientSecret="pi_eats_secret"
        amountCents={4_275}
        returnUrl="https://zivosmedia.com/eats/track/order-123"
        onCancel={onCancel}
        onSuccess={onSuccess}
      />,
    );

    expect(inlineStripePaymentFormMock).toHaveBeenCalledTimes(1);
    expect(inlineStripePaymentFormMock).toHaveBeenCalledWith({
      clientSecret: "pi_eats_secret",
      amountMinorUnits: 4_275,
      currency: "USD",
      returnUrl: "https://zivosmedia.com/eats/track/order-123",
      onCancel,
      onSuccess,
      ctaVerb: "Pay",
      captureNotice:
        "Your payment method is charged immediately. The restaurant receives your order after Stripe confirms payment.",
      paymentMethodOrder: ["card", "apple_pay", "google_pay"],
      securityNote:
        "Secured by Stripe · Card, Apple Pay, Google Pay (when available)",
    });
  });
});
