import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

import { LodgingCutluyCheckout } from "./LodgingCutluyCheckout";

const paymentId = "PUETcMUOKStjZsCb1234";

describe("LodgingCutluyCheckout scanned status", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({
      data: {
        id: paymentId,
        status: "scanned",
        amount_cents: 150,
        currency: "USD",
        checkout_url: `https://cutluy.com/pay/${paymentId}`,
        qr_string:
          "00020101021229180014cutluy.example52040000530384054041.505802KH6304AB12",
        expires_at: null,
      },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows that a scan is not payment and never renders confirmation", async () => {
    render(
      <LodgingCutluyCheckout
        reservationId="618989f6-02ea-48d2-bf60-020fc0fc5884"
        reservationRef="ZIVO-1024"
        amountCents={150}
        paymentStatus="pending"
        reservationStatus="hold"
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Finish $1.50 USD",
      }),
    ).toBeInTheDocument();
    const scanMessage = screen.getByText(
      "Scan detected — payment is not complete.",
    );
    expect(scanMessage).toBeInTheDocument();
    expect(scanMessage.closest('[role="status"]')).not.toBeNull();
    expect(
      screen.getByText(/Finish approval in your banking app/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Open any KHQR-supported Cambodian banking app/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh payment" }),
    ).toBeEnabled();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("create-lodging-cutluy-payment", {
      body: {
        reservation_id: "618989f6-02ea-48d2-bf60-020fc0fc5884",
      },
    });
  });
});
