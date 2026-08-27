import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEED_CARD_HYDRATION_ROOT_MARGIN,
  useFeedCardHydration,
} from "./useFeedCardHydration";

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
  options?: IntersectionObserverInit;
};

let observerRecords: ObserverRecord[] = [];

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly takeRecords = vi.fn(() => []);
  readonly unobserve = vi.fn();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? "0px";
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    observerRecords.push({
      callback,
      disconnect: this.disconnect,
      observe: this.observe,
      options,
    });
  }
}

function HydrationHarness({ force = false }: { force?: boolean }) {
  const { hydrationRef, shouldHydrate } = useFeedCardHydration(force);
  return (
    <div
      ref={hydrationRef}
      data-testid="feed-card"
      data-hydrated={String(shouldHydrate)}
    />
  );
}

const emitIntersection = (record: ObserverRecord, isIntersecting: boolean) => {
  const target = screen.getByTestId("feed-card");
  record.callback(
    [{ isIntersecting, target } as unknown as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
};

describe("useFeedCardHydration", () => {
  beforeEach(() => {
    observerRecords = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("waits outside the hydration range and activates once on intersection", () => {
    render(<HydrationHarness />);

    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "false",
    );
    expect(observerRecords).toHaveLength(1);
    expect(observerRecords[0].options).toEqual({
      rootMargin: FEED_CARD_HYDRATION_ROOT_MARGIN,
      threshold: 0,
    });
    expect(observerRecords[0].observe).toHaveBeenCalledWith(
      screen.getByTestId("feed-card"),
    );

    act(() => emitIntersection(observerRecords[0], false));
    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "false",
    );

    act(() => emitIntersection(observerRecords[0], true));
    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    expect(observerRecords[0].disconnect).toHaveBeenCalled();
    expect(observerRecords).toHaveLength(1);

    act(() => emitIntersection(observerRecords[0], false));
    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
  });

  it("hydrates detail mode immediately without constructing an observer", () => {
    render(<HydrationHarness force />);

    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    expect(observerRecords).toHaveLength(0);
  });

  it("hydrates when detail mode turns on and disconnects the pending observer", () => {
    const rendered = render(<HydrationHarness />);
    const pendingObserver = observerRecords[0];

    rendered.rerender(<HydrationHarness force />);

    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    expect(pendingObserver.disconnect).toHaveBeenCalled();
  });

  it("fails open when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<HydrationHarness />);

    expect(screen.getByTestId("feed-card")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    expect(observerRecords).toHaveLength(0);
  });

  it("disconnects a pending observer when the card unmounts", () => {
    const rendered = render(<HydrationHarness />);
    const pendingObserver = observerRecords[0];

    rendered.unmount();

    expect(pendingObserver.disconnect).toHaveBeenCalled();
  });
});

describe("Feed card personalization hydration contract", () => {
  it("gates every viewer-specific card read and keys state to the viewer", () => {
    const feedSource = readFileSync(
      path.join(process.cwd(), "src/pages/ReelsFeedPage.tsx"),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(feedSource).toContain(
      'import { useFeedCardHydration } from "@/hooks/useFeedCardHydration";',
    );
    expect(feedSource).toContain(
      "const { hydrationRef, shouldHydrate } = useFeedCardHydration(Boolean(detailMode));",
    );
    expect(feedSource).toContain("ref={hydrationRef}");
    expect(feedSource.match(/if \(!shouldHydrate\) return;/g)).toHaveLength(6);
    expect(feedSource).toContain('key={`${userId ?? "guest"}:${item.id}`}');
    expect(feedSource).toContain('key={`${userId ?? "guest"}:${post.id}`}');
  });
});
