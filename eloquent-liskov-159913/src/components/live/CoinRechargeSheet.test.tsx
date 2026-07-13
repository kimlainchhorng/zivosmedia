import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const invokeMock = vi.fn();
const confirmPaymentMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/stripe", () => ({ getStripe: () => Promise.resolve(null) }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub framer-motion so AnimatePresence/motion.div render synchronously.
vi.mock("framer-motion", () => ({
  motion: new Proxy({}, { get: () => (props: any) => <div {...props} /> }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Stub Stripe React bindings to a passthrough we can drive.
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: any) => <>{children}</>,
  PaymentElement: ({ onReady }: any) => {
    queueMicrotask(() => onReady?.());
    return <div data-testid="payment-element" />;
  },
  ExpressCheckoutElement: () => <div data-testid="express-checkout" />,
  useStripe: () => ({
    confirmPayment: (...args: unknown[]) => confirmPaymentMock(...args),
  }),
  useElements: () => ({
    submit: (...args: unknown[]) => submitMock(...args),
    getElement: () => null,
  }),
}));

// Loading the asset path through Vite's image loader is not needed for behavior tests.
vi.mock("@/assets/gifts/gold-coin.png", () => ({ default: "gold-coin.png" }));

import CoinRechargeSheet from "./CoinRechargeSheet";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe("CoinRechargeSheet onPurchase wiring", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    confirmPaymentMock.mockReset();
    submitMock.mockReset();
  });

  it("invokes onPurchase with the credited coin count after a successful payment", async () => {
    invokeMock.mockImplementation((fn: string) => {
      if (fn === "create-coin-payment-intent") {
        return Promise.resolve({
          data: { client_secret: "cs_x", payment_intent_id: "pi_x", amount_cents: 199, coins: 100 },
          error: null,
        });
      }
      if (fn === "verify-coin-purchase") {
        return Promise.resolve({ data: { credited: true, coins: 137 }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    submitMock.mockResolvedValue({ error: null });
    confirmPaymentMock.mockResolvedValue({
      paymentIntent: { id: "pi_x", status: "succeeded" },
      error: null,
    });

    const onPurchase = vi.fn();
    const onClose = vi.fn();

    render(
      <CoinRechargeSheet open onClose={onClose} currentBalance={0} onPurchase={onPurchase} />,
      { wrapper },
    );

    // Pick the "Best Value" package (only one with that badge).
    const badge = await screen.findByText(/Best Value/i);
    fireEvent.click(badge.closest("button")!);

    // Wait for the pay step to render its confirm button.
    const payButton = await screen.findByRole("button", { name: /^Pay \$/ });
    await waitFor(() => expect(payButton).not.toBeDisabled());
    fireEvent.click(payButton);

    await waitFor(() => expect(onPurchase).toHaveBeenCalledTimes(1));
    expect(onPurchase).toHaveBeenCalledWith(137);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
