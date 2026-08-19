import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Rendering evidence for the driver-rating fix.
 *
 * This repo's `CI` job runs typecheck, lint, unit tests and a build; **E2E has
 * been failing on `main` since 2026-08-10**, so nothing in CI actually exercises
 * a screen. A guarded star that silently threw, or one that still drew for an
 * unrated driver, would ship green. So assert on the rendered output directly.
 *
 * The Netlify preview cannot stand in for this: its origin is not in the
 * backend's allowed origins, so every Supabase call fails and the app renders
 * empty.
 */
vi.mock("@/hooks/useDriverLocation", () => ({
  useDriverLocation: () => ({ location: null, isLoading: false, error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual };
});

import DriverEnRouteTracker from "./DriverEnRouteTracker";

const baseDriver = {
  name: "Sokha Prum",
  trips: 0,
  plate: "3453",
  vehicle: "Honda Dream",
  vehicleColor: "black",
};

const renderTracker = (rating: string | null) =>
  render(
    <DriverEnRouteTracker
      tripId="trip-1"
      driverId="driver-1"
      driver={{ ...baseDriver, rating }}
      etaMinutes={5}
      pickupAddress="A"
      dropoffAddress="B"
    />,
  );

afterEach(cleanup);

describe("the driver card only shows a star someone gave", () => {
  it("draws no rating for a driver nobody has rated", () => {
    renderTracker(null);

    // The driver still appears — this is not "the card failed to render".
    expect(screen.getByText("Sokha Prum")).toBeTruthy();
    // And no numeric rating is anywhere near them.
    expect(document.body.textContent).not.toMatch(/\b[0-5]\.[0-9]\b/);
  });

  it("draws the rating when one was actually given", () => {
    // The control: without this, deleting the star entirely would pass.
    renderTracker("4.8");

    expect(screen.getByText("Sokha Prum")).toBeTruthy();
    expect(screen.getByText("4.8")).toBeTruthy();
  });
});
