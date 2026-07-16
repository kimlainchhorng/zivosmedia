import { describe, expect, it } from "vitest";
import { appendSoftwarePlanSelection, validSoftwarePlanId } from "./softwarePlanSelection";

const PLAN_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("Software plan handoff", () => {
  it("preserves an external dashboard query and hash while carrying the plan", () => {
    expect(
      appendSoftwarePlanSelection(
        "https://dashboard.zivosmedia.com/business/garage?from=software#billing",
        PLAN_ID,
        "annual",
      ),
    ).toBe(
      `https://dashboard.zivosmedia.com/business/garage?from=software&tab=subscriptions&plan_id=${PLAN_ID}&cycle=annual#billing`,
    );
  });

  it("carries a plan on same-app routes and rejects malformed identifiers", () => {
    expect(appendSoftwarePlanSelection("/business/garage#team", PLAN_ID, "monthly")).toBe(
      `/business/garage?tab=subscriptions&plan_id=${PLAN_ID}&cycle=monthly#team`,
    );
    expect(validSoftwarePlanId("not-a-plan")).toBeNull();
    expect(appendSoftwarePlanSelection("/business/garage", "not-a-plan", "monthly")).toBe(
      "/business/garage",
    );
  });
});
