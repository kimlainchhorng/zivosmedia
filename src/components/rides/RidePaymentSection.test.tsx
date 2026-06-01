import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RidePaymentSection, { type CambodiaPaymentMethod } from "./RidePaymentSection";

const mockAuth = vi.hoisted(() => ({
  user: { id: "test-user", user_metadata: {} } as null | { id: string; user_metadata: Record<string, unknown> },
  isLoading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
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

beforeEach(() => {
  mockAuth.user = { id: "test-user", user_metadata: {} };
  mockAuth.isLoading = false;
});

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current path">{`${location.pathname}${location.search}`}</output>;
}

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

describe("RidePaymentSection guest auth handoff", () => {
  it("sends Sign Up Free to signup while preserving the ride checkout path", () => {
    mockAuth.user = null;

    render(
      <MemoryRouter initialEntries={["/rides/request?pickup=now"]}>
        <RidePaymentSection
          price={12}
          vehicleName="ZIVO Ride"
          isSubmitting={false}
          onAuthorizeWithSavedCard={vi.fn()}
          onAuthorizeWithNewCard={vi.fn()}
          clientSecret={null}
          onPaymentSuccess={vi.fn()}
          paymentFailed={false}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign Up Free/i }));

    expect(screen.getByLabelText("current path")).toHaveTextContent(
      "/signup?redirect=%2Frides%2Frequest%3Fpickup%3Dnow",
    );
  });
});
