import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Capacitor } from "@capacitor/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getZivoHeaderSafeTop } from "@/lib/zivoHeaderSafeArea";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const logoSource = readSource("src/components/ZivoTravelLogo.tsx");
const headerSource = readSource("src/components/Header.tsx");
const footerSource = readSource("src/components/Footer.tsx");
const navSource = readSource("src/components/home/NavBar.tsx");
const safeAreaSource = readSource("src/lib/zivoHeaderSafeArea.ts");
const homeSource = readSource("src/pages/ZivoTravelHome.tsx");
const utilitySource = readSource("src/components/zivo-travel/TravelUtilityShell.tsx");
const appHeaderSource = readSource("src/components/app/AppHeader.tsx");
const appLayoutSource = readSource("src/components/app/AppLayout.tsx");
const hotelsSource = readSource("src/pages/lodging/HotelsLandingPage.tsx");
const flightsSource = readSource("src/pages/FlightLanding.tsx");
const busSource = readSource("src/pages/app/BusBookingPage.tsx");

const stubDisplayMode = (matches: boolean) => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared Zivo Travel branding", () => {
  it("uses the official ZIVO mark in one accessible Travel lockup", () => {
    expect(logoSource).toContain('import zivoLogoPng from "@/assets/zivo-logo.png"');
    expect(logoSource).toContain('role="img"');
    expect(logoSource).toContain('aria-label="Zivo Travel"');
    expect(logoSource).toContain('alt=""');
    expect(logoSource).toContain('aria-hidden="true"');
    expect(logoSource).toContain(">ZIVO</span>");
    expect(logoSource).toContain(">TRAVEL</span>");
  });

  it("reuses the lockup across every top-level Travel shell", () => {
    for (const source of [headerSource, footerSource, navSource, homeSource, utilitySource, appHeaderSource, hotelsSource]) {
      expect(source).toContain("ZivoTravelLogo");
    }

    expect(headerSource).toContain('<ZivoTravelLogo size="sm" />');
    expect(footerSource).toContain('<ZivoTravelLogo size="md" tone="inverse" />');
    expect(navSource).toContain('<ZivoTravelLogo size="sm" />');
    expect(homeSource).toContain('<ZivoTravelLogo size="sm" />');
    expect(utilitySource).toContain('<ZivoTravelLogo size="sm" />');
    expect(appHeaderSource).toContain('<ZivoTravelLogo size="sm" showWordmark={false} />');
    expect(hotelsSource).toContain('<ZivoTravelLogo size="sm" />');

    expect(homeSource).not.toContain("relative grid h-12 w-12 place-items-center overflow-hidden");
    expect(utilitySource).not.toContain("grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br");
  });

  it("exposes the header brand as a keyboard-focusable home link", () => {
    expect(headerSource).toContain('aria-label={isTravel ? "Zivo Travel home" : "ZIVO home"}');
    expect(headerSource).toContain("focus-visible:ring-2");
    expect(headerSource).not.toContain('onClick={() => navigate("/")}');
  });

  it("keeps the large safe-area fallback for installed display mode only", () => {
    expect(safeAreaSource).toContain('"(display-mode: standalone)"');
    expect(safeAreaSource).toContain("Capacitor.isNativePlatform() || isStandaloneDisplay");
    expect(safeAreaSource).toContain('? "var(--zivo-safe-top-sticky)"');
    expect(safeAreaSource).toContain(': `max(var(--zivo-safe-top, 0px), ${webFloor})`');
    expect(headerSource).toContain("zivo-safe-top-guard-off fixed top-0");
    expect(homeSource).toContain("zivo-safe-top-guard-off sticky top-0");
    expect(utilitySource).toContain("zivo-safe-top-guard-off sticky top-0");
    expect(appHeaderSource).toContain("zivo-safe-top-guard-off fixed top-0");
    expect(appLayoutSource).toContain("calc(57px + ${headerSafeTop})");
    expect(headerSource).not.toContain("border-border safe-area-top");
  });

  it("uses compact browser spacing while preserving native and standalone clearance", () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);
    stubDisplayMode(false);
    expect(getZivoHeaderSafeTop()).toBe("max(var(--zivo-safe-top, 0px), 0.5rem)");
    expect(getZivoHeaderSafeTop("0.4375rem")).toBe("max(var(--zivo-safe-top, 0px), 0.4375rem)");

    stubDisplayMode(true);
    expect(getZivoHeaderSafeTop()).toBe("var(--zivo-safe-top-sticky)");

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    stubDisplayMode(false);
    expect(getZivoHeaderSafeTop()).toBe("var(--zivo-safe-top-sticky)");
  });

  it("protects the Travel footer from the light-skin arbitrary-color remap", () => {
    expect(footerSource).toContain('isTravel ? "bg-slate-950" : "bg-[#0f1629]"');
    expect(footerSource).toContain("text-primary-foreground overflow-hidden");
    expect(footerSource).toContain('const mutedCopy = isTravel ? "text-primary-foreground/75"');
    expect(footerSource).toContain('const navCopy = isTravel ? "text-primary-foreground/75"');
    expect(footerSource).toContain('const legalCopy = isTravel ? "text-primary-foreground/65"');
    expect(footerSource).toContain('isTravel ? "text-primary-foreground" : "text-white"');
  });

  it("uses the dark Travel footer on browsing surfaces without interrupting active booking steps", () => {
    expect(footerSource).toContain("forceTravelBrand = false");
    expect(homeSource).toContain("<Footer forceTravelBrand />");
    expect(utilitySource).toContain("<Footer forceTravelBrand");
    expect(hotelsSource).toContain("<Footer forceTravelBrand");
    expect(flightsSource).toContain("showTravelFooter={isTravelHost}");
    expect(busSource).toContain('showTravelFooter={isTravelHost && (step === "search" || step === "confirmed")}');
    expect(appLayoutSource).toContain("showTravelFooter && isTravel");
  });
});
