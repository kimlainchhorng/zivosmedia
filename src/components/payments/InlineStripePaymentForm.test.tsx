/**
 * Contract tests for the shared inline Stripe payment form.
 *
 * These lock in the two things the per-vertical forks got wrong: the CTA
 * amount must come from the PaymentIntent's own minor-unit integer in its own
 * currency, and a declined payment must leave a persistent, announced message
 * instead of a toast that times out.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InlineStripePaymentForm from "./InlineStripePaymentForm";

const submitMock = vi.fn();
const confirmPaymentMock = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => Promise.resolve(null),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: ({ onReady }: { onReady?: () => void }) => {
    onReady?.();
    return <div data-testid="payment-element" />;
  },
  useStripe: () => ({ confirmPayment: confirmPaymentMock }),
  useElements: () => ({ submit: submitMock }),
}));

function renderForm(props: Partial<React.ComponentProps<typeof InlineStripePaymentForm>> = {}) {
  return render(
    <InlineStripePaymentForm
      clientSecret="pi_test_secret"
      amountMinorUnits={12345}
      currency="USD"
      onCancel={vi.fn()}
      onSuccess={vi.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  submitMock.mockReset().mockResolvedValue({ error: undefined });
  confirmPaymentMock.mockReset();
});

describe("CTA amount", () => {
  it("renders a two-decimal currency from its minor units", () => {
    renderForm({ amountMinorUnits: 12345, currency: "USD" });
    expect(screen.getByRole("button", { name: /Pay/ })).toHaveTextContent("123.45");
  });

  it("does not divide a zero-decimal currency by 100", () => {
    // ¥5,000 arrives as amount: 5000. The old forms printed "JPY 50.00".
    renderForm({ amountMinorUnits: 5000, currency: "JPY" });
    const cta = screen.getByRole("button", { name: /Pay/ });
    expect(cta).toHaveTextContent("5,000");
    expect(cta).not.toHaveTextContent("50.00");
  });

  it("never labels a non-USD amount with a dollar sign", () => {
    renderForm({ amountMinorUnits: 50000, currency: "VND" });
    expect(screen.getByRole("button", { name: /Pay/ }).textContent).not.toContain("$");
  });

  it("uses the caller's verb so manual-capture flows stay truthful", () => {
    renderForm({ ctaVerb: "Authorise", amountMinorUnits: 2500, currency: "USD" });
    expect(screen.getByRole("button", { name: /Authorise/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Pay/ })).not.toBeInTheDocument();
  });
});

describe("failure reporting", () => {
  it("shows a declined card reason as a persistent alert", async () => {
    confirmPaymentMock.mockResolvedValue({
      error: { message: "Your card was declined." },
      paymentIntent: undefined,
    });

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your card was declined.");
  });

  it("reports a validation error from elements.submit()", async () => {
    submitMock.mockResolvedValue({ error: { message: "Your card number is incomplete." } });

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your card number is incomplete.");
    expect(confirmPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects a PaymentIntent that is not actually settled", async () => {
    confirmPaymentMock.mockResolvedValue({
      error: undefined,
      paymentIntent: { id: "pi_1", status: "requires_payment_method" },
    });
    const onSuccess = vi.fn();

    renderForm({ onSuccess });
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

    await screen.findByRole("alert");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("clears the previous error when the customer retries", async () => {
    confirmPaymentMock.mockResolvedValue({
      error: { message: "Your card was declined." },
      paymentIntent: undefined,
    });

    renderForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));
    await screen.findByRole("alert");

    confirmPaymentMock.mockResolvedValue({
      error: undefined,
      paymentIntent: { id: "pi_ok", status: "succeeded" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("hand-off", () => {
  it.each(["succeeded", "processing", "requires_capture"])(
    "hands off a %s PaymentIntent",
    async (status) => {
      confirmPaymentMock.mockResolvedValue({
        error: undefined,
        paymentIntent: { id: "pi_ok", status },
      });
      const onSuccess = vi.fn();

      renderForm({ onSuccess });
      fireEvent.click(screen.getByRole("button", { name: /Pay/ }));

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("pi_ok"));
    },
  );

  it("keeps Back available and wired while idle", () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
