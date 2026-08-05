import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: null as { id: string } | null }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, signOut: vi.fn() }),
}));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: null }) }));
vi.mock("@/hooks/useOwnerStoreProfile", () => ({ useOwnerStores: () => ({ data: [] }) }));
vi.mock("@/contexts/ZivoPlusContext", () => ({ useZivoPlus: () => ({ isPlus: false }) }));
vi.mock("@/hooks/useSocialNotifications", () => ({
  useSocialNotifications: () => ({ unreadCount: 0 }),
}));
vi.mock("@/components/social/SwitchAccountSheet", () => ({ default: () => null }));

import FeedSidebar from "./FeedSidebar";

afterEach(() => {
  cleanup();
  mocks.user = null;
});

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <FeedSidebar />
    </MemoryRouter>,
  );

/**
 * The feed is the landing route for zivosmedia.com and renders no <Footer/>;
 * being infinite-scroll, it could not reach one anyway. That made this rail the
 * only navigation a signed-out visitor had — and it offered no way to find out
 * who the merchant is or how to reach them.
 *
 * Signed-OUT is the case that matters. A customer disputing a charge, a
 * regulator, and a payment-processor reviewer all arrive without an account,
 * and "the merchant could not be contacted" is a finding against the account.
 */
describe("feed sidebar business and legal rail", () => {
  it("shows contact and money-terms links to a signed-out visitor", () => {
    renderSidebar();
    const rail = screen.getByRole("navigation", { name: /business and legal/i });

    for (const [name, href] of [
      ["Contact", "/contact"],
      ["Terms", "/legal/terms"],
      ["Privacy", "/legal/privacy"],
      ["Refunds", "/legal/refunds"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      expect(rail).toContainElement(link);
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("names the merchant to a signed-out visitor", () => {
    renderSidebar();
    expect(
      screen.getByRole("navigation", { name: /business and legal/i }),
    ).toHaveTextContent("ZIVO LLC");
  });

  it("keeps the rail when a visitor IS signed in", () => {
    // The account-only block above it is gated on `user`. The rail must not be
    // swept into that gate: signed-in customers dispute charges too.
    mocks.user = { id: "user-1" };
    renderSidebar();
    expect(screen.getByRole("link", { name: "Refunds" })).toHaveAttribute(
      "href",
      "/legal/refunds",
    );
  });
});
