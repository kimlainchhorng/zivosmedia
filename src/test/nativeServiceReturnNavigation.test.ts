import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");

const nativeBackSource = readSource(
  "src/components/shared/NativeBackButton.tsx",
);
const flightsSource = readSource("src/pages/FlightLanding.tsx");
const carsSource = readSource("src/pages/Cars.tsx");

describe("native service return navigation", () => {
  it("keeps the shared floating control native-only, visible, and touch accessible", () => {
    expect(nativeBackSource).toContain(
      "if (!Capacitor.isNativePlatform()) return null;",
    );
    expect(nativeBackSource).toContain('label = "Back to ZIVO Home"');
    expect(nativeBackSource).toContain("aria-label={label}");
    expect(nativeBackSource).toContain("z-[60]");
    expect(nativeBackSource).toContain("h-11 min-h-11 w-11 min-w-11");
    expect(nativeBackSource).toContain("focus-visible:ring-2");
  });

  it("returns Home deterministically instead of reopening the service", () => {
    expect(nativeBackSource).toContain(
      'navigate(to, { replace: to === "/" });',
    );
    expect(flightsSource).toContain('title="Flights"');
    expect(flightsSource).toContain("showBack");
    expect(flightsSource).toContain(
      'onBack={() => navigate("/", { replace: true })}',
    );
  });

  it("adds the shared native return to the public cars surface", () => {
    expect(carsSource).toContain(
      'import NativeBackButton from "@/components/shared/NativeBackButton";',
    );
    expect(carsSource).toContain("<Header />\n      <NativeBackButton />");
  });
});
