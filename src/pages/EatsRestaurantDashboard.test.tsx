import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

type RestaurantRead = Promise<{
  data: Record<string, unknown> | null;
  error: { message: string } | null;
}>;

const testState = vi.hoisted(() => ({
  currentUserId: "owner-a",
  restaurantReads: [] as RestaurantRead[],
  from: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: testState.currentUserId } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => testState.from(...args),
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import EatsRestaurantDashboard from "./EatsRestaurantDashboard";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  testState.currentUserId = "owner-a";
  testState.restaurantReads = [];
  testState.from.mockReset();
});

describe("Eats restaurant dashboard account isolation", () => {
  it.each([
    ["has no restaurant", { data: null, error: null }],
    ["restaurant lookup fails", { data: null, error: { message: "failed" } }],
  ])(
    "keeps account B empty when B %s and account A resolves late",
    async (_scenario, accountBResult) => {
      const accountARead = deferred<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>();
      testState.restaurantReads = [
        accountARead.promise,
        Promise.resolve(accountBResult),
      ];
      testState.from.mockImplementation((table: string) => {
        if (table !== "restaurants") {
          throw new Error(`Unexpected table read: ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                const next = testState.restaurantReads.shift();
                if (!next) throw new Error("Unexpected restaurant read");
                return next;
              },
            }),
          }),
        };
      });

      const view = render(
        <MemoryRouter>
          <EatsRestaurantDashboard />
        </MemoryRouter>,
      );

      await waitFor(() => expect(testState.from).toHaveBeenCalledTimes(1));
      testState.currentUserId = "owner-b";
      view.rerender(
        <MemoryRouter>
          <EatsRestaurantDashboard />
        </MemoryRouter>,
      );

      await screen.findByText("No Restaurant Found");
      expect(screen.queryByText("Account A Private Restaurant")).toBeNull();

      await act(async () => {
        accountARead.resolve({
          data: {
            id: "restaurant-a",
            owner_id: "owner-a",
            name: "Account A Private Restaurant",
          },
          error: null,
        });
        await accountARead.promise;
      });

      expect(screen.getByText("No Restaurant Found")).toBeInTheDocument();
      expect(screen.queryByText("Account A Private Restaurant")).toBeNull();
      expect(testState.from).toHaveBeenCalledTimes(2);
    },
  );

  it("removes an already-rendered account A dashboard immediately when account B becomes current", async () => {
    const accountBRead = deferred<{
      data: Record<string, unknown> | null;
      error: { message: string } | null;
    }>();
    testState.restaurantReads = [
      Promise.resolve({
        data: {
          id: "restaurant-a",
          owner_id: "owner-a",
          name: "Account A Private Restaurant",
        },
        error: null,
      }),
      accountBRead.promise,
    ];
    testState.from.mockImplementation((table: string) => {
      if (table === "restaurants") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => {
                const next = testState.restaurantReads.shift();
                if (!next) throw new Error("Unexpected restaurant read");
                return next;
              },
            }),
          }),
        };
      }
      if (table === "menu_items") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "food_orders") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table read: ${table}`);
    });

    const view = render(
      <MemoryRouter>
        <EatsRestaurantDashboard />
      </MemoryRouter>,
    );
    await screen.findByText("Account A Private Restaurant");

    testState.currentUserId = "owner-b";
    view.rerender(
      <MemoryRouter>
        <EatsRestaurantDashboard />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Account A Private Restaurant")).toBeNull();

    await act(async () => {
      accountBRead.resolve({ data: null, error: null });
      await accountBRead.promise;
    });
    await screen.findByText("No Restaurant Found");
    expect(screen.queryByText("Account A Private Restaurant")).toBeNull();
  });
});
