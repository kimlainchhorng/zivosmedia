/**
 * Threshold regression: ensures the platform-tuned dismiss decision
 * fires/doesn't fire at the right boundaries so accidental dismissal
 * stays guarded across iOS/Android.
 */
import { describe, it, expect } from "vitest";
import {
  getSwipeThresholds,
  shouldDismiss,
  type SwipePlatform,
} from "../useSwipeDownClose";

const cases: Array<{
  platform: SwipePlatform;
  expectOffset: number;
  expectVelocity: number;
}> = [
  { platform: "ios", expectOffset: 110, expectVelocity: 750 },
  { platform: "android", expectOffset: 90, expectVelocity: 550 },
  { platform: "default", expectOffset: 100, expectVelocity: 650 },
];

describe("useSwipeDownClose thresholds", () => {
  for (const c of cases) {
    it(`uses correct numbers on ${c.platform}`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(t.offset).toBe(c.expectOffset);
      expect(t.velocity).toBe(c.expectVelocity);
      expect(t.minDragDistance).toBeGreaterThan(0);
    });

    it(`${c.platform}: small slow drag does NOT dismiss`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(
        shouldDismiss(
          { offset: { x: 0, y: 40 }, velocity: { x: 0, y: 50 } },
          t,
        ),
      ).toBe(false);
    });

    it(`${c.platform}: drag past offset dismisses`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(
        shouldDismiss(
          { offset: { x: 0, y: c.expectOffset + 5 }, velocity: { x: 0, y: 100 } },
          t,
        ),
      ).toBe(true);
    });

    it(`${c.platform}: fast flick dismisses even at small offset`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(
        shouldDismiss(
          { offset: { x: 0, y: 30 }, velocity: { x: 0, y: c.expectVelocity + 50 } },
          t,
        ),
      ).toBe(true);
    });

    it(`${c.platform}: horizontal-dominant gesture does NOT dismiss`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(
        shouldDismiss(
          { offset: { x: 200, y: 80 }, velocity: { x: 800, y: 200 } },
          t,
        ),
      ).toBe(false);
    });

    it(`${c.platform}: upward drag does NOT dismiss`, () => {
      const t = getSwipeThresholds(c.platform);
      expect(
        shouldDismiss(
          { offset: { x: 0, y: -200 }, velocity: { x: 0, y: -900 } },
          t,
        ),
      ).toBe(false);
    });
  }
});
