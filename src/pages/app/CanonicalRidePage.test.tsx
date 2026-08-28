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
  authorizeUrl: null as string | null,
  canEmbedRide: true,
  configuredRideUrl: "https://ride.zivo.test/" as string | null,
  currentUserId: "customer-a",
  isNativeAuthorizationParent: false,
  issueNativeRideAuthorization: vi.fn(),
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
const NATIVE_OAUTH_STATE = "native_oauth_state_".padEnd(32, "s");

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
  getRideAuthorizeUrl: () =>
    testState.authorizeUrl ? new URL(testState.authorizeUrl) : null,
  resolveLocalRideAppBaseUrl: () =>
    testState.localRideCandidate ? new URL(testState.localRideCandidate) : null,
  resolveRideAppBaseUrl: () =>
    testState.configuredRideUrl ? new URL(testState.configuredRideUrl) : null,
}));

vi.mock("@/lib/nativeRideAuthorization", () => ({
  isNativeRideAuthorizationParent: () => testState.isNativeAuthorizationParent,
  issueNativeRideAuthorization: (...args: unknown[]) =>
    testState.issueNativeRideAuthorization(...args),
}));

import CanonicalRidePage from "./CanonicalRidePage";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  testState.authorizeUrl = null;
  testState.canEmbedRide = true;
  testState.configuredRideUrl = "https://ride.zivo.test/";
  testState.currentUserId = "customer-a";
  testState.isNativeAuthorizationParent = false;
  testState.issueNativeRideAuthorization.mockReset();
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

function postEmbedChallengeMessage(
  source: MessageEventSource | null,
  origin: string,
  embedSession: unknown,
  nonce: unknown,
) {
  fireEvent(
    window,
    new MessageEvent("message", {
      data: {
        type: "zivo-ride:embed-challenge",
        embed_session: embedSession,
        nonce,
      },
      origin,
      source,
    }),
  );
}

function nativeAuthorizeUrl() {
  const url = new URL("https://zivosmedia.com/auth/zivosmedia/authorize");
  url.searchParams.set("app_key", "zivo_ride");
  url.searchParams.set(
    "redirect_uri",
    "https://ride.zivo.test/auth/callback?source=zivosmedia",
  );
  url.searchParams.set("state", NATIVE_OAUTH_STATE);
  url.searchParams.set("code_challenge", "c".repeat(43));
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

function postAuthorizeMessage(
  source: MessageEventSource | null,
  origin: string,
  embedSession: unknown,
) {
  fireEvent(
    window,
    new MessageEvent("message", {
      data: {
        type: "zivo-ride:authorize",
        url: testState.authorizeUrl,
        embed_session: embedSession,
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

  it("confirms an exact trusted Ride embed challenge", () => {
    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;
    const nonce = "native_embed_nonce_".padEnd(32, "a");
    const postMessageSpy = vi
      .spyOn(frameWindow, "postMessage")
      .mockImplementation(() => undefined);

    postEmbedChallengeMessage(
      frameWindow,
      rideOrigin,
      embedSessions["customer-a"],
      nonce,
    );

    expect(postMessageSpy).toHaveBeenCalledOnce();
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: "zivo-ride:embed-confirm",
        embed_session: embedSessions["customer-a"],
        nonce,
      },
      rideOrigin,
    );
  });

  it("ignores Ride embed challenges with the wrong source, origin, session, or nonce", () => {
    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;
    const validNonce = "native_embed_nonce_".padEnd(32, "a");
    const postMessageSpy = vi
      .spyOn(frameWindow, "postMessage")
      .mockImplementation(() => undefined);

    postEmbedChallengeMessage(
      null,
      rideOrigin,
      embedSessions["customer-a"],
      validNonce,
    );
    postEmbedChallengeMessage(
      frameWindow,
      "https://attacker.example",
      embedSessions["customer-a"],
      validNonce,
    );
    postEmbedChallengeMessage(
      frameWindow,
      rideOrigin,
      embedSessions["customer-b"],
      validNonce,
    );
    postEmbedChallengeMessage(frameWindow, rideOrigin, undefined, validNonce);
    postEmbedChallengeMessage(
      frameWindow,
      rideOrigin,
      embedSessions["customer-a"],
      "too-short",
    );
    postEmbedChallengeMessage(
      frameWindow,
      rideOrigin,
      embedSessions["customer-a"],
      "invalid+nonce".padEnd(32, "a"),
    );
    postEmbedChallengeMessage(
      frameWindow,
      rideOrigin,
      embedSessions["customer-a"],
      "a".repeat(129),
    );

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("relays a server-issued authorization result only to the exact native Ride frame", async () => {
    const authorizeUrl = nativeAuthorizeUrl();
    testState.authorizeUrl = authorizeUrl.toString();
    testState.isNativeAuthorizationParent = true;
    testState.issueNativeRideAuthorization.mockResolvedValue({
      type: "zivo-ride:authorize-result",
      ok: true,
      code: "a".repeat(43),
      state: NATIVE_OAUTH_STATE,
      redirect_uri: "https://ride.zivo.test/auth/callback?source=zivosmedia",
    });

    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;
    const postMessageSpy = vi
      .spyOn(frameWindow, "postMessage")
      .mockImplementation(() => undefined);

    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);

    await waitFor(() => {
      expect(testState.issueNativeRideAuthorization).toHaveBeenCalledWith(
        expect.objectContaining({
          search: authorizeUrl.search,
        }),
        rideOrigin,
        "customer-a",
        expect.any(AbortSignal),
      );
    });
    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: "zivo-ride:authorize-result",
          ok: true,
          embed_session: embedSessions["customer-a"],
          code: "a".repeat(43),
          state: NATIVE_OAUTH_STATE,
          redirect_uri:
            "https://ride.zivo.test/auth/callback?source=zivosmedia",
        },
        rideOrigin,
      );
    });

    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);
    await waitFor(() => {
      expect(testState.issueNativeRideAuthorization).toHaveBeenCalledTimes(2);
      expect(postMessageSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("rejects native authorization from the wrong source, origin, or embed session", async () => {
    testState.authorizeUrl = nativeAuthorizeUrl().toString();
    testState.isNativeAuthorizationParent = true;
    testState.issueNativeRideAuthorization.mockResolvedValue({
      type: "zivo-ride:authorize-result",
      ok: false,
      state: NATIVE_OAUTH_STATE,
      error: "authorization_unavailable",
    });

    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;
    const postMessageSpy = vi
      .spyOn(frameWindow, "postMessage")
      .mockImplementation(() => undefined);

    postAuthorizeMessage(null, rideOrigin, embedSessions["customer-a"]);
    postAuthorizeMessage(
      frameWindow,
      "https://attacker.example",
      embedSessions["customer-a"],
    );
    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-b"]);

    expect(testState.issueNativeRideAuthorization).not.toHaveBeenCalled();

    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);
    await waitFor(() => {
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: "zivo-ride:authorize-result",
          ok: false,
          embed_session: embedSessions["customer-a"],
          state: NATIVE_OAUTH_STATE,
          error: "authorization_unavailable",
        },
        rideOrigin,
      );
    });
  });

  it("allows only one native authorization request per frame generation", async () => {
    testState.authorizeUrl = nativeAuthorizeUrl().toString();
    testState.isNativeAuthorizationParent = true;
    let resolveAuthorization:
      | ((value: {
          type: "zivo-ride:authorize-result";
          ok: true;
          code: string;
          state: string;
          redirect_uri: string;
        }) => void)
      | undefined;
    testState.issueNativeRideAuthorization.mockReturnValue(
      new Promise((resolve) => {
        resolveAuthorization = resolve;
      }),
    );

    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;

    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);
    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);

    expect(testState.issueNativeRideAuthorization).toHaveBeenCalledOnce();
    resolveAuthorization?.({
      type: "zivo-ride:authorize-result",
      ok: true,
      code: "a".repeat(43),
      state: NATIVE_OAUTH_STATE,
      redirect_uri: "https://ride.zivo.test/auth/callback?source=zivosmedia",
    });
    await waitFor(() => {
      expect(testState.issueNativeRideAuthorization).toHaveBeenCalledOnce();
    });
  });

  it("suppresses a late native authorization result after an account switch", async () => {
    testState.authorizeUrl = nativeAuthorizeUrl().toString();
    testState.isNativeAuthorizationParent = true;
    let resolveAuthorization:
      | ((value: {
          type: "zivo-ride:authorize-result";
          ok: true;
          code: string;
          state: string;
          redirect_uri: string;
        }) => void)
      | undefined;
    testState.issueNativeRideAuthorization.mockReturnValue(
      new Promise((resolve) => {
        resolveAuthorization = resolve;
      }),
    );

    const { rerender } = render(<CanonicalRidePage />);
    const frameA = getRideFrame();
    const frameAWindow = frameA.contentWindow;
    const rideOrigin = new URL(frameA.src).origin;
    const oldFramePostMessage = vi
      .spyOn(frameAWindow, "postMessage")
      .mockImplementation(() => undefined);
    postAuthorizeMessage(frameAWindow, rideOrigin, embedSessions["customer-a"]);

    const requestSignal = testState.issueNativeRideAuthorization.mock
      .calls[0]?.[3] as AbortSignal;
    testState.currentUserId = "customer-b";
    rerender(<CanonicalRidePage />);
    expect(getRideFrame()).not.toBe(frameA);
    expect(requestSignal.aborted).toBe(true);

    resolveAuthorization?.({
      type: "zivo-ride:authorize-result",
      ok: true,
      code: "a".repeat(43),
      state: NATIVE_OAUTH_STATE,
      redirect_uri: "https://ride.zivo.test/auth/callback?source=zivosmedia",
    });
    await act(async () => Promise.resolve());

    expect(oldFramePostMessage).not.toHaveBeenCalled();
  });

  it("suppresses a late native authorization result after the frame becomes stale", async () => {
    vi.useFakeTimers();
    testState.authorizeUrl = nativeAuthorizeUrl().toString();
    testState.isNativeAuthorizationParent = true;
    let resolveAuthorization:
      | ((value: {
          type: "zivo-ride:authorize-result";
          ok: true;
          code: string;
          state: string;
          redirect_uri: string;
        }) => void)
      | undefined;
    testState.issueNativeRideAuthorization.mockReturnValue(
      new Promise((resolve) => {
        resolveAuthorization = resolve;
      }),
    );

    render(<CanonicalRidePage />);
    const frame = getRideFrame();
    const frameWindow = frame.contentWindow;
    const rideOrigin = new URL(frame.src).origin;
    const postMessageSpy = vi
      .spyOn(frameWindow, "postMessage")
      .mockImplementation(() => undefined);
    postAuthorizeMessage(frameWindow, rideOrigin, embedSessions["customer-a"]);

    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.queryByTitle("ZIVO Ride")).not.toBeInTheDocument();

    resolveAuthorization?.({
      type: "zivo-ride:authorize-result",
      ok: true,
      code: "a".repeat(43),
      state: NATIVE_OAUTH_STATE,
      redirect_uri: "https://ride.zivo.test/auth/callback?source=zivosmedia",
    });
    await act(async () => Promise.resolve());

    expect(postMessageSpy).not.toHaveBeenCalled();
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
