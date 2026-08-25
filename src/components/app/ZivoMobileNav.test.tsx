import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ZivoMobileNav from "./ZivoMobileNav";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
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
  useHaptics: () => ({ impact: vi.fn() }),
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
    span: ({ children, layoutId: _layoutId, transition: _transition, ...props }: React.HTMLAttributes<HTMLSpanElement> & {
      layoutId?: string;
      transition?: unknown;
    }) => <span {...props}>{children}</span>,
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current path">{location.pathname + location.search}</output>;
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

afterEach(() => cleanup());

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
    expect(screen.getByLabelText("current path")).toHaveTextContent("/login?redirect=%2Fprofile");
  });

  it("no longer shows a Chat tab (chat moved to the dedicated ZIVO Chat app)", () => {
    renderMobileNav();

    expect(screen.queryByLabelText("Chat")).not.toBeInTheDocument();
  });

  it("does not show the old center create button", () => {
    renderMobileNav("/feed");

    expect(screen.queryByLabelText("Create")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Home")).toBeInTheDocument();
    expect(screen.getByLabelText("Feed")).toBeInTheDocument();
    expect(screen.getByLabelText("Reels")).toBeInTheDocument();
    expect(screen.getByLabelText("Account")).toBeInTheDocument();
  });

  it("shows a readable label for every primary destination", () => {
    renderMobileNav();

    for (const label of ["Home", "Feed", "Reels", "Ride", "Account"]) {
      expect(screen.getByRole("button", { name: label })).toHaveTextContent(label);
    }
  });
});
