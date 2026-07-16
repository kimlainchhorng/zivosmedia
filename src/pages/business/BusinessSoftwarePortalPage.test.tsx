import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

let authState: {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
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

let pricingState: {
  data:
    | Array<{
        id: string;
        displayName: string;
        currency: "USD";
        monthlyPlanId: string;
        annualPlanId: string;
        monthlyAmountCents: number;
        annualAmountCents: number;
        trialDays: number;
        tagline: string;
        features: string[];
        limits: Record<string, string>;
        support: string;
        cancellationTerms: string;
        featured: boolean;
        sortOrder: number;
      }>
    | undefined;
  isPending: boolean;
  isError: boolean;
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
      .replaceAll("/", " ")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  isLodgingStoreCategory: () => false,
  useOwnerStoreProfile: () => ownerStoreState,
}));

vi.mock("@/hooks/useSoftwarePricingCatalog", () => ({
  useSoftwarePricingCatalog: () => pricingState,
}));

import { resolveSoftwarePortalAccountDashboardPath } from "@/lib/business/softwarePortal";
import BusinessSoftwarePortalPage from "./BusinessSoftwarePortalPage";

const activePlan = {
  id: "gold",
  displayName: "Gold",
  currency: "USD" as const,
  monthlyPlanId: "7f7816a2-020f-4cca-91f8-2ca52decb3eb",
  annualPlanId: "dfadbf9b-e70c-4054-a4ec-b3e546a2c890",
  monthlyAmountCents: 2_999,
  annualAmountCents: 29_990,
  trialDays: 14,
  tagline: "For a growing repair operation.",
  features: ["Customer and vehicle records", "Repair orders and invoices"],
  limits: { workspace: "One auto-repair workspace" },
  support: "Email support",
  cancellationTerms: "Cancel at period end; access continues through the current billing period.",
  featured: true,
  sortOrder: 10,
};

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/business"]}>
        <BusinessSoftwarePortalPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  authState = { user: null, isLoading: false };
  ownerStoreState = { data: null, isLoading: false };
  pricingState = { data: [activePlan], isPending: false, isError: false };
});

describe("BusinessSoftwarePortalPage", () => {
  it("renders the release landing content, honest preview, and exact SEO metadata", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Run the work. Keep the whole business in view." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Interface preview — live account data appears only in a signed-in workspace.")).toBeInTheDocument();
    expect(screen.getByText("No customer, booking, work-order, invoice, or payment records are shown here.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inspections" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built for the auto-repair workday." })).toBeInTheDocument();
    expect(screen.getByText("Other verticals planned")).toBeInTheDocument();

    expect(document.title).toBe("ZIVO Software | Business Management Software");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "Business management software for customers, vehicles, appointments, inspections, estimates, repair orders, invoices, inventory, staff and reporting.",
    );
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://zivosoftware.com/business",
    );
  });

  it("uses router links for guest authentication and preserves a selected server plan", () => {
    renderPage();

    const header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fbusiness",
    );
    expect(header.getByRole("link", { name: "Start free trial" })).toHaveAttribute(
      "href",
      "/signup?redirect=%2Fbusiness%2Fnew",
    );
    expect(screen.getByRole("link", { name: "Start 14-day trial" })).toHaveAttribute(
      "href",
      "/signup?redirect=%2Fbusiness%2Fnew%3Fplan_id%3D7f7816a2-020f-4cca-91f8-2ca52decb3eb%26cycle%3Dmonthly",
    );
  });

  it("routes a signed-in owner to the existing workspace and its billing plan", () => {
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
    expect(header.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
    expect(screen.getByRole("link", { name: "Start 14-day trial" })).toHaveAttribute(
      "href",
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=subscriptions&category=auto-repair&plan_id=7f7816a2-020f-4cca-91f8-2ca52decb3eb&cycle=monthly",
    );
  });

  it("keeps checkout disabled when the canonical pricing catalog is unavailable", () => {
    pricingState = { data: undefined, isPending: false, isError: true };

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Current pricing is temporarily unavailable");
    expect(screen.getByRole("button", { name: "Checkout unavailable" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Start 14-day trial" })).not.toBeInTheDocument();
  });

  it("moves focus into the mobile drawer, traps Tab, and returns focus on Escape", () => {
    renderPage();

    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(menuButton);

    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    const drawerLinks = within(mobileNavigation.parentElement as HTMLElement).getAllByRole("link");
    expect(drawerLinks[0]).toHaveFocus();
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(drawerLinks[0], { key: "Tab", shiftKey: true });
    expect(drawerLinks[drawerLinks.length - 1]).toHaveFocus();

    fireEvent.keyDown(drawerLinks[drawerLinks.length - 1], { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});

describe("resolveSoftwarePortalAccountDashboardPath", () => {
  it("uses an owner's dynamic dashboard and sends unresolved Software accounts through setup", () => {
    const mediaDashboardUrl =
      "https://zivosmedia.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair";
    const softwareDashboardPath =
      "/admin/stores/123e4567-e89b-42d3-a456-426614174000?tab=ar-dashboard&category=auto-repair";

    expect(
      resolveSoftwarePortalAccountDashboardPath(
        { id: "123e4567-e89b-42d3-a456-426614174000", category: "auto-repair" },
        "zivosoftware.com",
        mediaDashboardUrl,
      ),
    ).toBe(softwareDashboardPath);

    expect(
      resolveSoftwarePortalAccountDashboardPath(null, "zivosoftware.com", mediaDashboardUrl),
    ).toBe("/business/new");
    expect(
      resolveSoftwarePortalAccountDashboardPath(
        null,
        "zivosoftware.com",
        "https://example.com/admin/stores/bad",
      ),
    ).toBe("/business/new");
    expect(resolveSoftwarePortalAccountDashboardPath(null, "zivosoftware.com")).toBe(
      "/business/new",
    );
    expect(
      resolveSoftwarePortalAccountDashboardPath(null, "zivosmedia.com", mediaDashboardUrl),
    ).toBe(mediaDashboardUrl);
    expect(resolveSoftwarePortalAccountDashboardPath(null, "zivosmedia.com")).toBe(
      "/business/new",
    );
  });
});
