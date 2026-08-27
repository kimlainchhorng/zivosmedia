import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  from: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mocks.from(table);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
        upsert: mocks.upsert,
      };
    },
  },
}));

import OnboardingTour from "./OnboardingTour";

function TourHarness() {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate("/car-rental")}>
        Open rental cars
      </button>
      <OnboardingTour />
    </>
  );
}

function renderTour(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <TourHarness />
    </MemoryRouter>,
  );
}

describe("OnboardingTour route and availability guard", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1" };
    mocks.from.mockClear();
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.upsert.mockReset();
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it("does not read or show tour state on a rental workflow", async () => {
    renderTour("/car-rental");

    await Promise.resolve();

    expect(mocks.from).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: /Welcome to ZIVO/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an incomplete walkthrough on the app home", async () => {
    renderTour("/app");

    const heading = await screen.findByRole("heading", {
      name: "Welcome to ZIVO",
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Welcome to ZIVO");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    const skipButton = screen.getByRole("button", { name: "Skip tour" });
    expect(skipButton).toHaveFocus();
    expect(skipButton).toHaveClass(
      "h-11",
      "w-11",
    );
    expect(mocks.from).toHaveBeenCalledWith("user_onboarding");
  });

  it("describes the current launcher and main navigation", async () => {
    renderTour("/app");

    expect(
      await screen.findByRole("heading", { name: "Welcome to ZIVO" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/tap the chat icon below/i)).not.toBeInTheDocument();

    for (const title of [
      "Start from Home",
      "Plan a trip",
      "Wallet and account",
      "Use the bottom navigation",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }

    expect(screen.getByText(/Return Home, explore Feed or Reels/i)).toHaveTextContent(
      "request a Ride, and open Account",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "5",
    );
  });

  it("fails closed when completion state is unavailable", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "offline" },
    });

    renderTour("/app");

    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("heading", { name: /Welcome to ZIVO/i }),
    ).not.toBeInTheDocument();
  });

  it("closes an open walkthrough when navigation enters a task flow", async () => {
    renderTour("/app");

    expect(
      await screen.findByRole("heading", { name: /Welcome to ZIVO/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open rental cars" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: /Welcome to ZIVO/i }),
      ).not.toBeInTheDocument(),
    );
  });
});
