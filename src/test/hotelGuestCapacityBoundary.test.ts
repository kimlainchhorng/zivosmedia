import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const detailSource = read("src/pages/lodging/HotelResortDetailPage.tsx");
const checkoutSource = read("src/pages/lodging/HotelRoomCheckoutPage.tsx");
const roomModalSource = read(
  "src/components/lodging/LodgingRoomDetailsModal.tsx",
);

const detailBookStart = detailSource.indexOf("const handleBookRoom");
const detailBookEnd = detailSource.indexOf(
  "const reserveCurrentDetailsRoom",
  detailBookStart,
);
const detailBookHandler = detailSource.slice(detailBookStart, detailBookEnd);

const checkoutBlockingStart = checkoutSource.indexOf(
  "const checkoutBlockingMessage",
);
const checkoutBlockingEnd = checkoutSource.indexOf(
  "const accountGuestDetails",
  checkoutBlockingStart,
);
const checkoutBlockingBranch = checkoutSource.slice(
  checkoutBlockingStart,
  checkoutBlockingEnd,
);

const confirmStart = checkoutSource.indexOf("const handleConfirm");
const confirmEnd = checkoutSource.indexOf("return (", confirmStart);
const confirmHandler = checkoutSource.slice(confirmStart, confirmEnd);
const compactConfirmHandler = confirmHandler.replace(/\s+/g, " ");

const protectedCheckoutStart = checkoutSource.indexOf(
  "{checkoutDetailsReady && dateWindow.ok && (",
);
const protectedCheckoutEnd = checkoutSource.indexOf(
  "</TravelPageFrame>",
  protectedCheckoutStart,
);
const protectedCheckoutUi = checkoutSource.slice(
  protectedCheckoutStart,
  protectedCheckoutEnd,
);

describe("hotel guest capacity boundary", () => {
  it("normalizes URL guest counts to the booking service bounds", () => {
    for (const source of [detailSource, checkoutSource]) {
      expect(source).toContain("const normalizeGuestParam");
      expect(source).toContain(
        "Math.min(16, Math.max(min, Math.floor(parsed)))",
      );
      expect(source).toContain(
        "const selectedGuestCount = Math.max(1, adults + children)",
      );
    }

    expect(detailSource).toContain(
      'DetailStepper label="Adults" value={adults} min={1} max={16}',
    );
    expect(detailSource).toContain(
      'DetailStepper label="Children" value={children} min={0} max={16}',
    );
  });

  it("allows an exact fit but blocks over-capacity room navigation", () => {
    expect(detailBookStart).toBeGreaterThan(-1);
    expect(detailBookHandler).toContain("if (selectedGuestCount > maxGuests)");
    expect(
      detailBookHandler.indexOf("if (selectedGuestCount > maxGuests)"),
    ).toBeLessThan(
      detailBookHandler.indexOf("navigate(buildRoomBookingUrl(room.id))"),
    );
    expect(detailBookHandler).toContain(
      "guestCapacityMessage(maxGuests, selectedGuestCount)",
    );
    expect(detailBookHandler).not.toContain("selectedGuestCount >= maxGuests");
  });

  it("replaces Book Now in both room decks and disables the details action", () => {
    expect(detailSource.match(/\) : capacityExceeded \? \(/g)).toHaveLength(2);
    expect(detailSource.match(/Fits \{maxGuests\} guest/g)).toHaveLength(2);
    expect(detailSource).toContain("reserveDisabledReason={");
    expect(detailSource).toContain("detailsRoomCapacityExceeded");

    expect(roomModalSource).toContain("reserveDisabledReason?: string");
    expect(roomModalSource).toContain("disabled={!!reserveDisabledReason}");
    expect(roomModalSource).toContain("room-reserve-disabled-reason");
    expect(roomModalSource).toContain('"Too many guests"');
  });

  it("blocks incompatible direct checkout before any reservation call", () => {
    expect(checkoutBlockingStart).toBeGreaterThan(-1);
    expect(checkoutBlockingBranch).toContain(": guestCapacityExceeded");
    expect(checkoutBlockingBranch).toContain(
      "guestCapacityMessage(maxRoomGuests, selectedGuestCount)",
    );
    expect(checkoutSource).toContain('role="alert"');

    const blockingGuard = compactConfirmHandler.indexOf(
      "if (checkoutBlockingMessage)",
    );
    const existingOnlineContinuation = compactConfirmHandler.indexOf(
      '(payMethod === "card" || payMethod === "khqr") && checkoutReservation?.id',
    );
    const reservationCall = compactConfirmHandler.indexOf(
      "createLodgeGuestReservation({",
    );
    expect(blockingGuard).toBeGreaterThan(-1);
    expect(existingOnlineContinuation).toBeGreaterThan(blockingGuard);
    expect(reservationCall).toBeGreaterThan(blockingGuard);
  });

  it("hides guest and payment collection and preserves stay details for recovery", () => {
    expect(protectedCheckoutStart).toBeGreaterThan(-1);
    expect(checkoutSource.replace(/\s+/g, " ")).toContain(
      "const checkoutDetailsReady = dateWindow.ok && !isLoading && !loadError && !!room && !checkoutBlockingMessage",
    );
    expect(protectedCheckoutUi).toContain("Guest Details");
    expect(protectedCheckoutUi).toContain("Payment Method");
    expect(protectedCheckoutUi).toContain("Confirm Booking");

    expect(checkoutSource).toContain("const hotelDetailUrl = useMemo");
    expect(checkoutSource).toContain("ci: checkInIso");
    expect(checkoutSource).toContain("co: checkOutIso");
    expect(checkoutSource).toContain("adults: String(adults)");
    expect(checkoutSource).toContain("children: String(children)");
    expect(checkoutSource).toContain(
      "onClick={() => navigate(user ? hotelDetailUrl : loginUrl)}",
    );
    expect(checkoutSource.replace(/\s+/g, " ")).toContain(
      'user ? dateWindow.ok ? "Back to rooms" : "Choose dates" : "Sign in"',
    );
  });

  it("keeps the server-owned capacity check as the final authority", () => {
    expect(checkoutSource).toContain("createLodgeGuestReservation({");
    expect(checkoutSource).toContain('lower.includes("guest count exceeds")');
  });
});
