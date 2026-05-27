import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RidePaymentSection, { type CambodiaPaymentMethod } from "./RidePaymentSection";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user", user_metadata: {} },
    isLoading: false,
  }),
}));

vi.mock("@/components/rides/AbaPaymentModal", () => ({
  default: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock("@stripe/react-stripe-js", () => ({
  CardElement: () => <div />,
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div />,
  useElements: () => null,
  useStripe: () => null,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => null,
}));

function CambodiaPaymentHarness({
  initialMethod = "cash",
  cashAllowed = true,
  onAuthorizeWithNewCard = vi.fn(),
}: {
  initialMethod?: CambodiaPaymentMethod;
  cashAllowed?: boolean;
  onAuthorizeWithNewCard?: () => void;
}) {
  const [method, setMethod] = React.useState<CambodiaPaymentMethod>(initialMethod);

  return (
    <MemoryRouter>
      <RidePaymentSection
        price={0.74}
        vehicleName="ZIVO Moto"
        isSubmitting={false}
        onAuthorizeWithSavedCard={vi.fn()}
        onAuthorizeWithNewCard={onAuthorizeWithNewCard}
        clientSecret={null}
        onPaymentSuccess={vi.fn()}
        paymentFailed={false}
        isCambodia
        cashAllowed={cashAllowed}
        selectedPaymentMethod={method}
        onPaymentMethodChange={setMethod}
      />
    </MemoryRouter>
  );
}

describe("RidePaymentSection Cambodia methods", () => {
  it("switches to card and confirms through the card authorization path", () => {
    const authorizeWithNewCard = vi.fn();

    render(<CambodiaPaymentHarness onAuthorizeWithNewCard={authorizeWithNewCard} />);

    expect(screen.getByText(/Pay cash to driver after ride/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Card Payment/i }));

    expect(screen.getByText(/Card charged after ride/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /0\.74/ }));

    expect(authorizeWithNewCard).toHaveBeenCalledTimes(1);
  });

  it("falls back to card when cash is not allowed", () => {
    render(<CambodiaPaymentHarness cashAllowed={false} />);

    expect(screen.queryByText(/Cash/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Card charged after ride/i)).toBeInTheDocument();
  });
});
