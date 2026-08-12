import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

import { useNearbyGroceryStores } from "./useNearbyGroceryStores";

type StoreResponse = {
  data: {
    ok: true;
    stores: Record<string, Array<{
      place_id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      distance_miles: number;
      rating: number;
      open_now: boolean;
    }>>;
  };
  error: null;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function storesFor(placeId: string, distanceMiles: number): StoreResponse {
  return {
    data: {
      ok: true,
      stores: {
        walmart: [{
          place_id: placeId,
          name: `Walmart ${placeId}`,
          address: `${placeId} Main St`,
          lat: 11,
          lng: 22,
          distance_miles: distanceMiles,
          rating: 4.5,
          open_now: true,
        }],
      },
    },
    error: null,
  };
}

describe("useNearbyGroceryStores request isolation", () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the latest address's stores when an earlier lookup finishes later", async () => {
    const first = deferred<StoreResponse>();
    invoke
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(storesFor("new-address", 1));
    const { result } = renderHook(() => useNearbyGroceryStores());
    let firstLookup!: Promise<unknown>;

    act(() => {
      firstLookup = result.current.fetchNearbyStores(11, 22);
    });

    await act(async () => {
      await result.current.fetchNearbyStores(33, 44);
    });

    await act(async () => {
      first.resolve(storesFor("old-address", 2));
      await firstLookup;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.stores.map((store) => store.place_id)).toEqual(["new-address"]);
  });

  it("does not let an old failure clear the current lookup's loading state", async () => {
    const first = deferred<StoreResponse>();
    const second = deferred<StoreResponse>();
    invoke
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useNearbyGroceryStores());
    let firstLookup!: Promise<unknown>;
    let secondLookup!: Promise<unknown>;

    act(() => {
      firstLookup = result.current.fetchNearbyStores(11, 22);
      secondLookup = result.current.fetchNearbyStores(33, 44);
    });

    await act(async () => {
      first.reject(new Error("Old address unavailable"));
      await firstLookup;
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      second.resolve(storesFor("new-address", 1));
      await secondLookup;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.stores.map((store) => store.place_id)).toEqual(["new-address"]);
  });
});
