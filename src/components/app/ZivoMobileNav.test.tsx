import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ZivoMobileNav from "./ZivoMobileNav";

const { authState, impactSpy } = vi.hoisted(() => ({
  authState: {
    user: null as null | {
      email?: string;
      user_metadata?: { avatar_url?: string };
    },
  },
  impactSpy: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ data: null }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));

vi.mock("@/hooks/useLiveActivityCount", () => ({
  useLiveActivityCount: () => ({ total: 0 }),
}));

vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ impact: impactSpy }),
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "nav.home": "Home",
        "nav.feed": "Feed",
        "nav.reel": "Reels",
        "nav.ride": "Ride",
        "nav.chat": "Chat",
        "nav.account": "Account",
      })[key] ?? key,
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    span: ({
      children,
      layoutId: _layoutId,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      layoutId?: string;
      transition?: unknown;
    }) => <span {...props}>{children}</span>,
  },
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="current path">
      {location.pathname + location.search}
    </output>
  );
}

function renderMobileNav(initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <LocationProbe />
                <ZivoMobileNav />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  authState.user = null;
  impactSpy.mockClear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  cleanup();
});

describe("ZivoMobileNav", () => {
  it("lets anonymous users open public feed and reels tabs", () => {
    renderMobileNav();

    fireEvent.click(screen.getByLabelText("Feed"));
    expect(screen.getByLabelText("current path")).toHaveTextContent("/feed");

    fireEvent.click(screen.getByLabelText("Reels"));
    expect(screen.getByLabelText("current path")).toHaveTextContent("/reels");
  });

  it("keeps the account tab behind login for anonymous users", () => {
    renderMobileNav();

    fireEvent.click(screen.getByLabelText("Account"));
    expect(screen.getByLabelText("current path")).toHaveTextContent(
      "/login?redirect=%2Fprofile",
    );
  });

  it("opens Profile for signed-in users", () => {
    authState.user = { email: "rider@example.com", user_metadata: {} };
    renderMobileNav();

    fireEvent.click(screen.getByLabelText("Account"));
    expect(screen.getByLabelText("current path")).toHaveTextContent("/profile");
    expect(screen.getByLabelText("Account")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens Profile from the account hub without toggling away", () => {
    authState.user = { email: "rider@example.com", user_metadata: {} };
    renderMobileNav("/more");

    const account = screen.getByLabelText("Account");
    fireEvent.click(account);
    expect(screen.getByLabelText("current path")).toHaveTextContent("/profile");

    fireEvent.click(account);
    expect(screen.getByLabelText("current path")).toHaveTextContent("/profile");
    expect(impactSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    "/account/preferences",
    "/profile/delete-account",
    "/profile-views",
  ])("returns to Profile from the Account child route %s", (initialPath) => {
    authState.user = { email: "rider@example.com", user_metadata: {} };
    renderMobileNav(initialPath);

    fireEvent.click(screen.getByLabelText("Account"));

    expect(screen.getByLabelText("current path")).toHaveTextContent("/profile");
  });

  // Reversed on the owner's instruction. The nav's contract is only to route to
  // /chat; ZivoChatRedirectGuard (mounted in App) then hands standalone chat off
  // to zivoschat.com, carrying the path so deep links land right. Before this tab
  // that entry point existed only in menus, and the unread count had no surface.
  it("routes to the chat entry point for signed-in users", () => {
    authState.user = { email: "rider@example.com", user_metadata: {} };
    renderMobileNav();

    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByLabelText("current path")).toHaveTextContent("/chat");
  });

  it("keeps the chat tab behind login for anonymous users", () => {
    renderMobileNav();

    fireEvent.click(screen.getByLabelText("Chat"));
    expect(screen.getByLabelText("current path")).toHaveTextContent(
      "/login?redirect=%2Fchat",
    );
  });

  // Matters for the frame before the handoff, and for the tab never being
  // mis-attributed to Home as it was before the /chat branch existed.
  it("marks the Chat tab as current while on a chat route", () => {
    renderMobileNav("/chat");

    expect(screen.getByLabelText("Chat")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("Home")).not.toHaveAttribute("aria-current");
  });

  it("does not show the old center create button", () => {
    renderMobileNav("/feed");

    expect(screen.queryByLabelText("Create")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Home")).toBeInTheDocument();
    expect(screen.getByLabelText("Feed")).toBeInTheDocument();
    expect(screen.getByLabelText("Reels")).toBeInTheDocument();
    expect(screen.getByLabelText("Chat")).toBeInTheDocument();
    expect(screen.getByLabelText("Account")).toBeInTheDocument();
  });

  it("shows a readable label for every primary destination", () => {
    renderMobileNav();

    for (const label of ["Home", "Feed", "Reels", "Ride", "Account"]) {
      expect(screen.getByRole("button", { name: label })).toHaveTextContent(
        label,
      );
    }
  });

  it("keeps Travel Home actionable until the actual front door", () => {
    window.history.replaceState(null, "", "/?zt=1");
    renderMobileNav("/travel/checkout");

    expect(screen.getByRole("button", { name: "Trips" })).toBeInTheDocument();
    let home = screen.getByRole("button", { name: "Home" });
    expect(home).not.toHaveAttribute("aria-current");

    fireEvent.click(home);
    expect(screen.getByLabelText("current path")).toHaveTextContent(/^\/$/);

    home = screen.getByRole("button", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(impactSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(home);
    expect(screen.getByLabelText("current path")).toHaveTextContent(/^\/$/);
    expect(impactSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the Travel Account tab on the Travel account page", () => {
    window.history.replaceState(null, "", "/?zt=1");
    authState.user = { email: "traveler@example.com", user_metadata: {} };
    renderMobileNav("/travel/checkout");

    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByLabelText("current path")).toHaveTextContent("/account");
  });
});
