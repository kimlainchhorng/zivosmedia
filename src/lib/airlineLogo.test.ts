/**
 * Contract tests for the airline-logo URL builders. The flight UI
 * renders these in every search result, hotel-flight bundle, and
 * boarding pass, walking down the fallback chain when a CDN 404s.
 * Wrong path templates cause every airline tile to silently render
 * blank.
 *
 * preloadAirlineLogo hits the network and is out of scope here.
 */
import { describe, it, expect } from "vitest";
import {
  AVS_CDN,
  DUFFEL_CDN,
  getAVSLogoUrl,
  getDuffelLogoUrl,
  getPlaceholderLogoUrl,
  getLogoFallbackChain,
  getAirlineLogoUrl,
} from "./airlineLogo";

describe("getAVSLogoUrl", () => {
  it("uses the size-prefixed AVS path with .png and uppercased code", () => {
    expect(getAVSLogoUrl("dl", 64)).toBe(`${AVS_CDN}/64/64/DL.png`);
  });

  it("defaults to size 64 when omitted", () => {
    expect(getAVSLogoUrl("DL")).toBe(`${AVS_CDN}/64/64/DL.png`);
  });

  it("respects the requested size for both width and height", () => {
    expect(getAVSLogoUrl("DL", 200)).toBe(`${AVS_CDN}/200/200/DL.png`);
    expect(getAVSLogoUrl("DL", 32)).toBe(`${AVS_CDN}/32/32/DL.png`);
  });
});

describe("getDuffelLogoUrl", () => {
  it("uses the for-light-background SVG path with uppercased code", () => {
    expect(getDuffelLogoUrl("dl")).toBe(`${DUFFEL_CDN}/DL.svg`);
  });
});

describe("getPlaceholderLogoUrl", () => {
  it("returns a UI-Avatars URL with the code as the name param", () => {
    const url = getPlaceholderLogoUrl("dl");
    expect(url).toMatch(/^https:\/\/ui-avatars\.com\/api\/\?/);
    expect(url).toContain("name=DL");
  });

  it("sets a readable background + foreground for legibility", () => {
    const url = getPlaceholderLogoUrl("DL");
    expect(url).toContain("background=0ea5e9");
    expect(url).toContain("color=fff");
    expect(url).toContain("bold=true");
  });
});

describe("getLogoFallbackChain", () => {
  it("returns the [Duffel SVG → AVS PNG → UI Avatars] ordering", () => {
    const chain = getLogoFallbackChain("dl", 64);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toContain(DUFFEL_CDN);
    expect(chain[1]).toContain(AVS_CDN);
    expect(chain[2]).toContain("ui-avatars.com");
  });

  it("propagates the AVS size into the chain", () => {
    const chain = getLogoFallbackChain("DL", 200);
    expect(chain[1]).toBe(`${AVS_CDN}/200/200/DL.png`);
  });

  it("uppercases the IATA code once for all entries in the chain", () => {
    const chain = getLogoFallbackChain("ba");
    expect(chain.every((url) => url.includes("BA"))).toBe(true);
    expect(chain.every((url) => !url.includes("/ba.") && !url.includes("=ba"))).toBe(true);
  });
});

describe("getAirlineLogoUrl", () => {
  it("delegates to AVS as the primary single-URL accessor", () => {
    expect(getAirlineLogoUrl("DL")).toBe(getAVSLogoUrl("DL"));
    expect(getAirlineLogoUrl("DL", 100)).toBe(getAVSLogoUrl("DL", 100));
  });
});
