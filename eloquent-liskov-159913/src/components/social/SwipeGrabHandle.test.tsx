/**
 * SwipeGrabHandle visual + accessibility regression tests.
 *
 * Guards Apple HIG / Material tap-size guidance: the gesture target must
 * be ≥44px tall even though the visible pill is much smaller. jsdom does
 * not compute layout heights, so we assert against the resolved Tailwind
 * class (`h-11` ≡ 44px) and the inline `minHeight` style as a belt-and-
 * braces check.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SwipeGrabHandle } from "./SwipeGrabHandle";

describe("SwipeGrabHandle", () => {
  it("renders with a 44px tap target (HIG compliance)", () => {
    render(<SwipeGrabHandle onStartDrag={vi.fn()} />);
    const handle = screen.getByTestId("swipe-grab-handle");
    expect(handle.className).toMatch(/\bh-11\b/);
    expect(handle.style.minHeight).toBe("44px");
    expect(handle.style.touchAction).toBe("none");
  });

  it("exposes role=button and aria-label for assistive tech", () => {
    render(<SwipeGrabHandle onStartDrag={vi.fn()} />);
    const handle = screen.getByRole("button", { name: /drag down to close/i });
    expect(handle).toBeInTheDocument();
  });

  it("supports a custom test id (per-overlay disambiguation)", () => {
    render(<SwipeGrabHandle onStartDrag={vi.fn()} testId="profile-post-grab-handle" />);
    expect(screen.getByTestId("profile-post-grab-handle")).toBeInTheDocument();
  });
});
