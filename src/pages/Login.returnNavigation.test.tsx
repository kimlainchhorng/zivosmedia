import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  authLoading: false,
  signIn: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  appKey: null as "chat" | "media" | "travel" | "software" | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: mocks.signIn,
    user: mocks.user,
    isLoading: mocks.authLoading,
  }),
}));

vi.mock("@/hooks/useSavedAccounts", () => ({
  useSavedAccounts: () => ({
    accounts: [],
    remove: mocks.remove,
    refresh: mocks.refresh,
  }),
  saveAccount: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  setRememberMePreference: vi.fn(),
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/components/SEOHead", () => ({
  default: () => null,
}));

vi.mock("@/config/zivoApps", () => ({
  getCurrentZivoApp: () =>
    mocks.appKey
      ? { key: mocks.appKey, name: "Test app", origin: "https://example.test" }
      : null,
}));

vi.mock("@/lib/softwareMediaConnect", () => ({
  buildSoftwareMediaConnectHref: () =>
    "https://zivosmedia.com/connect/software",
  createSoftwareMediaConnectState: () => "test-state",
  rememberSoftwareMediaConnect: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import Login from "./Login";

function RouteOutput() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <output aria-label="Current route">
        {location.pathname + location.search + location.hash}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        History back
      </button>
    </div>
  );
}

const HOTEL_CHECKOUT =
  "/hotel/store-1/book?room=room-1&ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR";

const loginEntry = (redirect?: string) =>
  redirect === undefined
    ? "/login"
    : `/login?redirect=${encodeURIComponent(redirect)}`;

function renderLogin(
  initialEntries: string[],
  initialIndex = initialEntries.length - 1,
) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<RouteOutput />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Login return navigation", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.authLoading = false;
    mocks.signIn.mockReset();
    mocks.remove.mockReset();
    mocks.refresh.mockReset();
    mocks.appKey = null;
    window.history.replaceState({ idx: 0 }, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an immediate 44px return action and restores public hotel context", () => {
    renderLogin([loginEntry(HOTEL_CHECKOUT)]);

    const returnAction = screen.getByRole("button", { name: "Back to hotel" });
    expect(returnAction).toHaveClass("h-11");

    fireEvent.click(returnAction);

    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/hotel/store-1?ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR",
    );
    expect(screen.getByLabelText("Current route")).not.toHaveTextContent(
      "/book",
    );
    expect(screen.getByLabelText("Current route")).not.toHaveTextContent(
      "room=",
    );
  });

  it("uses the real prior detail without adding a duplicate history entry", () => {
    window.history.replaceState({ idx: 2 }, "", "/");
    renderLogin(
      [
        "/hotels",
        "/hotel/store-1?ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR",
        loginEntry(HOTEL_CHECKOUT),
      ],
      2,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/hotel/store-1?ci=2026-09-08&co=2026-09-10&adults=2&children=0&currency=KHR",
    );

    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/hotels");
  });

  it("uses real in-app history for other protected entries", () => {
    window.history.replaceState({ idx: 1 }, "", "/");
    renderLogin(["/services", loginEntry("/wallet")], 1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Current route")).toHaveTextContent(
      "/services",
    );
  });

  it("falls back to public Home for a direct or unsafe entry", () => {
    renderLogin([loginEntry("https://evil.example/phish")]);

    fireEvent.click(screen.getByRole("button", { name: "Back to Zivo" }));

    expect(screen.getByLabelText("Current route")).toHaveTextContent("/");
  });

  it("never offers a Travel detail return on the dedicated Chat host", () => {
    mocks.appKey = "chat";
    window.history.replaceState({ idx: 2 }, "", "/");
    renderLogin([loginEntry(HOTEL_CHECKOUT)]);

    expect(
      screen.getByRole("button", { name: "Back to Zivo" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to hotel" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the page return available while the email form uses its own Back", () => {
    renderLogin([loginEntry(HOTEL_CHECKOUT)]);

    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));

    expect(
      screen.getByRole("button", { name: "Back to hotel" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Back$/ })).toBeInTheDocument();
  });

  it("still completes authentication at the original protected checkout", async () => {
    mocks.user = { id: "user-1" };
    renderLogin([loginEntry(HOTEL_CHECKOUT)]);

    await waitFor(() => {
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        HOTEL_CHECKOUT,
      );
    });
  });
});
