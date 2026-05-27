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
});
