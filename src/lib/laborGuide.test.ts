/**
 * Contract tests for the pure helpers in laborGuide.ts — the auto-repair labor
 * estimator. parseEngine, isAllWheelDrive, adjustHours, VEHICLE_CLASS_MULT, and
 * estimateLabor are pure; LABOR_GUIDE / LABOR_GUIDE_CATEGORIES / DIFF_COLOR are data.
 *
 * Expected values are ground-truthed by an independent oracle that does NOT import
 * the module — it re-derives every algorithm clean-room from the documented behavior.
 * Load-bearing, non-obvious contracts pinned here:
 *   - parseEngine cylinder precedence: V-pattern, then N-cyl, then i/l-N, then
 *     "N cylinder", with a 2..16 clamp that nulls V18 and V1; turbo/diesel are
 *     independent keyword flags (a cyl-less "1.5L Turbo" / "3.0L TDI" still flag).
 *   - isAllWheelDrive scans drivetrain + model + notes together (so "X5 xDrive40i"
 *     in the model field counts), matching AWD/4WD/4x4/quattro/xdrive/4motion/4matic.
 *   - estimateLabor multipliers STACK (class · engine · forced-induction · drivetrain)
 *     but are capped at 2.2; engine-split services (e.g. "Spark Plugs — V6") are
 *     EXCLUDED from the engine bump; hours round to one decimal.
 *
 * estimateLabor's ONLY date coupling is the fastener-age branch (CURRENT_YEAR); these
 * vectors never pass spec.year, so that branch is always skipped and stays deterministic.
 * Synthetic LaborGuideEntry literals are used (estimateLabor takes the entry as a param),
 * so the suite is independent of the LABOR_GUIDE catalog.
 */
import { describe, it, expect } from "vitest";
import {
  parseEngine,
  isAllWheelDrive,
  adjustHours,
  VEHICLE_CLASS_MULT,
  estimateLabor,
} from "./laborGuide";

describe("parseEngine", () => {
  it("parses cylinder count across notation styles", () => {
    expect(parseEngine("2.5L 4-cyl")).toEqual({ cylinders: 4, turbo: false, diesel: false });
    expect(parseEngine("3.5L V6")).toEqual({ cylinders: 6, turbo: false, diesel: false });
    expect(parseEngine("i4")).toEqual({ cylinders: 4, turbo: false, diesel: false });
    expect(parseEngine("I-6")).toEqual({ cylinders: 6, turbo: false, diesel: false });
    expect(parseEngine("6.0L V12")).toEqual({ cylinders: 12, turbo: false, diesel: false });
  });

  it("clamps implausible cylinder counts to null (2..16)", () => {
    expect(parseEngine("V18").cylinders).toBeNull();
    expect(parseEngine("V1").cylinders).toBeNull();
  });

  it("flags turbo and diesel independently of cylinder detection", () => {
    expect(parseEngine("6.7L V8 Turbo Diesel")).toEqual({ cylinders: 8, turbo: true, diesel: true });
    expect(parseEngine("1.5L Turbo")).toEqual({ cylinders: null, turbo: true, diesel: false });
    expect(parseEngine("3.0L TDI")).toEqual({ cylinders: null, turbo: false, diesel: true });
    expect(parseEngine("Cummins 6.7")).toEqual({ cylinders: null, turbo: false, diesel: true });
  });

  it("returns the empty profile for blank / nullish input", () => {
    expect(parseEngine("")).toEqual({ cylinders: null, turbo: false, diesel: false });
    expect(parseEngine(null)).toEqual({ cylinders: null, turbo: false, diesel: false });
  });
});

describe("isAllWheelDrive", () => {
  it("detects AWD synonyms in the drivetrain field", () => {
    expect(isAllWheelDrive({ drivetrain: "AWD" })).toBe(true);
    expect(isAllWheelDrive({ drivetrain: "4WD" })).toBe(true);
    expect(isAllWheelDrive({ drivetrain: "all-wheel drive" })).toBe(true);
    expect(isAllWheelDrive({ drivetrain: "4MATIC" })).toBe(true);
  });

  it("scans the model and notes fields too", () => {
    expect(isAllWheelDrive({ drivetrain: "RWD", model: "X5 xDrive40i" })).toBe(true);
    expect(isAllWheelDrive({ notes: "quattro" })).toBe(true);
  });

  it("returns false for FWD and an empty spec", () => {
    expect(isAllWheelDrive({ drivetrain: "FWD" })).toBe(false);
    expect(isAllWheelDrive({})).toBe(false);
  });
});

describe("adjustHours", () => {
  it("scales by the vehicle-class multiplier, rounded to one decimal", () => {
    expect(adjustHours(1.0, "car")).toBe(1.0);
    expect(adjustHours(2.0, "suv")).toBe(2.3);
    expect(adjustHours(2.0, "truck")).toBe(2.5);
    expect(adjustHours(3.0, "luxury")).toBe(4.2);
    expect(adjustHours(0.5, "suv")).toBe(0.6);
  });
});

describe("VEHICLE_CLASS_MULT", () => {
  it("pins the class multiplier table", () => {
    expect(VEHICLE_CLASS_MULT).toEqual({ car: 1.0, suv: 1.15, truck: 1.25, luxury: 1.4 });
  });
});

describe("estimateLabor", () => {
  it("applies an engine-cylinder factor for engine-sensitive work", () => {
    expect(
      estimateLabor(
        { category: "Engine", service: "Water Pump", baseHours: 3.0, diff: "hard", notes: "" },
        { engine: "3.5L V6", vClass: "car" },
      ),
    ).toEqual({
      hours: 3.6,
      baseHours: 3.0,
      factors: [{ label: "6-cyl engine", mult: 1.2 }],
      summary: "6-cyl engine",
      vehicleSpecific: true,
    });
  });

  it("returns the base hours with no factors when nothing applies", () => {
    expect(
      estimateLabor(
        { category: "Oil & Fluids", service: "Oil & Filter Change", baseHours: 0.5, diff: "easy", notes: "" },
        {},
      ),
    ).toEqual({
      hours: 0.5,
      baseHours: 0.5,
      factors: [],
      summary: "Car / Sedan",
      vehicleSpecific: false,
    });
  });

  it("applies the vehicle-class factor on its own", () => {
    expect(
      estimateLabor(
        { category: "Brakes", service: "Brake Pads — Front", baseHours: 1.2, diff: "easy", notes: "" },
        { vClass: "suv" },
      ),
    ).toEqual({
      hours: 1.4,
      baseHours: 1.2,
      factors: [{ label: "SUV / Crossover", mult: 1.15 }],
      summary: "SUV / Crossover",
      vehicleSpecific: true,
    });
  });

  it("applies the AWD factor for drivetrain-sensitive work", () => {
    expect(
      estimateLabor(
        { category: "Drivetrain", service: "CV Axle — Front (per side)", baseHours: 2.0, diff: "medium", notes: "" },
        { drivetrain: "AWD", vClass: "car" },
      ),
    ).toEqual({
      hours: 2.4,
      baseHours: 2.0,
      factors: [{ label: "AWD / 4WD", mult: 1.2 }],
      summary: "AWD / 4WD",
      vehicleSpecific: true,
    });
  });

  it("does NOT apply an engine bump to engine-split services", () => {
    expect(
      estimateLabor(
        { category: "Engine", service: "Spark Plugs — V6", baseHours: 1.5, diff: "medium", notes: "" },
        { engine: "3.5L V6", vClass: "car" },
      ),
    ).toEqual({
      hours: 1.5,
      baseHours: 1.5,
      factors: [],
      summary: "Car / Sedan",
      vehicleSpecific: false,
    });
  });

  it("stacks class/engine/turbo/diesel factors and caps the multiplier at 2.2", () => {
    expect(
      estimateLabor(
        { category: "Engine", service: "Head Gasket", baseHours: 8.0, diff: "complex", notes: "" },
        { engine: "6.0L V12 Twin-Turbo Diesel", vClass: "luxury" },
      ),
    ).toEqual({
      hours: 17.6,
      baseHours: 8.0,
      factors: [
        { label: "Luxury / European", mult: 1.4 },
        { label: "12-cyl engine", mult: 1.5 },
        { label: "Turbo", mult: 1.1 },
        { label: "Diesel", mult: 1.15 },
      ],
      summary: "Luxury / European · 12-cyl engine · Turbo · Diesel",
      vehicleSpecific: true,
    });
  });
});
