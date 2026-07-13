/**
 * Contract tests for conciergePlanner.ts — the pure planFromQuery heuristic that turns
 * a free-form sentence into a ranked action plan.
 *
 * Expected values are grounded by an independent oracle that does NOT import the module
 * (a clean-room reimplementation of the documented heuristic; regex / encodeURIComponent
 * are shared JS primitives). The LOAD-BEARING, non-obvious contracts pinned here:
 *   - branch PRIORITY food > (hotel|flight) > (ride|place) > fallback — a single clause
 *     with both food and ride hints takes the FOOD branch, and summarize drops "ride";
 *   - single-clause plans cap at 3 steps; COMPOUND plans (split on and-then/then/after
 *     that/also/plus — NOT a bare "and") merge, DEDUPE by `${kind}|${title}`, cap at 4;
 *   - place is extracted only as a Capitalized token after in/near/to/at, and multi-word
 *     places are encodeURIComponent'd into the deep-link ("New York" -> "New%20York").
 */
import { describe, it, expect } from "vitest";
import { planFromQuery } from "./conciergePlanner";

describe("planFromQuery — empty", () => {
  it("returns an empty plan for blank input", () => {
    expect(planFromQuery("   ")).toEqual({ intentSummary: "", steps: [] });
  });
});

describe("planFromQuery — food branch", () => {
  it("builds reserve + ride + eats with extracted time and encoded place", () => {
    expect(planFromQuery("sushi at 8pm near New York")).toEqual({
      intentSummary: "Plan a dining in New York at 8 pm",
      steps: [
        {
          kind: "reserve",
          title: "Reserve a table for 8 pm near New York",
          detail: "sushi",
          to: "/eats/reserve?restaurantName=New%20York",
        },
        {
          kind: "ride",
          title: "Get a ride to New York",
          detail: "Arriving by 8 pm",
          to: "/rides/hub?destination=New%20York",
        },
        {
          kind: "eats",
          title: "Browse menus near New York",
          detail: "Or order delivery if you'd rather stay in",
          to: "/eats?q=New%20York",
        },
      ],
    });
  });
});

describe("planFromQuery — hotel/flight branch", () => {
  it("treats 'weekend' as a hotel hint and bundles flight + hotel + ride", () => {
    expect(planFromQuery("fly to Tokyo next weekend")).toEqual({
      intentSummary: "Plan a flight + hotel in Tokyo next weekend",
      steps: [
        {
          kind: "flight",
          title: "Search flights to Tokyo",
          detail: "For next weekend",
          to: "/flights?to=Tokyo&bundle=1",
        },
        {
          kind: "hotel",
          title: "Find hotels in Tokyo",
          detail: "Stay where the network has partners",
          to: "/hotels?city=Tokyo&bundle=1",
        },
        {
          kind: "ride",
          title: "Add an airport ride",
          detail: "Pickup timed to your flight",
          to: "/rides/hub?bundle=1",
        },
      ],
    });
  });
});

describe("planFromQuery — ride and fallback branches", () => {
  it("returns a single ride step for a placeless ride request", () => {
    expect(planFromQuery("I need a taxi")).toEqual({
      intentSummary: "Plan a ride",
      steps: [
        {
          kind: "ride",
          title: "Request a ride",
          detail: "We'll match a driver in seconds",
          to: "/rides/hub",
        },
      ],
    });
  });

  it("falls back to the services hub when no hint matches", () => {
    expect(planFromQuery("hello there friend")).toEqual({
      intentSummary: "Plan a trip",
      steps: [
        {
          kind: "ride",
          title: "Open ZIVO services",
          detail: "Pick from rides, eats, flights, or hotels",
          to: "/services",
        },
      ],
    });
  });
});

describe("planFromQuery — branch priority (food beats ride in one clause)", () => {
  it("takes the food branch and drops 'ride' from the summary (bare 'and' is not a split)", () => {
    expect(planFromQuery("grab a burger and call an uber")).toEqual({
      intentSummary: "Plan a dining",
      steps: [
        {
          kind: "reserve",
          title: "Find burger near you",
          detail: "burger",
          to: "/eats/reserve?restaurantName=burger",
        },
        {
          kind: "eats",
          title: "Browse delivery menus",
          detail: "Or order delivery if you'd rather stay in",
          to: "/eats?q=burger",
        },
      ],
    });
  });
});

describe("planFromQuery — compound clauses", () => {
  it("merges clauses and caps at 4 steps (vs 3 for a single clause)", () => {
    const plan = planFromQuery("fly to Tokyo and then sushi");
    expect(plan.intentSummary).toBe("Plan a flight in Tokyo + dining");
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps.map((s) => s.kind)).toEqual(["flight", "hotel", "ride", "reserve"]);
  });

  it("dedupes identical steps across clauses by kind|title", () => {
    const plan = planFromQuery("ride to Tokyo then ride to Tokyo");
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps.map((s) => s.kind)).toEqual(["ride", "eats"]);
    expect(plan.steps[0].to).toBe("/rides/hub?destination=Tokyo");
  });
});
