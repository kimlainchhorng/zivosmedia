import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

import {
  useMultiProviderHotelSearch,
  type MultiProviderSearchParams,
} from "./useMultiProviderHotelSearch";

const SEARCH: MultiProviderSearchParams = {
  citySlug: "phnom-penh",
  cityName: "Phnom Penh",
  checkIn: "2026-08-12",
  checkOut: "2026-08-15",
  adults: 2,
  rooms: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useMultiProviderHotelSearch", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "search-id" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports a complete supplier outage instead of a verified empty hotel result", async () => {
    invoke
      .mockResolvedValueOnce({ data: null, error: new Error("Hotelbeds unavailable") })
      .mockResolvedValueOnce({ data: null, error: new Error("RateHawk unavailable") });
    const { result } = renderHook(() => useMultiProviderHotelSearch());

    await act(async () => {
      await result.current.search(SEARCH);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toMatch(/temporarily unavailable/i);
    expect(result.current.results).toEqual([]);
    expect(result.current.searchResult).toBeNull();
  });

  it("keeps a verified empty response distinct when at least one supplier answered", async () => {
    invoke
      .mockResolvedValueOnce({ data: { data: { hotels: [] } }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("RateHawk unavailable") });
    const { result } = renderHook(() => useMultiProviderHotelSearch());

    await act(async () => {
      await result.current.search(SEARCH);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.searchResult?.supplierResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ supplier: "RATEHAWK", error: "RateHawk unavailable" }),
      ]),
    );
  });

  it("does not let a late prior-city search replace the current failure state", async () => {
    const firstHotelbeds = deferred<{ data: { hotels: [] }; error: null }>();
    const firstRateHawk = deferred<{ data: []; error: null }>();
    invoke
      .mockReturnValueOnce(firstHotelbeds.promise)
      .mockReturnValueOnce(firstRateHawk.promise)
      .mockResolvedValueOnce({ data: null, error: new Error("Hotelbeds unavailable") })
      .mockResolvedValueOnce({ data: null, error: new Error("RateHawk unavailable") });
    const { result } = renderHook(() => useMultiProviderHotelSearch());
    let firstSearch!: Promise<void>;

    act(() => {
      firstSearch = result.current.search(SEARCH);
    });

    await act(async () => {
      await result.current.search({ ...SEARCH, citySlug: "siem-reap", cityName: "Siem Reap" });
    });

    await act(async () => {
      firstHotelbeds.resolve({ data: { hotels: [] }, error: null });
      firstRateHawk.resolve({ data: [], error: null });
      await firstSearch;
    });

    expect(result.current.searchParams?.cityName).toBe("Siem Reap");
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toMatch(/temporarily unavailable/i);
  });
});
