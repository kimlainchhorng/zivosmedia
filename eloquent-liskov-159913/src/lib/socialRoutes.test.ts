import { describe, expect, it } from "vitest";

import {
  AUTH_REQUIRED_SOCIAL_ROUTE_PATHS,
  PUBLIC_SOCIAL_ROUTE_PATHS,
  SOCIAL_ROUTE_PATHS,
} from "./socialRoutes";

describe("social route policy", () => {
  it("keeps feed and reels public while chat and profile require auth", () => {
    expect(PUBLIC_SOCIAL_ROUTE_PATHS).toEqual([
      SOCIAL_ROUTE_PATHS.feed,
      SOCIAL_ROUTE_PATHS.reels,
      SOCIAL_ROUTE_PATHS.reelDetail,
    ]);

    expect(AUTH_REQUIRED_SOCIAL_ROUTE_PATHS).toEqual([
      SOCIAL_ROUTE_PATHS.chat,
      SOCIAL_ROUTE_PATHS.profile,
    ]);
  });

  it("does not classify any social route as both public and auth-required", () => {
    const overlap = PUBLIC_SOCIAL_ROUTE_PATHS.filter((path) =>
      AUTH_REQUIRED_SOCIAL_ROUTE_PATHS.includes(
        path as (typeof AUTH_REQUIRED_SOCIAL_ROUTE_PATHS)[number],
      ),
    );

    expect(overlap).toEqual([]);
  });
});
