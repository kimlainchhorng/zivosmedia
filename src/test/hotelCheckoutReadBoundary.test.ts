import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelRoomCheckoutPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const compactSource = source.replace(/\s+/g, " ");

const unavailableStart = source.indexOf("{loadError && (");
const blockingStart = source.indexOf(
  "{!loadError && checkoutBlockingMessage && (",
  unavailableStart,
);
const unavailableUi = source.slice(unavailableStart, blockingStart);
const compactUnavailableUi = unavailableUi.replace(/\s+/g, " ");

const retryStart = source.indexOf("const handleRetryCheckoutDetails");
const confirmStart = source.indexOf("const handleConfirm", retryStart);
const retryHandler = source.slice(retryStart, confirmStart);

const roomSummaryStart = source.indexOf("{/* Room summary card */}");
const protectedCheckoutStart = source.indexOf(
  "{checkoutDetailsReady && dateWindow.ok && (",
  roomSummaryStart,
);

describe("hotel checkout read boundary", () => {
  it("treats only first-load query failures as unavailable", () => {
    expect(source).toContain(
      "const storeLoadError = !!storeQ.error && storeQ.data === undefined",
    );
    expect(source).toContain(
      "const roomsLoadError = !!roomsQ.error && roomsQ.data === undefined",
    );
    expect(compactSource).toContain(
      "const loadError = dateWindow.ok && (storeLoadError || roomsLoadError)",
    );
  });

  it("renders one labelled recovery alert without a false not-found claim", () => {
    expect(unavailableStart).toBeGreaterThan(-1);
    expect(blockingStart).toBeGreaterThan(unavailableStart);
    expect(unavailableUi.match(/role="alert"/g)).toHaveLength(1);
    expect(unavailableUi).toContain(
      'aria-labelledby="hotel-checkout-unavailable-title"',
    );
    expect(unavailableUi).toContain("Hotel booking details unavailable");
    expect(compactUnavailableUi).toContain(
      "This does not mean the room was removed.",
    );
    expect(unavailableUi).toContain("Retry booking details");
    expect(unavailableUi).toContain("Back to rooms");
    expect(source).toContain(
      "{checkoutError && !loadError && !checkoutBlockingMessage && (",
    );
    expect(source).not.toContain("Room not found");
  });

  it("keeps Retry single-flight and refetches both required reads", () => {
    expect(retryStart).toBeGreaterThan(-1);
    const guard = retryHandler.indexOf(
      "if (loadRetryInFlightRef.current) return",
    );
    const lock = retryHandler.indexOf("loadRetryInFlightRef.current = true");
    const refetch = retryHandler.indexOf(
      "await Promise.all([storeQ.refetch(), roomsQ.refetch()])",
    );
    const unlock = retryHandler.lastIndexOf(
      "loadRetryInFlightRef.current = false",
    );

    expect(guard).toBeGreaterThan(-1);
    expect(lock).toBeGreaterThan(guard);
    expect(refetch).toBeGreaterThan(lock);
    expect(unlock).toBeGreaterThan(refetch);
    expect(retryHandler).not.toContain("createLodgeGuestReservation");
    expect(unavailableUi).toContain("disabled={loadRetrying}");
    expect(unavailableUi).toContain("aria-busy={loadRetrying}");
  });

  it("keeps failed reads distinct from a verified unavailable room", () => {
    expect(compactSource).toContain(
      "const roomLookupFinished = dateWindow.ok && !!roomId && !roomsQ.isLoading && roomsQ.data !== undefined",
    );
    expect(source).toContain(
      "roomLookupFinished && (!room || room.is_active === false)",
    );
    expect(source).toContain(
      '"This room is no longer available. Please choose another room."',
    );
    expect(compactSource).toContain(
      ") : loadError || !room || !dateWindow.ok ? null : (",
    );
  });

  it("keeps booking controls behind verified checkout details", () => {
    expect(compactSource).toContain(
      "const checkoutDetailsReady = dateWindow.ok && !isLoading && !loadError && !!room && !checkoutBlockingMessage",
    );
    expect(protectedCheckoutStart).toBeGreaterThan(roomSummaryStart);
    expect(source.slice(protectedCheckoutStart)).toContain("Guest Details");
    expect(source.slice(protectedCheckoutStart)).toContain("Payment Method");
    expect(source.slice(protectedCheckoutStart)).toContain("Confirm Booking");
  });
});
