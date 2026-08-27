import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logOutboundClick: vi.fn(),
  openExternalUrl: vi.fn(),
}));

vi.mock("@/lib/outboundTracking", () => ({
  logOutboundClick: (...args: unknown[]) => mocks.logOutboundClick(...args),
}));

vi.mock("@/lib/openExternalUrl", () => ({
  openExternalUrl: (...args: unknown[]) => mocks.openExternalUrl(...args),
}));

vi.mock("@/lib/urlSafety", () => ({
  isAllowedPartnerUrl: () => true,
  sanitizePartnerName: (name: string) => name,
}));

vi.mock("@/components/SEOHead", () => ({
  default: () => null,
}));

vi.mock("@/components/app/AppLayout", () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/config/zivoTravelDomain", () => ({
  isZivoTravelHost: () => false,
}));

import OutboundRedirect from "./OutboundRedirect";

const handoffUrl =
  "/out?partner=economybookings&name=EconomyBookings&product=cars" +
  "&page=car-results-provider-handoff" +
  `&url=${encodeURIComponent("https://www.economybookings.com/")}` +
  "&pickup=KTI&pickup_date=2026-09-02&pickup_time=10%3A00" +
  "&dropoff_date=2026-09-05&dropoff_time=10%3A00&age=30";

function renderHandoff() {
  return render(
    <MemoryRouter initialEntries={[handoffUrl]}>
      <Routes>
        <Route path="/out" element={<OutboundRedirect />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OutboundRedirect partner return recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logOutboundClick.mockResolvedValue({
      finalUrl: "https://www.economybookings.com/?subid=zivo-test",
    });
  });

  it("restores the guarded confirmation after an external handoff resolves", async () => {
    let resolveOpen: (() => void) | undefined;
    mocks.openExternalUrl.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveOpen = resolve;
        }),
    );

    renderHandoff();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open EconomyBookings",
      }),
    );

    expect(screen.getByText("Opening partner site...")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.openExternalUrl).toHaveBeenCalledWith(
        "https://www.economybookings.com/?subid=zivo-test",
      );
    });

    await act(async () => {
      resolveOpen?.();
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open EconomyBookings" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Opening partner site..."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to rental results" }),
    ).toBeInTheDocument();
  });

  it("keeps the existing recoverable error state when the handoff rejects", async () => {
    mocks.openExternalUrl.mockRejectedValue(new Error("browser unavailable"));

    renderHandoff();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open EconomyBookings",
      }),
    );

    expect(
      await screen.findByText(
        "Failed to open link. Click the link below to continue.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to rental results" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Opening partner site..."),
    ).not.toBeInTheDocument();
  });
});
