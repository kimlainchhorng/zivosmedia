import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  currentUserId: "driver-a",
  invoke: vi.fn(),
  loadOwnPayoutMethods: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: testState.currentUserId } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => testState.invoke(...args) },
    auth: { getUser: vi.fn() },
  },
}));

vi.mock("@/lib/payoutMethods", () => ({
  loadOwnPayoutMethods: (...args: unknown[]) =>
    testState.loadOwnPayoutMethods(...args),
}));

vi.mock("@/hooks/useStepUpMfa", () => ({
  useStepUpMfa: () => ({
    ensureAal2: vi.fn(),
    dialog: null,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import DriverPayoutsPage from "./DriverPayoutsPage";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function payoutMethod(id: string, label: string, last4: string) {
  return {
    id,
    user_id: id,
    store_id: null,
    method_type: "aba",
    rail: "aba",
    label,
    bank_name: "ABA Bank",
    account_holder_name: `${label} holder`,
    destination_last4: last4,
    country_code: "KH",
    is_default: true,
    is_verified: true,
    verification_status: "verified",
    verification_note: null,
    verified_at: null,
    created_at: "2026-08-30T00:00:00.000Z",
    updated_at: "2026-08-30T00:00:00.000Z",
  };
}

afterEach(() => {
  cleanup();
  testState.currentUserId = "driver-a";
  testState.invoke.mockReset();
  testState.loadOwnPayoutMethods.mockReset();
});

describe("Driver payout account isolation", () => {
  it("clears account A immediately and ignores A's late destination after switching to B", async () => {
    const accountAMethods = deferred<ReturnType<typeof payoutMethod>[]>();
    testState.invoke
      .mockResolvedValueOnce({
        data: {
          connected: true,
          payouts_enabled: true,
          charges_enabled: true,
          details_submitted: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: { connected: false }, error: null });
    testState.loadOwnPayoutMethods
      .mockReturnValueOnce(accountAMethods.promise)
      .mockResolvedValueOnce([
        payoutMethod("driver-b", "Driver B ABA", "2222"),
      ]);

    const view = render(
      <MemoryRouter>
        <DriverPayoutsPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(testState.loadOwnPayoutMethods).toHaveBeenCalledTimes(1),
    );

    testState.currentUserId = "driver-b";
    view.rerender(
      <MemoryRouter>
        <DriverPayoutsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Driver A ABA")).not.toBeInTheDocument();
    await screen.findByText("Driver B ABA");
    expect(screen.getByText("Complete onboarding")).toBeInTheDocument();

    await act(async () => {
      accountAMethods.resolve([
        payoutMethod("driver-a", "Driver A ABA", "1111"),
      ]);
      await accountAMethods.promise;
    });

    expect(screen.queryByText("Driver A ABA")).not.toBeInTheDocument();
    expect(screen.getByText("Driver B ABA")).toBeInTheDocument();
    expect(screen.queryByText("•••• 1111")).not.toBeInTheDocument();
    expect(screen.getByText(/•••• 2222/)).toBeInTheDocument();
  });
});
