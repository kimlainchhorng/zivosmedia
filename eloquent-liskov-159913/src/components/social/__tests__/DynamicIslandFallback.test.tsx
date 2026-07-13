/**
 * Dynamic Island fallback regression test.
 *
 * The iOS WKWebView sometimes reports `env(safe-area-inset-top)` as `0px`
 * even on Dynamic Island devices. This test pins that broken value and
 * proves the shared `--zivo-safe-top-overlay` token still produces a safe
 * minimum of 60px — protecting close buttons across ReelsFeedPage and
 * ProfileContentTabs post viewers.
 */

import { describe, it, expect } from "vitest";
import { evaluateCssExpression } from "@/lib/social/safeAreaEval";

const BROKEN_ISLAND = { name: "iOS Dynamic Island (inset=0)", top: 0, bottom: 0, left: 0, right: 0 };

describe("Dynamic Island broken-inset fallback", () => {
  it("post-detail viewer header keeps a 60px floor", () => {
    const px = evaluateCssExpression("var(--zivo-safe-top-overlay)", BROKEN_ISLAND);
    expect(px).toBeGreaterThanOrEqual(60);
  });

  it("reel close button keeps a 60px floor", () => {
    const px = evaluateCssExpression("var(--zivo-safe-top-overlay)", BROKEN_ISLAND);
    expect(px).toBeGreaterThanOrEqual(60);
  });

  it("profile post viewer paddingTop keeps a 60px floor", () => {
    const px = evaluateCssExpression("var(--zivo-safe-top-overlay)", BROKEN_ISLAND);
    expect(px).toBeGreaterThanOrEqual(60);
  });

  it("sheet primitives keep a 44px floor", () => {
    const px = evaluateCssExpression("var(--zivo-safe-top-sheet)", BROKEN_ISLAND);
    expect(px).toBeGreaterThanOrEqual(44);
  });

  it("sticky in-page headers keep a 48px floor", () => {
    const px = evaluateCssExpression("var(--zivo-safe-top-sticky)", BROKEN_ISLAND);
    expect(px).toBeGreaterThanOrEqual(48);
  });
});
