import { describe, expect, it } from "vitest";

import {
  ZIVO_TRAVEL_APP_PATH,
  ZIVO_TRAVEL_HOME_PATH,
  ZIVO_TRAVEL_ORIGIN,
  ZIVO_TRAVEL_SUPABASE_PROJECT_ID,
  ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_TRAVEL_SUPABASE_URL,
  getZivoTravelUrl,
  isZivoTravelHost,
  isZivoTravelPath,
} from "./zivoTravelDomain";

describe("zivo travel domain config", () => {
  it("recognizes apex and www zivostravel hosts only", () => {
    expect(isZivoTravelHost("zivostravel.com")).toBe(true);
    expect(isZivoTravelHost("www.zivostravel.com")).toBe(true);
    expect(isZivoTravelHost("ZIVOSTRAVEL.COM")).toBe(true);
    expect(isZivoTravelHost("zivosmedia.com")).toBe(false);
    expect(isZivoTravelHost("zivosoftware.com")).toBe(false);
    expect(isZivoTravelHost("preview.zivostravel.com")).toBe(false);
  });

  it("uses zivostravel.com as the travel origin", () => {
    expect(ZIVO_TRAVEL_ORIGIN).toBe("https://zivostravel.com");
    expect(ZIVO_TRAVEL_HOME_PATH).toBe("/");
    expect(ZIVO_TRAVEL_APP_PATH).toBe("/travel");
    expect(getZivoTravelUrl("/flights", "?from=PNH", "#results")).toBe(
      "https://zivostravel.com/flights?from=PNH#results",
    );
  });

  it("allows travel engine routes and blocks unrelated product routes", () => {
    expect(isZivoTravelPath("/flights")).toBe(true);
    expect(isZivoTravelPath("/hotels/search")).toBe(true);
    expect(isZivoTravelPath("/cars")).toBe(true);
    expect(isZivoTravelPath("/bus")).toBe(true);
    expect(isZivoTravelPath("/travel/checkout")).toBe(true);
    expect(isZivoTravelPath("/wallet")).toBe(true);
    expect(isZivoTravelPath("/business")).toBe(false);
    expect(isZivoTravelPath("/feed")).toBe(false);
    expect(isZivoTravelPath("/chat")).toBe(false);
  });

  it("keeps the telemetry backend env-only", () => {
    expect(ZIVO_TRAVEL_SUPABASE_PROJECT_ID).toBe("xbllvmpomorawkcrtbcq");
    expect(ZIVO_TRAVEL_SUPABASE_URL).toBe(import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_URL || "");
    expect(ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY).toBe("");
  });
});
