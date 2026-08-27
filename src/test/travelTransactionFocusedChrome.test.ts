import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const carCheckoutSource = readSource(
  "src/pages/cars/CarRentalCheckoutPage.tsx",
);
const carConfirmationSource = readSource(
  "src/pages/cars/CarRentalConfirmedPage.tsx",
);
const busSource = readSource("src/pages/app/BusBookingPage.tsx");

describe("focused transaction chrome", () => {
  it("keeps the floating app navigation out of active car checkout", () => {
    expect(carCheckoutSource).not.toContain("ZivoMobileNav");
    expect(carCheckoutSource).toContain("<TravelFlowHeader");
    expect(carCheckoutSource).toContain(
      "pb-[calc(var(--zivo-safe-bottom,0px)+1.5rem)] sm:pb-8",
    );
  });

  it("preserves app navigation on the car confirmation recovery surface", () => {
    expect(carConfirmationSource).toContain("ZivoMobileNav");
  });

  it("hides Bus navigation only during review and card payment", () => {
    expect(busSource).toContain(
      'const focusedTransactionStep = step === "summary" || step === "pay";',
    );
    expect(busSource).toContain("hideNav={focusedTransactionStep}");
    expect(busSource).toContain(
      '? "pb-[calc(var(--zivo-safe-bottom,0px)+1.5rem)] sm:pb-8"',
    );
    expect(busSource).toContain(
      ': "pb-[calc(var(--zivo-safe-bottom,0px)+7rem)] sm:pb-28"',
    );
    expect(busSource).toContain(
      'showTravelFooter={isTravelHost && (step === "search" || step === "confirmed")}',
    );
    expect(busSource).toContain(
      '{/* Date + Passengers */}\n                    <div className="grid grid-cols-2 gap-3">',
    );
    expect(busSource).toContain(
      "{/* Popular routes */}\n                    <div>",
    );
  });
});
