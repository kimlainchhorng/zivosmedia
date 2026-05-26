/**
 * Accessibility regression test for SwipeGrabHandle.
 * Asserts keyboard reachability and that Enter/Space/Escape invoke
 * the optional onClose callback.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SwipeGrabHandle } from "./SwipeGrabHandle";

describe("SwipeGrabHandle a11y", () => {
  it("is keyboard-focusable when onClose is provided", () => {
    render(<SwipeGrabHandle onStartDrag={vi.fn()} onClose={vi.fn()} />);
    const handle = screen.getByTestId("swipe-grab-handle");
    expect(handle.getAttribute("tabindex")).toBe("0");
    expect(handle.getAttribute("aria-label")).toMatch(/close/i);
  });

  it("is not in tab order when no onClose handler", () => {
    render(<SwipeGrabHandle onStartDrag={vi.fn()} />);
    const handle = screen.getByTestId("swipe-grab-handle");
    expect(handle.getAttribute("tabindex")).toBe("-1");
  });

  it("Enter / Space / Escape invoke onClose", () => {
    const onClose = vi.fn();
    render(<SwipeGrabHandle onStartDrag={vi.fn()} onClose={onClose} />);
    const handle = screen.getByTestId("swipe-grab-handle");
    fireEvent.keyDown(handle, { key: "Enter" });
    fireEvent.keyDown(handle, { key: " " });
    fireEvent.keyDown(handle, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("non-action keys do not trigger close", () => {
    const onClose = vi.fn();
    render(<SwipeGrabHandle onStartDrag={vi.fn()} onClose={onClose} />);
    const handle = screen.getByTestId("swipe-grab-handle");
    fireEvent.keyDown(handle, { key: "Tab" });
    fireEvent.keyDown(handle, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
