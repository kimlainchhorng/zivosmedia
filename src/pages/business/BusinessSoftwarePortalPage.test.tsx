import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let authState: {
  user: { id: string; email?: string } | null;
  isLoading: boolean;
};

let ownerStoreState: {
  data: {
    id: string;
    name: string;
    category: string;
    setup_complete?: boolean;
  } | null;
  isLoading: boolean;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: authState.isLoading,
  }),
}));

vi.mock("@/hooks/useOwnerStoreProfile", () => ({
  normalizeStoreCategory: (category?: string | null) =>
    (category || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/b\s*and\s*b/g, "bed and breakfast")
      .replace(/[\/_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  isLodgingStoreCategory: () => false,
  useOwnerStoreProfile: () => ownerStoreState,
}));

import BusinessSoftwarePortalPage, { resolveSoftwarePortalAccountDashboardPath } from "./BusinessSoftwarePortalPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/business"]}>
        <BusinessSoftwarePortalPage />
      </MemoryRouter>
    </HelmetProvider>
  );

beforeEach(() => {
  authState = { user: null, isLoading: false };
  ownerStoreState = { data: null, isLoading: false };
});

describe("BusinessSoftwarePortalPage account header", () => {
  it("keeps guest login and signup actions in the header", () => {
    renderPage();

    const header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fbusiness",
    );
    expect(header.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/signup?redirect=%2Fbusiness%2Fnew",
    );
    expect(header.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it("routes a signed-in auto repair owner to the repair dashboard", () => {
    authState = { user: { id: "owner-1", email: "owner@example.com" }, isLoading: false };
    ownerStoreState = {
      data: {
        id: "a914b90d-c249-4794-ba5e-3fdac0deed44",
        name: "AB Complete Car Care",
        category: "auto-repair",
        setup_complete: true,
      },
      isLoading: false,
    };

    renderPage();

    const header = within(screen.getByRole("banner"));
    expect(header.getByText("AB Complete Car Care")).toBeInTheDocument();
    expect(header.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(header.queryByRole("link", { name: "Sign up" })).not.toBeInTheDocument();
    expect(header.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard",
    );
  });

  it("falls back to the configured software dashboard on zivosoftware.com", () => {
    expect(resolveSoftwarePortalAccountDashboardPath(null, "zivosoftware.com")).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
    expect(resolveSoftwarePortalAccountDashboardPath(null, "zivosmedia.com")).toBe("/business/new");
  });
});
