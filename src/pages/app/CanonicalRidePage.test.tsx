import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  currentUserId: "customer-a",
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
  getOrCreateRideEmbedSession: (userId: keyof typeof embedSessions) => embedSessions[userId],
}));

vi.mock("@/lib/zivoRideProductionBoundary", () => ({
  getRideAuthorizeUrl: () => null,
  resolveRideAppBaseUrl: () => new URL("https://ride.zivo.test/"),
}));

import CanonicalRidePage from "./CanonicalRidePage";

afterEach(() => {
  cleanup();
  testState.currentUserId = "customer-a";
  testState.location = {
    pathname: "/rides/hub",
    search: "",
    hash: "",
    state: null,
  };
  testState.navigate.mockReset();
});

function getRideFrame(): HTMLIFrameElement {
  return screen.getByTitle("ZIVO Ride") as HTMLIFrameElement;
}

function postManageAccountMessage(
  source: MessageEventSource | null,
  origin: string,
  embedSession: string,
) {
  fireEvent(window, new MessageEvent("message", {
    data: {
      type: "zivo-ride:manage-account",
      embed_session: embedSession,
    },
    origin,
    source,
  }));
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
    expect(frameUrl.searchParams.get("embed_session")).toBe(embedSessions["customer-a"]);
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
    expect(frameUrl.searchParams.get("embed_session")).toBe(embedSessions["customer-a"]);
    expect(frameUrl.searchParams.has("token")).toBe(false);

    const hostReturn = new URL(frameUrl.searchParams.get("host_return") ?? "");
    expect(hostReturn.pathname).toBe("/ride-quotes");
    expect(hostReturn.search).toBe("");
    expect(hostReturn.hash).toBe("");
  });

  it("keeps the opening mask aligned to the canonical Ride workflow", () => {
    render(<CanonicalRidePage />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Opening ZIVO Ride");
    expect(status).toHaveTextContent("Set pickup");
    expect(status).toHaveTextContent("Choose ride");
    expect(status).toHaveTextContent("Pay");
    expect(status).toHaveTextContent("Track");
    expect(status).toHaveTextContent("Rate");
  });

  it("replaces and masks the frame on an A-to-B account switch and accepts only B's exact account message", () => {
    const { rerender } = render(<CanonicalRidePage />);
    const frameA = getRideFrame();
    const frameAWindow = frameA.contentWindow;

    expect(new URL(frameA.src).searchParams.get("embed_session"))
      .toBe(embedSessions["customer-a"]);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    fireEvent.load(frameA);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    testState.currentUserId = "customer-b";
    rerender(<CanonicalRidePage />);

    const frameB = getRideFrame();
    const frameBWindow = frameB.contentWindow;
    const rideOrigin = new URL(frameB.src).origin;

    expect(frameB).not.toBe(frameA);
    expect(frameA.isConnected).toBe(false);
    expect(new URL(frameB.src).searchParams.get("embed_session"))
      .toBe(embedSessions["customer-b"]);
    expect(screen.getByRole("status")).toHaveTextContent("Opening ZIVO Ride");

    postManageAccountMessage(frameAWindow, rideOrigin, embedSessions["customer-a"]);
    postManageAccountMessage(frameBWindow, rideOrigin, embedSessions["customer-a"]);
    postManageAccountMessage(frameBWindow, "https://attacker.example", embedSessions["customer-b"]);
    expect(testState.navigate).not.toHaveBeenCalled();

    postManageAccountMessage(frameBWindow, rideOrigin, embedSessions["customer-b"]);
    expect(testState.navigate).toHaveBeenCalledOnce();
    expect(testState.navigate).toHaveBeenCalledWith("/account/settings");

    fireEvent.load(frameB);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
