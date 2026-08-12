import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { completeZivoAiChat, toastError } = vi.hoisted(() => ({
  completeZivoAiChat: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/zivoAiChat", () => ({ completeZivoAiChat }));
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

import { useAITripSuggestions } from "./useAITripSuggestions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function suggestion(city: string, airportCode: string) {
  return JSON.stringify([{
    id: city.toLowerCase(),
    city,
    country: "Cambodia",
    airportCode,
    price: 200,
    rating: 4.6,
    tags: ["Culture"],
    weather: "Warm",
    bestFor: ["Explorers"],
    matchScore: 91,
    flightTime: "2h",
    description: `${city} plan`,
  }]);
}

describe("useAITripSuggestions request isolation", () => {
  beforeEach(() => {
    completeZivoAiChat.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the newest successful recommendation set when an older request finishes later", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    completeZivoAiChat
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useAITripSuggestions());
    let firstRequest!: Promise<unknown>;
    let secondRequest!: Promise<unknown>;

    act(() => {
      firstRequest = result.current.fetchSuggestions({ origin: "Old city" });
      secondRequest = result.current.fetchSuggestions({ origin: "New city" });
    });

    await act(async () => {
      second.resolve(suggestion("Siem Reap", "REP"));
      await secondRequest;
    });

    await act(async () => {
      first.resolve(suggestion("Phnom Penh", "PNH"));
      await firstRequest;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.destinations.map((destination) => destination.city)).toEqual(["Siem Reap"]);
  });

  it("does not show a stale failure after a newer request succeeds", async () => {
    const first = deferred<string>();
    completeZivoAiChat
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(suggestion("Siem Reap", "REP"));
    const { result } = renderHook(() => useAITripSuggestions());
    let firstRequest!: Promise<unknown>;

    act(() => {
      firstRequest = result.current.fetchSuggestions({ origin: "Old city" });
    });

    await act(async () => {
      await result.current.fetchSuggestions({ origin: "New city" });
    });

    await act(async () => {
      first.reject(new Error("Old provider failed"));
      await firstRequest;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.destinations.map((destination) => destination.city)).toEqual(["Siem Reap"]);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("invalidates a pending request when the hook unmounts", async () => {
    const pending = deferred<string>();
    completeZivoAiChat.mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useAITripSuggestions());
    let request!: Promise<unknown>;

    act(() => {
      request = result.current.fetchSuggestions({ origin: "Phnom Penh" });
    });
    unmount();

    await act(async () => {
      pending.resolve(suggestion("Phnom Penh", "PNH"));
      await request;
    });

    expect(toastError).not.toHaveBeenCalled();
  });
});
