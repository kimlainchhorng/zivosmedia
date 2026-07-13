import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified, VERIFIED_LABEL } from "@/lib/verification";

const renderBadge = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

describe("VerifiedBadge", () => {
  it("renders an accessible image with the verified label", () => {
    renderBadge(<VerifiedBadge />);
    const badge = screen.getByTestId("verified-badge");
    expect(badge).toHaveAttribute("role", "img");
    expect(badge).toHaveAttribute("aria-label", VERIFIED_LABEL);
  });

  it("uses a custom tooltip / aria title when provided", () => {
    renderBadge(<VerifiedBadge tooltipText="Verified business" />);
    const badge = screen.getByTestId("verified-badge");
    expect(badge).toHaveAttribute("title", "Verified business");
  });

  it("honors explicit pixel size", () => {
    renderBadge(<VerifiedBadge size={20} />);
    const badge = screen.getByTestId("verified-badge");
    expect(badge.style.width).toBe("20px");
    expect(badge.style.height).toBe("20px");
  });

  it("renders without a tooltip wrapper when interactive=false", () => {
    renderBadge(<VerifiedBadge interactive={false} />);
    expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
  });
});

describe("isBlueVerified — safe fallback", () => {
  it("returns true ONLY for explicit true", () => {
    expect(isBlueVerified(true)).toBe(true);
    expect(isBlueVerified({ is_verified: true })).toBe(true);
  });

  it("returns false for missing / null / undefined / non-true values", () => {
    expect(isBlueVerified()).toBe(false);
    expect(isBlueVerified(null)).toBe(false);
    expect(isBlueVerified(undefined)).toBe(false);
    expect(isBlueVerified(false)).toBe(false);
    expect(isBlueVerified({})).toBe(false);
    expect(isBlueVerified({ is_verified: null })).toBe(false);
    expect(isBlueVerified({ is_verified: undefined })).toBe(false);
    // non-boolean truthy values are NOT verified
    expect(isBlueVerified({ is_verified: "true" as any })).toBe(false);
    expect(isBlueVerified({ is_verified: 1 as any })).toBe(false);
  });
});
