import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AppSwitcher from "./AppSwitcher";
import { ZIVO_APPS } from "@/config/zivoApps";

// jsdom lacks the observers/capture APIs Radix Popover touches when it opens.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= ResizeObserverStub;
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(cleanup);

const openSwitcher = () => {
  render(<AppSwitcher />);
  fireEvent.click(screen.getByRole("button", { name: /switch zivo app/i }));
};

describe("AppSwitcher", () => {
  it("renders a labelled trigger without crashing", () => {
    render(<AppSwitcher />);
    expect(screen.getByRole("button", { name: /switch zivo app/i })).toBeInTheDocument();
  });

  it("opens to list every ZIVO app and the ZivoChat support entry", () => {
    openSwitcher();
    for (const app of ZIVO_APPS) {
      expect(screen.getByText(app.name)).toBeInTheDocument();
    }
    expect(screen.getByText(/support on zivochat/i)).toBeInTheDocument();
  });

  it("links each app to its production origin (no current app on localhost)", () => {
    openSwitcher();
    for (const app of ZIVO_APPS) {
      const link = screen.getByText(app.name).closest("a");
      expect(link).toHaveAttribute("href", app.origin);
    }
  });
});
