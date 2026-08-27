import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const carsSource = read("src/pages/Cars.tsx");
const bookingHookSource = read("src/hooks/useP2PBooking.ts");
const vehicleSearchSource = bookingHookSource.slice(
  bookingHookSource.indexOf("export function useP2PVehicleSearch"),
  bookingHookSource.indexOf("export function useP2PVehicleDetail"),
);

describe("car search live-inventory truthfulness", () => {
  it("does not mix fabricated marketplace metrics or static EV offers into live results", () => {
    expect(carsSource).not.toContain("10K+");
    expect(carsSource).not.toContain("50K+");
    expect(carsSource).not.toContain("100%");
    expect(carsSource).not.toContain("Price Match Guarantee");
    expect(carsSource).not.toContain("CarElectricVehicles");
  });

  it("keeps a failed inventory read distinct from a confirmed empty result", () => {
    expect(carsSource).toContain("isError");
    expect(carsSource).toContain("Car inventory unavailable");
    expect(carsSource).toContain("No alternative or sample offers are shown.");
    expect(carsSource).toContain("No live vehicles found");
    expect(carsSource).toContain("No current approved owner listings matched these filters.");
    expect(carsSource).toContain("Search another location");
    expect(carsSource).toContain('navigate(isTravelHost ? "/zivo-travel#booking" : "/cars/search")');
    expect(carsSource).toContain("activeFilterCount > 0 &&");
    expect(carsSource.indexOf("Car inventory unavailable")).toBeLessThan(
      carsSource.indexOf("No live vehicles found"),
    );
  });

  it("exposes and uses an honest live-inventory retry", () => {
    expect(bookingHookSource).toContain("isFetching: query.isFetching");
    expect(bookingHookSource).toContain("refetch: query.refetch");
    expect(carsSource).toContain("onClick={() => void refetch()}");
    expect(carsSource).toContain("Retry live inventory");
    expect(carsSource).toContain('disabled={isFetching}');
  });

  it("executes the public RLS-scoped inventory query for signed-out visitors", () => {
    expect(vehicleSearchSource).not.toContain("supabase.auth.getSession()");
    expect(vehicleSearchSource).not.toContain("if (!sessionData.session) return []");
    expect(vehicleSearchSource).toContain('.from("p2p_vehicles")');
    expect(vehicleSearchSource).toContain('.eq("is_available", true)');
    expect(vehicleSearchSource).toContain('.eq("approval_status", "approved")');
    expect(vehicleSearchSource).toContain("return (data || []) as P2PVehicleWithOwner[]");
  });

  it("limits the anonymous listing payload to fields rendered by public result cards", () => {
    expect(vehicleSearchSource).not.toContain('.select("*")');
    expect(vehicleSearchSource).toContain(
      '.select("id, make, model, year, daily_rate, images, rating, location_city, location_state, seats, transmission, fuel_type, category, instant_book, is_featured, total_trips")',
    );
  });

  it("does not imply that the listing query checked pickup and return date overlap", () => {
    expect(carsSource).not.toContain("by city, travel dates, vehicle type, and price");
    expect(carsSource).not.toContain("Search owner-listed cars by location and travel dates");
    expect(carsSource).toContain("Pickup and return date availability is confirmed before booking.");
    expect(carsSource).toContain("Current listings; dates confirmed before booking");
  });
});
