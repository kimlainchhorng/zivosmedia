/**
 * Regression tests for route-prefetch cancellation.
 *
 * Both effects scheduled work with `requestIdleCallback`, falling back to
 * `setTimeout`, but cleaned up by calling only `cancelIdleCallback`. On the
 * fallback path the handle is a timeout id, which `cancelIdleCallback`
 * ignores — so unmounting never cancelled the prefetch. Any environment
 * without `requestIdleCallback` takes that path; jsdom is one, which is how
 * this surfaced (a timer fired after teardown and threw
 * "window is not defined").
 *
 * These assert the schedule/cancel pair directly rather than the loaders,
 * which are dynamic imports of real page chunks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockLocation = { pathname: "/" };

vi.mock("react-router-dom", () => ({
  useLocation: () => mockLocation,
}));

import { useRoutePrefetch } from "./RoutePrefetcher";

/** Timeout ids the prefetcher created, keyed by the delay it used. */
function idsScheduledWithDelay(spy: ReturnType<typeof vi.spyOn>, delay: number): number[] {
  return spy.mock.results
    .filter((_, i) => spy.mock.calls[i]?.[1] === delay)
    .map((r) => r.value as number);
}

describe("useRoutePrefetch cancellation", () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;
  let clearTimeoutSpy: ReturnType<typeof vi.spyOn>;
  let originalRIC: unknown;

  beforeEach(() => {
    // Force the fallback path — the one that leaked.
    originalRIC = (window as unknown as Record<string, unknown>).requestIdleCallback;
    delete (window as unknown as Record<string, unknown>).requestIdleCallback;

    vi.useFakeTimers();
    setTimeoutSpy = vi.spyOn(window, "setTimeout");
    clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    mockLocation.pathname = "/";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalRIC !== undefined) {
      (window as unknown as Record<string, unknown>).requestIdleCallback = originalRIC;
    }
  });

  it("clears the homepage prefetch timer on unmount", () => {
    const { unmount } = renderHook(() => useRoutePrefetch());

    const scheduled = idsScheduledWithDelay(setTimeoutSpy, 200);
    expect(scheduled).toHaveLength(1);

    unmount();

    // The old cleanup called cancelIdleCallback(handle) here, which ignores a
    // timeout id, so the callback still ran.
    expect(clearTimeoutSpy).toHaveBeenCalledWith(scheduled[0]);
  });

  it("does not run the homepage prefetch after unmount", () => {
    const { unmount } = renderHook(() => useRoutePrefetch());
    unmount();

    // If the timer were still live this would throw or prefetch; the point is
    // that draining the clock after teardown is inert.
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });

  it("clears the staggered feed prefetch timers on unmount", () => {
    mockLocation.pathname = "/feed";
    const { unmount } = renderHook(() => useRoutePrefetch());

    const outer = idsScheduledWithDelay(setTimeoutSpy, 600);
    expect(outer).toHaveLength(4);

    // Let the four idle callbacks fire; each schedules an inner staggered
    // timer that the old code never tracked at all — those ran after unmount
    // on every browser, not just ones lacking requestIdleCallback.
    vi.advanceTimersByTime(600);

    const inner = [0, 100, 200, 300].flatMap((d) => idsScheduledWithDelay(setTimeoutSpy, d));
    expect(inner.length).toBeGreaterThan(0);

    unmount();

    for (const id of inner) {
      expect(clearTimeoutSpy).toHaveBeenCalledWith(id);
    }
  });

  it("uses cancelIdleCallback when requestIdleCallback exists", () => {
    const cancelIdle = vi.fn();
    (window as unknown as Record<string, unknown>).requestIdleCallback = vi.fn(() => 42);
    (window as unknown as Record<string, unknown>).cancelIdleCallback = cancelIdle;

    const { unmount } = renderHook(() => useRoutePrefetch());
    unmount();

    expect(cancelIdle).toHaveBeenCalledWith(42);
  });
});
