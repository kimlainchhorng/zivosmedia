import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

import { useTripadvisorSearch } from "./useTripadvisorSearch";

const PHNOM_PENH_HOTEL = {
  location_id: "phnom-penh-hotel",
  name: "Phnom Penh Hotel",
  address_obj: {},
};

const SIEM_REAP_HOTEL = {
  location_id: "siem-reap-hotel",
  name: "Siem Reap Hotel",
  address_obj: {},
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useTripadvisorSearch", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps a failed hotel lookup distinct from a verified empty result", async () => {
    invoke
      .mockResolvedValueOnce({ data: { success: false, error: "Supplier unavailable" }, error: null })
      .mockResolvedValueOnce({ data: { success: true, data: [] }, error: null });
    const { result } = renderHook(() => useTripadvisorSearch());

    await act(async () => {
      await result.current.searchHotels("Phnom Penh");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("Supplier unavailable");
    expect(result.current.results).toEqual([]);

    await act(async () => {
      await result.current.searchHotels("Siem Reap");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
    expect(invoke).toHaveBeenLastCalledWith("search-hotels", {
      body: { query: "Siem Reap", category: "hotels" },
    });
  });

  it("does not let a late prior search overwrite the current result", async () => {
    const firstResponse = deferred<{
      data: { success: true; data: typeof PHNOM_PENH_HOTEL[] };
      error: null;
    }>();
    invoke
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValueOnce({ data: { success: true, data: [SIEM_REAP_HOTEL] }, error: null });
    const { result } = renderHook(() => useTripadvisorSearch());
    let firstSearch!: Promise<unknown>;

    act(() => {
      firstSearch = result.current.searchHotels("Phnom Penh");
    });

    await act(async () => {
      await result.current.searchHotels("Siem Reap");
    });

    await act(async () => {
      firstResponse.resolve({ data: { success: true, data: [PHNOM_PENH_HOTEL] }, error: null });
      await firstSearch;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([SIEM_REAP_HOTEL]);
  });

  it("cancels in-flight state updates when results are cleared", async () => {
    const response = deferred<{
      data: { success: true; data: typeof PHNOM_PENH_HOTEL[] };
      error: null;
    }>();
    invoke.mockReturnValueOnce(response.promise);
    const { result } = renderHook(() => useTripadvisorSearch());
    let search!: Promise<unknown>;

    act(() => {
      search = result.current.searchHotels("Phnom Penh");
      result.current.clearResults();
    });

    await act(async () => {
      response.resolve({ data: { success: true, data: [PHNOM_PENH_HOTEL] }, error: null });
      await search;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual([]);
  });
});
