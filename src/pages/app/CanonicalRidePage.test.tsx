import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  canEmbedRide: true,
  configuredRideUrl: "https://ride.zivo.test/" as string | null,
  currentUserId: "customer-a",
  localRideCandidate: null as string | null,
  navigate: vi.fn(),
  location: {
    pathname: "/rides/hub",
    search: "",
    hash: "",
    state: null,
  },
}));

const embedSessions = {
  "customer-a": "a".repeat(32),
  "customer-b": "b".repeat(32),
} as const;

vi.mock("react-router-dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...original,
    useLocation: () => testState.location,
    useNavigate: () => testState.navigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: testState.currentUserId },
  }),
}));

vi.mock("@/lib/rideEmbedSession", () => ({
  getOrCreateRideEmbedSession: (userId: keyof typeof embedSessions) =>
    embedSessions[userId],
}));

vi.mock("@/lib/zivoRideProductionBoundary", () => ({
  canEmbedRideApp: () => testState.canEmbedRide,
  getRideAuthorizeUrl: () => null,
  resolveLocalRideAppBaseUrl: () =>
    testState.localRideCandidate ? new URL(testState.localRideCandidate) : null,
  resolveRideAppBaseUrl: () =>
    testState.configuredRideUrl ? new URL(testState.configuredRideUrl) : null,
}));

import CanonicalRidePage from "./CanonicalRidePage";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  testState.canEmbedRide = true;
  testState.configuredRideUrl = "https://ride.zivo.test/";
  testState.currentUserId = "customer-a";
  testState.localRideCandidate = null;
  testState.location = {
    pathname: "/rides/hub",
    search: "",
    hash: "",
    state: null,
  };
  testState.navigate.mockReset();
  vi.unstubAllGlobals();
});

function getRideFrame(): HTMLIFrameElement {
  return screen.getByTitle("ZIVO Ride") as HTMLIFrameElement;
}

function expectRideMainContentTarget() {
  const targets = document.querySelectorAll("#main-content");
  expect(targets).toHaveLength(1);
  const main = screen.getByRole("main");
  expect(targets[0]).toBe(main);
  expect(main).toHaveAttribute("tabindex", "-1");
}

function postManageAccountMessage(
  source: MessageEventSource | null,
  origin: string,
  embedSession: string,
) {
  fireEvent(
    window,
    new MessageEvent("message", {
      data: {
        type: "zivo-ride:manage-account",
        embed_session: embedSession,
      },
      origin,
      source,
    }),
  );
}

function postNavigationMessage(
  source: MessageEventSource | null,
  origin: string,
  path = "/",
) {
  fireEvent(
    window,
    new MessageEvent("message", {
      data: {
        type: "zivo-ride:navigate",
        path,
      },
      origin,
      source,
    }),
  );
}

describe("CanonicalRidePage account isolation", () => {
  it("opens legacy Zivosmedia tracking links in the canonical Ride tracking screen", () => {
    const tripId = "550e8400-e29b-41d4-a716-446655440000";
    testState.location = {
      pathname: `/rides/track/${tripId}`,
      search: "?multi=Market%7CAirport&token=secret",
      hash: "#private",
      state: null,
    };

    render(<CanonicalRidePage />);

    const frameUrl = new URL(getRideFrame().src);
    expect(frameUrl.pathname).toBe(`/tracking/${tripId}`);
    expect(frameUrl.searchParams.get("multi")).toBe("Market|Airport");
    expect(frameUrl.searchParams.get("embed")).toBe("zivosmedia");
    expect(frameUrl.searchParams.get("embed_session")).toBe(
      embedSessions["customer-a"],
    );
    expect(frameUrl.searchParams.has("token")).toBe(false);

    const hostReturn = new URL(frameUrl.searchParams.get("host_return") ?? "");
    expect(hostReturn.pathname).toBe(`/rides/track/${tripId}`);
    expect(hostReturn.searchParams.get("multi")).toBe("Market|Airport");
    expect(hostReturn.searchParams.has("token")).toBe(false);
    expect(hostReturn.hash).toBe("");
  });

  it("opens legacy Zivosmedia quote links in canonical Ride history", () => {
    testState.location = {
      pathname: "/ride-quotes",
      search: "?token=secret",
      hash: "#private",
      state: null,
    };

    render(<CanonicalRidePage />);

    const frameUrl = new URL(getRideFrame().src);
    expect(frameUrl.pathname).toBe("/history");
    expect(frameUrl.searchParams.get("embed")).toBe("zivosmedia");
    expect(frameUrl.searchParams.get("embed_session")).toBe(
      embedSessions["customer-a"],
    );
    expect(frameUrl.searchParams.has("token")).toBe(false);

    const hostReturn = new URL(frameUrl.searchParams.get("host_return") ?? "");
    expect(hostReturn.pathname).toBe("/ride-quotes");
    expect(hostReturn.search).toBe("");
    expect(hostReturn.hash).toBe("");
  });

  it("keeps the opening mask aligned to the canonical Ride workflow", () => {
    render(<CanonicalRidePage />);

    expectRideMainContentTarget();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Opening ZIVO Ride");
    expect(status).toHaveTextContent("Set pickup");
    expect(status).toHaveTextContent("Choose ride");
    expect(status).toHaveTextContent("Pay");
    expect(status).toHaveTextContent("Track");
    expect(status).toHaveTextContent("Rate");
  });

  it("keeps the opening mask until the canonical Ride frame proves it is ready", () => {
    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;

    fireEvent.load(frame);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postNavigationMessage(frameWindow, "https://attacker.example");
    postNavigationMessage(null, rideOrigin);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postNavigationMessage(frameWindow, rideOrigin);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("replaces a stalled Ride frame with retry and Home recovery", () => {
    vi.useFakeTimers();
    render(<CanonicalRidePage />);
    const firstFrame = getRideFrame();
    const firstFrameWindow = firstFrame.contentWindow;
    const firstFrameSrc = firstFrame.src;

    fireEvent.load(firstFrame);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");
    expect(
      screen.getByRole("link", { name: "Return to ZIVO Home" }),
    ).toHaveAttribute("href", "/");

    act(() => vi.advanceTimersByTime(15_000));

    expectRideMainContentTarget();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "ZIVO Ride didn't open",
    );
    expect(screen.queryByTitle("ZIVO Ride")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to ZIVO Home" }),
    ).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const retriedFrame = getRideFrame();
    expect(retriedFrame).not.toBe(firstFrame);
    expect(retriedFrame.src).toBe(firstFrameSrc);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postNavigationMessage(firstFrameWindow, new URL(firstFrameSrc).origin);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "ZIVO Ride didn't open",
    );
  });

  it("never covers a Ride frame after its exact trusted readiness message", () => {
    vi.useFakeTimers();
    render(<CanonicalRidePage />);
    const frame = getRideFrame();

    postNavigationMessage(frame.contentWindow, new URL(frame.src).origin);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30_000));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getRideFrame()).toBe(frame);
  });

  it("prefers a verified matching local Ride app without a second handoff", async () => {
    testState.localRideCandidate = "http://localhost:5177/";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        '<!doctype html><meta name="application-name" content="ZIVO Ride" />',
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<CanonicalRidePage />);

    expectRideMainContentTarget();
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");
    await waitFor(() => {
      expect(new URL(getRideFrame().src).origin).toBe("http://localhost:5177");
    });
    expectRideMainContentTarget();

    const frameUrl = new URL(getRideFrame().src);
    expect(frameUrl.searchParams.get("embed")).toBe("zivosmedia");
    expect(frameUrl.searchParams.get("embed_session")).toBe(
      embedSessions["customer-a"],
    );
    expect(
      new URL(frameUrl.searchParams.get("host_return") ?? "").pathname,
    ).toBe("/rides/hub");
    expect(
      screen.queryByRole("heading", { name: "Continue to ZIVO Ride" }),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5177/",
      expect.objectContaining({
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      }),
    );
  });

  it("keeps the production handoff when the local port is not the Ride app", async () => {
    testState.localRideCandidate = "http://localhost:5177/";
    testState.canEmbedRide = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>Another app</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    render(<CanonicalRidePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Continue to ZIVO Ride" }),
      ).toBeInTheDocument();
    });
    expectRideMainContentTarget();
    expect(
      new URL(
        screen
          .getByRole("link", { name: "Open ZIVO Ride" })
          .getAttribute("href") ?? "",
      ).origin,
    ).toBe("https://ride.zivo.test");
  });

  it("offers a clean standalone handoff instead of mounting a blocked frame", () => {
    testState.canEmbedRide = false;
    testState.location = {
      pathname: "/rides/hub",
      search: "?destination=Airport&token=secret",
      hash: "#private",
      state: null,
    };

    render(<CanonicalRidePage />);

    expectRideMainContentTarget();
    expect(screen.queryByTitle("ZIVO Ride")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Continue to ZIVO Ride" }),
    ).toBeInTheDocument();
    const handoff = screen.getByRole("link", { name: "Open ZIVO Ride" });
    const handoffUrl = new URL(handoff.getAttribute("href") ?? "");
    expect(handoffUrl.origin).toBe("https://ride.zivo.test");
    expect(handoffUrl.searchParams.get("destination")).toBe("Airport");
    expect(handoffUrl.searchParams.has("token")).toBe(false);
    expect(handoffUrl.searchParams.has("embed")).toBe(false);
    expect(handoffUrl.searchParams.has("embed_session")).toBe(false);
    expect(handoffUrl.searchParams.has("host_return")).toBe(false);
    expect(
      screen.getByRole("link", { name: "Return to ZIVO Home" }),
    ).toHaveAttribute("href", "/");
  });

  it("keeps the skip target when Ride is not configured", () => {
    testState.configuredRideUrl = null;

    render(<CanonicalRidePage />);

    expectRideMainContentTarget();
    expect(
      screen.getByRole("heading", { name: "ZIVO Ride isn't connected" }),
    ).toBeInTheDocument();
  });

  it("replaces and masks the frame on an A-to-B account switch and accepts only B's exact account message", () => {
    const { rerender } = render(<CanonicalRidePage />);
    const frameA = getRideFrame();
    const frameAWindow = frameA.contentWindow;

    expect(new URL(frameA.src).searchParams.get("embed_session")).toBe(
      embedSessions["customer-a"],
    );
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postNavigationMessage(frameAWindow, new URL(frameA.src).origin);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    testState.currentUserId = "customer-b";
    rerender(<CanonicalRidePage />);

    const frameB = getRideFrame();
    const frameBWindow = frameB.contentWindow;
    const rideOrigin = new URL(frameB.src).origin;

    expect(frameB).not.toBe(frameA);
    expect(frameA.isConnected).toBe(false);
    expect(new URL(frameB.src).searchParams.get("embed_session")).toBe(
      embedSessions["customer-b"],
    );
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postManageAccountMessage(
      frameAWindow,
      rideOrigin,
      embedSessions["customer-a"],
    );
    postManageAccountMessage(
      frameBWindow,
      rideOrigin,
      embedSessions["customer-a"],
    );
    postManageAccountMessage(
      frameBWindow,
      "https://attacker.example",
      embedSessions["customer-b"],
    );
    expect(testState.navigate).not.toHaveBeenCalled();

    postManageAccountMessage(
      frameBWindow,
      rideOrigin,
      embedSessions["customer-b"],
    );
    expect(testState.navigate).toHaveBeenCalledOnce();
    expect(testState.navigate).toHaveBeenCalledWith("/account/settings");

    postNavigationMessage(frameBWindow, rideOrigin);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
