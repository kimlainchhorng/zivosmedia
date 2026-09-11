import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const circuit = vi.hoisted(() => ({ state: "unavailable" as string }));
vi.mock("@/lib/realtime/connectionCircuit", () => ({
  liveUpdateSnapshot: () => circuit.state,
  subscribeLiveUpdates: () => () => {},
  retryLiveUpdates: vi.fn(),
  setRealtimeRouteActive: vi.fn(),
}));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ currentLanguage: "en" }) }));

import LiveUpdatesNotice from "./LiveUpdatesNotice";

/** A fixed, full-width route header — the chrome the notice must not cover. */
const HEADER_HEIGHT = 83;
function mountFixedHeader() {
  const header = document.createElement("header");
  header.style.position = "fixed";
  header.innerHTML = '<button type="button">Menu</button>';
  header.getBoundingClientRect = () =>
    ({ top: 0, bottom: HEADER_HEIGHT, height: HEADER_HEIGHT, width: window.innerWidth, left: 0, right: window.innerWidth, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(header);
  return header;
}

const renderNotice = () =>
  render(
    <MemoryRouter initialEntries={["/feed"]}>
      <LiveUpdatesNotice />
    </MemoryRouter>,
  );

beforeEach(() => { circuit.state = "unavailable"; });
afterEach(() => {
  cleanup();
  document.querySelectorAll("header").forEach((element) => element.remove());
});

describe("live updates notice", () => {
  it("never intercepts taps meant for the header underneath it", () => {
    mountFixedHeader();
    renderNotice();
    const notice = screen.getByRole("status");
    expect(notice.className).toContain("pointer-events-none");
  });

  it("keeps every control it renders clickable", () => {
    mountFixedHeader();
    renderNotice();
    // A Retry button that renders but cannot be clicked is a dead CTA, so the
    // container's pointer-events:none has to be re-enabled on *both* controls.
    for (const name of [/retry/i, /dismiss/i]) {
      expect(screen.getByRole("button", { name }).className).toContain("pointer-events-auto");
    }
  });

  it("renders below the fixed header instead of on top of it", () => {
    mountFixedHeader();
    renderNotice();
    expect(screen.getByRole("status").style.top).toBe(`${HEADER_HEIGHT}px`);
  });

  it("falls back to the safe-area inset when the route has no fixed header", () => {
    renderNotice();
    const notice = screen.getByRole("status");
    expect(notice.style.top).toBe("");
    expect(notice.className).toContain("top-[env(safe-area-inset-top)]");
  });

  it("stays hidden while live updates are healthy", () => {
    circuit.state = "connected";
    mountFixedHeader();
    renderNotice();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("offers no Retry while it is still reconnecting on its own", () => {
    circuit.state = "retrying";
    mountFixedHeader();
    renderNotice();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });
});
