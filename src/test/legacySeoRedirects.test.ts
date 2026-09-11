import { describe, expect, it } from "vitest";

import cloudflareWorker from "../../cloudflare/worker";

const env = {
  ASSETS: {
    fetch: async () =>
      new Response("<!doctype html><html><head></head><body></body></html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  },
  ZIVO_MEDIA: {},
};

function get(pathname: string, host = "zivosmedia.com", method = "GET") {
  return new Request(`https://${host}${pathname}`, { method });
}

async function locationFor(pathname: string, host?: string) {
  const response = await cloudflareWorker.fetch(get(pathname, host), env as never);
  return { status: response.status, location: response.headers.get("location") };
}

/**
 * These URL shapes were all in the old sitemap, so search engines still hold
 * them, but none of them serves its own page: React Router does not bind params
 * inside a segment, so /flights/:origin-to-:destination, /flights/to-:toCity
 * and /car-rental/in-:location never match and fall through to a generic
 * landing page.
 */
describe("legacy SEO redirects", () => {
  it("normalises the hotel and car rental city shapes", async () => {
    expect(await locationFor("/hotels/in-london")).toEqual({
      status: 301,
      location: "https://zivosmedia.com/hotels/london",
    });
    expect(await locationFor("/car-rental/in-miami")).toEqual({
      status: 301,
      location: "https://zivosmedia.com/rent-car/miami",
    });
  });

  it("sends flight route URLs to the destination city page", async () => {
    expect((await locationFor("/flights/new-york-to-london")).location).toBe(
      "https://zivosmedia.com/flights/to/london",
    );
    expect((await locationFor("/flights/from-atlanta-to-new-york")).location).toBe(
      "https://zivosmedia.com/flights/to/new-york",
    );
    expect((await locationFor("/flights/to-paris")).location).toBe(
      "https://zivosmedia.com/flights/to/paris",
    );
    expect((await locationFor("/flights/cities/tokyo")).location).toBe(
      "https://zivosmedia.com/flights/to/tokyo",
    );
  });

  it("falls back to the flights hub when only an origin is known", async () => {
    expect((await locationFor("/flights/from-chicago")).location).toBe(
      "https://zivosmedia.com/flights",
    );
  });

  it("keeps the query string, so a dated search survives the redirect", async () => {
    const response = await cloudflareWorker.fetch(
      new Request("https://zivosmedia.com/hotels/in-london?checkIn=2026-10-01&guests=2"),
      env as never,
    );
    expect(response.headers.get("location")).toBe(
      "https://zivosmedia.com/hotels/london?checkIn=2026-10-01&guests=2",
    );
  });

  it("leaves working URLs alone", async () => {
    for (const pathname of [
      "/flights",
      "/flights/results",
      "/flights/live",
      "/flights/traveler-info",
      "/flights/to/paris",
      "/hotels/london",
      "/rent-car/miami",
      "/deals/summer-flights",
    ]) {
      const { status, location } = await locationFor(pathname);
      expect({ pathname, status, location }).toEqual({ pathname, status: 200, location: null });
    }
  });

  it("does not redirect non-GET requests or hosts without travel routes", async () => {
    const posted = await cloudflareWorker.fetch(get("/hotels/in-london", "zivosmedia.com", "POST"), env as never);
    expect(posted.status).not.toBe(301);

    for (const host of ["zivoschat.com", "zivosoftware.com"]) {
      expect((await locationFor("/hotels/in-london", host)).status).not.toBe(301);
    }
  });
});
