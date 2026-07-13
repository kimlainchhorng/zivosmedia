import { describe, it, expect } from "vitest";
import { LABOR_GUIDE, estimateLabor, parseEngine, isAllWheelDrive, type VehicleSpec } from "@/lib/laborGuide";

const find = (service: string) => {
  const e = LABOR_GUIDE.find((g) => g.service === service);
  if (!e) throw new Error(`guide entry not found: ${service}`);
  return e;
};

describe("parseEngine", () => {
  it("reads cylinder count from common engine strings", () => {
    expect(parseEngine("2.5L 4-cyl").cylinders).toBe(4);
    expect(parseEngine("3.5L V6").cylinders).toBe(6);
    expect(parseEngine("5.0L V8").cylinders).toBe(8);
    expect(parseEngine("I4 2.0T").cylinders).toBe(4);
    expect(parseEngine("").cylinders).toBeNull();
  });
  it("flags forced induction and diesel", () => {
    expect(parseEngine("6.7L V8 Turbo Diesel")).toMatchObject({ cylinders: 8, turbo: true, diesel: true });
    expect(parseEngine("2.0L Turbo")).toMatchObject({ turbo: true, diesel: false });
  });
});

describe("isAllWheelDrive", () => {
  it("detects AWD/4WD from drivetrain or model text", () => {
    expect(isAllWheelDrive({ drivetrain: "AWD" })).toBe(true);
    expect(isAllWheelDrive({ drivetrain: "4WD" })).toBe(true);
    expect(isAllWheelDrive({ model: "Q5 quattro" })).toBe(true);
    expect(isAllWheelDrive({ drivetrain: "FWD" })).toBe(false);
  });
});

describe("estimateLabor — vehicle specificity", () => {
  const malibu: VehicleSpec = { year: 2010, make: "Chevrolet", model: "Malibu", engine: "2.5L 4-cyl", drivetrain: "FWD", vClass: "car" };

  it("leaves a basic service on a 4-cyl sedan unchanged", () => {
    const est = estimateLabor(find("Oil & Filter Change"), malibu);
    expect(est.hours).toBe(0.5);
    expect(est.vehicleSpecific).toBe(false);
  });

  it("adds an age factor to exhaust work on an older vehicle", () => {
    const est = estimateLabor(find("Catalytic Converter"), malibu);
    expect(est.hours).toBeGreaterThan(2.0); // base 2.0 × ~1.15+ for a 12+ yr old car
    expect(est.summary.toLowerCase()).toContain("rust");
  });

  it("bumps engine-bay jobs for a V6, but not basic services", () => {
    const v6: VehicleSpec = { year: 2022, make: "Honda", model: "Pilot", engine: "3.5L V6", drivetrain: "FWD", vClass: "car" };
    const wp = estimateLabor(find("Water Pump"), v6);
    expect(wp.hours).toBe(3.6); // 3.0 × 1.2
    expect(wp.summary).toContain("6-cyl");
    // A young V6 sedan oil change is still flat.
    expect(estimateLabor(find("Oil & Filter Change"), v6).hours).toBe(0.5);
  });

  it("does NOT double-count engine on entries already split by engine", () => {
    const v6: VehicleSpec = { year: 2022, make: "Honda", model: "Pilot", engine: "3.5L V6", vClass: "car" };
    const plugs = estimateLabor(find("Spark Plugs — V6"), v6);
    expect(plugs.hours).toBe(1.5); // unchanged base — no extra engine multiplier
    expect(plugs.vehicleSpecific).toBe(false);
  });

  it("adds AWD time to driveline jobs", () => {
    const awd: VehicleSpec = { year: 2021, make: "Subaru", model: "Outback", engine: "2.5L 4-cyl", drivetrain: "AWD", vClass: "suv" };
    const cv = estimateLabor(find("CV Axle — Front (per side)"), awd);
    // base 2.0 × SUV 1.15 × AWD 1.2 = 2.76 → 2.8
    expect(cv.hours).toBe(2.8);
    expect(cv.summary).toContain("AWD");
  });

  it("falls back to plain class behaviour with no vehicle data", () => {
    const est = estimateLabor(find("Oil & Filter Change"), {});
    expect(est.hours).toBe(0.5);
    expect(est.vehicleSpecific).toBe(false);
  });
});
