import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  response: {
    data: [] as unknown[] | null,
    error: null as Error | null,
  },
}));

vi.mock("@/integrations/supabase/client", () => {
  mocks.from.mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "limit", "gte", "lte", "ilike"]) {
      builder[method] = vi.fn(() => builder);
    }
    builder.then = (onFulfilled: (value: typeof mocks.response) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(mocks.response).then(onFulfilled, onRejected);
    return builder;
  });

  return {
    supabase: {
      auth: { getSession: mocks.getSession },
      from: mocks.from,
    },
  };
});

import { useP2PVehicleSearch } from "./useP2PBooking";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useP2PVehicleSearch public inventory boundary", () => {
  beforeEach(() => {
    mocks.from.mockClear();
    mocks.getSession.mockClear();
    mocks.response = { data: [], error: null };
  });

  it("queries approved public inventory without requiring a session", async () => {
    mocks.response = {
      data: [{
        id: "vehicle-1",
        make: "Toyota",
        model: "Corolla",
        year: 2025,
        daily_rate: 45,
      }],
      error: null,
    };

    const { result } = renderHook(() => useP2PVehicleSearch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith("p2p_vehicles");
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toHaveLength(1);
  });

  it("keeps a failed public query distinct from an empty result", async () => {
    mocks.response = { data: null, error: new Error("inventory unavailable") };

    const { result } = renderHook(() => useP2PVehicleSearch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("treats a successful public empty response as confirmed empty", async () => {
    const { result } = renderHook(() => useP2PVehicleSearch(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});
