import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ZIVO_TRAVEL_APP_PATH,
  ZIVO_TRAVEL_HOME_PATH,
  ZIVO_TRAVEL_ORIGIN,
  ZIVO_TRAVEL_SUPABASE_PROJECT_ID,
  ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_TRAVEL_SUPABASE_URL,
  getZivoMediaHomeHref,
  getZivoTravelUrl,
  isZivoTravelHost,
  isZivoTravelPath,
} from "./zivoTravelDomain";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

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

  it("persists local Travel preview until an explicit zt=0 exit", () => {
    window.history.replaceState(null, "", "/hotels-list?zt=1");
    expect(isZivoTravelHost("127.0.0.1")).toBe(true);
    expect(window.sessionStorage.getItem("zivo_force_travel")).toBe("1");

    window.history.replaceState(null, "", "/");
    expect(isZivoTravelHost("127.0.0.1")).toBe(true);

    window.history.replaceState(null, "", "/?zt=0");
    expect(isZivoTravelHost("127.0.0.1")).toBe(false);
    expect(window.sessionStorage.getItem("zivo_force_travel")).toBeNull();
    expect(isZivoTravelHost("zivostravel.com")).toBe(true);
  });

  it("returns previews locally and real Travel hosts to Zivosmedia", () => {
    expect(getZivoMediaHomeHref("127.0.0.1")).toBe("/?zt=0");
    expect(getZivoMediaHomeHref("localhost")).toBe("/?zt=0");
    expect(getZivoMediaHomeHref("preview.zivostravel.com")).toBe("/?zt=0");
    expect(getZivoMediaHomeHref("zivostravel.com")).toBe(
      "https://zivosmedia.com/",
    );
    expect(getZivoMediaHomeHref("www.zivostravel.com")).toBe(
      "https://zivosmedia.com/",
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
    expect(ZIVO_TRAVEL_SUPABASE_URL).toBe(
      import.meta.env.VITE_ZIVO_TRAVEL_SUPABASE_URL || "",
    );
    expect(ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY).toBe("");
  });
});
