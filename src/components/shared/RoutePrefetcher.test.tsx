import { describe, expect, it } from "vitest";

import { SOCIAL_ROUTE_PATHS } from "@/lib/socialRoutes";
import { PREFETCH_ROUTE_MODULES } from "./RoutePrefetcher";

describe("RoutePrefetcher route mapping", () => {
  it("keeps feed and reels prefetch chunks aligned with their public routes", () => {
    expect(PREFETCH_ROUTE_MODULES).toMatchObject({
      [SOCIAL_ROUTE_PATHS.feed]: "@/pages/ReelsFeedPage",
      [SOCIAL_ROUTE_PATHS.reels]: "@/pages/FeedPage",
    });
  });

  it("prefetches the canonical Ride frame for Ride entry routes", () => {
    expect(PREFETCH_ROUTE_MODULES).toMatchObject({
      "/rides": "@/pages/app/CanonicalRidePage",
      "/rides/hub": "@/pages/app/CanonicalRidePage",
      "/app/request-ride": "@/pages/app/CanonicalRidePage",
      "/rides/multi-stop": "@/pages/app/CanonicalRidePage",
      "/rides/track/:tripId": "@/pages/app/CanonicalRidePage",
      "/ride-quotes": "@/pages/app/CanonicalRidePage",
    });
  });
});
