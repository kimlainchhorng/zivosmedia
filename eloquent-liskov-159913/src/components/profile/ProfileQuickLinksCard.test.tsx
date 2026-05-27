import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileQuickLinksCard from "./ProfileQuickLinksCard";
import { DEFAULT_QUICK_LINKS, type QuickLink } from "./quickLinks";
import { Plane } from "lucide-react";

describe("ProfileQuickLinksCard", () => {
  it("renders all default links plus Account header and App settings row", () => {
    const onNavigate = vi.fn();
    render(<ProfileQuickLinksCard onNavigate={onNavigate} />);

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("App settings")).toBeInTheDocument();
    for (const link of DEFAULT_QUICK_LINKS) {
      expect(screen.getByText(link.label)).toBeInTheDocument();
    }
  });

  it("calls onNavigate with the correct route when a link is clicked", () => {
    const onNavigate = vi.fn();
    render(<ProfileQuickLinksCard onNavigate={onNavigate} />);

    fireEvent.click(screen.getByLabelText("Wallet"));
    expect(onNavigate).toHaveBeenLastCalledWith("/wallet");

    fireEvent.click(screen.getByLabelText("Privacy"));
    expect(onNavigate).toHaveBeenLastCalledWith("/account/privacy");

    fireEvent.click(screen.getByLabelText("Help & Support"));
    expect(onNavigate).toHaveBeenLastCalledWith("/support");
  });

  it("routes Account 'See all' and 'App settings' to /settings", () => {
    const onNavigate = vi.fn();
    render(<ProfileQuickLinksCard onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("See all"));
    fireEvent.click(screen.getByText("App settings"));
    expect(onNavigate).toHaveBeenCalledWith("/settings");
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  it("renders a numeric badge when a link has badge > 0", () => {
    const links: QuickLink[] = [
      { key: "activity", label: "Your activity", to: "/activity", icon: Plane, badge: 7 },
    ];
    render(<ProfileQuickLinksCard onNavigate={vi.fn()} links={links} />);
    expect(screen.getByLabelText("7 unread")).toHaveTextContent("7");
  });

  it("clamps badge counts above 99 to '99+'", () => {
    const links: QuickLink[] = [
      { key: "activity", label: "Your activity", to: "/activity", icon: Plane, badge: 250 },
    ];
    render(<ProfileQuickLinksCard onNavigate={vi.fn()} links={links} />);
    expect(screen.getByLabelText("250 unread")).toHaveTextContent("99+");
  });

  it("does not render a badge when badge is 0 or undefined", () => {
    render(<ProfileQuickLinksCard onNavigate={vi.fn()} />);
    expect(screen.queryByLabelText(/unread$/)).not.toBeInTheDocument();
  });

  it("supports a custom links array", () => {
    const onNavigate = vi.fn();
    const links: QuickLink[] = [
      { key: "x", label: "Custom", to: "/custom", icon: Plane },
    ];
    render(<ProfileQuickLinksCard onNavigate={onNavigate} links={links} />);
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByText("Wallet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Custom"));
    expect(onNavigate).toHaveBeenCalledWith("/custom");
  });
});
