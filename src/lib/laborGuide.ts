export type LaborDiff = "easy" | "medium" | "hard" | "complex";

export interface LaborGuideEntry {
  category: string;
  service: string;
  baseHours: number;
  diff: LaborDiff;
  notes: string;
}

export type VehicleClass = "car" | "suv" | "truck" | "luxury";

/**
 * Flat-rate hours in the guide are baselined to a typical front-wheel-drive
 * sedan. Larger / more complex platforms take longer for the same job, so we
 * scale the published hours by a class multiplier — a lightweight stand-in for
 * the vehicle-specific times an ALLDATA/Mitchell subscription would return.
 */
export const VEHICLE_CLASSES: { id: VehicleClass; label: string; mult: number }[] = [
  { id: "car", label: "Car / Sedan", mult: 1.0 },
  { id: "suv", label: "SUV / Crossover", mult: 1.15 },
  { id: "truck", label: "Truck / Van", mult: 1.25 },
  { id: "luxury", label: "Luxury / European", mult: 1.4 },
];

export const VEHICLE_CLASS_MULT: Record<VehicleClass, number> = Object.fromEntries(
  VEHICLE_CLASSES.map((c) => [c.id, c.mult]),
) as Record<VehicleClass, number>;

/** Class-adjusted hours, rounded to one decimal. */
export const adjustHours = (baseHours: number, vClass: VehicleClass): number =>
  Math.round(baseHours * VEHICLE_CLASS_MULT[vClass] * 10) / 10;

export const LABOR_GUIDE: LaborGuideEntry[] = [
  // Oil & Fluids
  { category: "Oil & Fluids", service: "Oil & Filter Change", baseHours: 0.5, diff: "easy", notes: "Add 0.3h for drain plug damage." },
  { category: "Oil & Fluids", service: "Transmission Fluid Drain & Fill", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Coolant Flush", baseHours: 1.0, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Power Steering Flush", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Brake Fluid Flush", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Differential Fluid (front)", baseHours: 0.5, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Differential Fluid (rear)", baseHours: 0.5, diff: "easy", notes: "" },
  { category: "Oil & Fluids", service: "Transfer Case Fluid", baseHours: 0.5, diff: "easy", notes: "4WD/AWD only." },
  // Brakes
  { category: "Brakes", service: "Brake Pads — Front", baseHours: 1.2, diff: "easy", notes: "Add 0.5h if rotors need resurfacing, 0.8h if replacing rotors." },
  { category: "Brakes", service: "Brake Pads — Rear", baseHours: 1.0, diff: "easy", notes: "Add 0.5h if rotors need resurfacing, 0.8h if replacing rotors." },
  { category: "Brakes", service: "Brake Rotors — Front (both)", baseHours: 1.8, diff: "medium", notes: "Includes pad replacement." },
  { category: "Brakes", service: "Brake Rotors — Rear (both)", baseHours: 1.5, diff: "medium", notes: "Includes pad replacement." },
  { category: "Brakes", service: "Brake Caliper — Front", baseHours: 1.5, diff: "medium", notes: "Per side. Flush included." },
  { category: "Brakes", service: "Brake Caliper — Rear", baseHours: 1.5, diff: "medium", notes: "Per side." },
  { category: "Brakes", service: "Brake Master Cylinder", baseHours: 2.0, diff: "medium", notes: "Includes bleed." },
  { category: "Brakes", service: "ABS Module", baseHours: 2.5, diff: "hard", notes: "May require scan tool calibration." },
  // Tires & Wheels
  { category: "Tires & Wheels", service: "Tire Mount & Balance (each)", baseHours: 0.25, diff: "easy", notes: "x4 = 1.0h for full set." },
  { category: "Tires & Wheels", service: "Tire Rotation", baseHours: 0.5, diff: "easy", notes: "" },
  { category: "Tires & Wheels", service: "Wheel Bearing — Front (hub)", baseHours: 2.0, diff: "medium", notes: "Add 0.5h for AWD or pressed bearing." },
  { category: "Tires & Wheels", service: "Wheel Bearing — Rear (hub)", baseHours: 1.5, diff: "medium", notes: "" },
  { category: "Tires & Wheels", service: "TPMS Sensor Replacement", baseHours: 0.5, diff: "easy", notes: "Per sensor. Relearn required." },
  { category: "Tires & Wheels", service: "Alignment (4-wheel)", baseHours: 1.0, diff: "medium", notes: "" },
  // Engine
  { category: "Engine", service: "Spark Plugs — 4-cyl", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Engine", service: "Spark Plugs — V6", baseHours: 1.5, diff: "medium", notes: "Add 1.0h if rear bank requires intake removal." },
  { category: "Engine", service: "Spark Plugs — V8", baseHours: 2.0, diff: "medium", notes: "" },
  { category: "Engine", service: "Air Filter (engine)", baseHours: 0.3, diff: "easy", notes: "" },
  { category: "Engine", service: "Cabin Air Filter", baseHours: 0.3, diff: "easy", notes: "" },
  { category: "Engine", service: "PCV Valve", baseHours: 0.5, diff: "easy", notes: "" },
  { category: "Engine", service: "Serpentine Belt", baseHours: 1.2, diff: "medium", notes: "Add 0.5h if tensioner replaced." },
  { category: "Engine", service: "Timing Belt (4-cyl)", baseHours: 4.0, diff: "hard", notes: "Add 1.0h for water pump. Add 1.5h for V6." },
  { category: "Engine", service: "Timing Chain (4-cyl)", baseHours: 6.0, diff: "complex", notes: "Engine-specific. May require oil pan removal." },
  { category: "Engine", service: "Head Gasket (4-cyl)", baseHours: 8.0, diff: "complex", notes: "Add 2.0h for V6/V8. Includes resurfacing." },
  { category: "Engine", service: "Valve Cover Gasket", baseHours: 1.5, diff: "medium", notes: "Add 1.5h for V6/V8 rear bank." },
  { category: "Engine", service: "Intake Manifold Gasket", baseHours: 3.0, diff: "hard", notes: "" },
  { category: "Engine", service: "Thermostat", baseHours: 1.2, diff: "medium", notes: "Add 0.5h for buried location." },
  { category: "Engine", service: "Water Pump", baseHours: 3.0, diff: "hard", notes: "Add 1.0h if timing belt driven." },
  { category: "Engine", service: "Radiator", baseHours: 2.5, diff: "medium", notes: "" },
  { category: "Engine", service: "Engine Mount", baseHours: 2.0, diff: "medium", notes: "Per mount. Add 0.5h for torque strut." },
  // Fuel System
  { category: "Fuel System", service: "Fuel Filter (inline)", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Fuel System", service: "Fuel Pump (in-tank)", baseHours: 2.0, diff: "medium", notes: "Add 1.0h if tank removal required." },
  { category: "Fuel System", service: "Fuel Injector (each)", baseHours: 0.5, diff: "medium", notes: "Add 1.0h if intake must come off." },
  { category: "Fuel System", service: "Throttle Body Clean/Replace", baseHours: 1.0, diff: "medium", notes: "Includes relearn procedure." },
  // Electrical
  { category: "Electrical", service: "Battery Replacement", baseHours: 0.5, diff: "easy", notes: "Add 0.5h for registration/coding (European makes)." },
  { category: "Electrical", service: "Alternator", baseHours: 2.5, diff: "medium", notes: "Add 1.0h if buried or requires engine lift." },
  { category: "Electrical", service: "Starter Motor", baseHours: 1.5, diff: "medium", notes: "Add 1.0h if transmission must be shifted." },
  { category: "Electrical", service: "Mass Air Flow Sensor", baseHours: 0.5, diff: "easy", notes: "" },
  { category: "Electrical", service: "O2 Sensor (upstream)", baseHours: 0.8, diff: "easy", notes: "Add 0.5h for downstream." },
  { category: "Electrical", service: "Crankshaft Position Sensor", baseHours: 1.0, diff: "medium", notes: "" },
  { category: "Electrical", service: "Camshaft Position Sensor", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Electrical", service: "Ignition Coil (each)", baseHours: 0.3, diff: "easy", notes: "" },
  // Steering & Suspension
  { category: "Steering & Suspension", service: "Shocks / Struts — Front (pair)", baseHours: 2.5, diff: "medium", notes: "Includes alignment check." },
  { category: "Steering & Suspension", service: "Shocks / Struts — Rear (pair)", baseHours: 2.0, diff: "medium", notes: "" },
  { category: "Steering & Suspension", service: "Ball Joint — Lower (per side)", baseHours: 2.0, diff: "hard", notes: "Add 0.5h if pressed. Alignment required." },
  { category: "Steering & Suspension", service: "Tie Rod End (per side)", baseHours: 1.0, diff: "medium", notes: "Alignment required after." },
  { category: "Steering & Suspension", service: "Sway Bar Links (pair)", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Steering & Suspension", service: "Sway Bar Bushings (pair)", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Steering & Suspension", service: "Control Arm (per side)", baseHours: 2.0, diff: "medium", notes: "Alignment required." },
  { category: "Steering & Suspension", service: "Power Steering Pump", baseHours: 2.5, diff: "medium", notes: "" },
  { category: "Steering & Suspension", service: "Rack & Pinion", baseHours: 4.0, diff: "hard", notes: "Alignment required." },
  // Drivetrain
  { category: "Drivetrain", service: "CV Axle — Front (per side)", baseHours: 2.0, diff: "medium", notes: "" },
  { category: "Drivetrain", service: "CV Axle — Rear (per side)", baseHours: 2.0, diff: "medium", notes: "" },
  { category: "Drivetrain", service: "Clutch Assembly", baseHours: 5.0, diff: "hard", notes: "Includes flywheel resurfacing check." },
  { category: "Drivetrain", service: "Transmission Mount", baseHours: 1.5, diff: "medium", notes: "" },
  { category: "Drivetrain", service: "Driveshaft (rear)", baseHours: 1.5, diff: "medium", notes: "" },
  // AC & Heating
  { category: "AC & Heating", service: "AC Compressor", baseHours: 3.0, diff: "hard", notes: "Includes evacuation & recharge." },
  { category: "AC & Heating", service: "AC Condenser", baseHours: 2.5, diff: "medium", notes: "Includes recharge." },
  { category: "AC & Heating", service: "Heater Core", baseHours: 6.0, diff: "complex", notes: "Dashboard removal usually required." },
  { category: "AC & Heating", service: "AC Recharge (R134a/R1234yf)", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "AC & Heating", service: "Blend Door Actuator", baseHours: 1.5, diff: "medium", notes: "May require dash removal." },
  // Exhaust
  { category: "Exhaust", service: "Catalytic Converter", baseHours: 2.0, diff: "medium", notes: "Add 1.0h for welded unit." },
  { category: "Exhaust", service: "Muffler / Exhaust Pipe", baseHours: 1.0, diff: "easy", notes: "Clamp-on; add 0.5h for welded." },
  { category: "Exhaust", service: "Exhaust Manifold Gasket", baseHours: 2.5, diff: "hard", notes: "Broken bolt risk adds time." },
  // Diagnostics
  { category: "Diagnostics", service: "Diagnostic Scan (DTC read)", baseHours: 0.5, diff: "easy", notes: "Minimum charge. Does not include testing." },
  { category: "Diagnostics", service: "Drivability Diagnosis", baseHours: 1.5, diff: "medium", notes: "Road test + scan + component test." },
  { category: "Diagnostics", service: "Electrical Diagnosis", baseHours: 2.0, diff: "hard", notes: "Wiring trace included." },
  { category: "Diagnostics", service: "Pre-Purchase Inspection", baseHours: 1.0, diff: "easy", notes: "" },
  { category: "Diagnostics", service: "State Inspection / Safety Check", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Diagnostics", service: "Misfire Diagnosis", baseHours: 1.2, diff: "medium", notes: "Per cylinder bank. Compression test extra." },
  { category: "Diagnostics", service: "Charging System Test", baseHours: 0.5, diff: "easy", notes: "Battery + alternator load test." },
  { category: "Diagnostics", service: "Parasitic Draw Test", baseHours: 1.5, diff: "hard", notes: "Amp-clamp isolation of circuits." },
  { category: "Diagnostics", service: "Compression / Leak-Down Test", baseHours: 1.5, diff: "medium", notes: "All cylinders." },
  { category: "Diagnostics", service: "ADAS Calibration (camera/radar)", baseHours: 1.5, diff: "hard", notes: "Required after windshield or bumper work. Targets needed." },

  // Oil & Fluids (added)
  { category: "Oil & Fluids", service: "Transmission Service (filter + pan gasket)", baseHours: 1.5, diff: "medium", notes: "Add 0.5h for dropped-pan deep service." },
  { category: "Oil & Fluids", service: "CVT Fluid Exchange", baseHours: 1.2, diff: "medium", notes: "Use OE-spec CVT fluid only." },
  { category: "Oil & Fluids", service: "Engine Oil Cooler / Lines", baseHours: 1.8, diff: "medium", notes: "" },

  // Tune-Up & Maintenance
  { category: "Tune-Up & Maintenance", service: "30k Mile Service", baseHours: 1.5, diff: "easy", notes: "Filters, fluids inspection, rotation." },
  { category: "Tune-Up & Maintenance", service: "60k Mile Service", baseHours: 2.5, diff: "medium", notes: "Adds plugs + fluid exchanges." },
  { category: "Tune-Up & Maintenance", service: "90k Mile Service", baseHours: 3.5, diff: "medium", notes: "Adds belts + comprehensive fluids." },
  { category: "Tune-Up & Maintenance", service: "Throttle/Induction Decarbon Service", baseHours: 1.2, diff: "medium", notes: "" },
  { category: "Tune-Up & Maintenance", service: "Wiper Blade / Arm Replacement", baseHours: 0.3, diff: "easy", notes: "" },

  // Cooling (added)
  { category: "Engine", service: "Heater Hose Replacement", baseHours: 1.2, diff: "medium", notes: "" },
  { category: "Engine", service: "Radiator Fan / Clutch", baseHours: 1.5, diff: "medium", notes: "Electric or mechanical." },
  { category: "Engine", service: "Oil Pan Gasket", baseHours: 3.5, diff: "hard", notes: "Add time if subframe drop required." },
  { category: "Engine", service: "Rear Main Seal", baseHours: 6.0, diff: "complex", notes: "Transmission removal required." },
  { category: "Engine", service: "Turbocharger Replacement", baseHours: 5.0, diff: "complex", notes: "Engine/platform specific." },

  // Steering & Suspension (added)
  { category: "Steering & Suspension", service: "Strut Mount / Bearing (per side)", baseHours: 1.5, diff: "medium", notes: "" },
  { category: "Steering & Suspension", service: "Coil Spring (per side)", baseHours: 2.0, diff: "hard", notes: "Spring compressor required." },
  { category: "Steering & Suspension", service: "Ball Joint — Upper (per side)", baseHours: 1.5, diff: "medium", notes: "Alignment required." },
  { category: "Steering & Suspension", service: "Wheel Alignment (2-wheel/toe)", baseHours: 0.7, diff: "easy", notes: "" },
  { category: "Steering & Suspension", service: "Air Suspension Compressor", baseHours: 2.5, diff: "hard", notes: "Common on luxury/SUV platforms." },

  // Drivetrain (added)
  { category: "Drivetrain", service: "Transmission R&R (replace)", baseHours: 8.0, diff: "complex", notes: "Reman/used unit. Programming may apply." },
  { category: "Drivetrain", service: "Transmission Rebuild", baseHours: 14.0, diff: "complex", notes: "Bench rebuild + R&R." },
  { category: "Drivetrain", service: "Flywheel / Flexplate", baseHours: 5.5, diff: "complex", notes: "Trans removal required." },
  { category: "Drivetrain", service: "Differential Rebuild", baseHours: 6.0, diff: "complex", notes: "" },
  { category: "Drivetrain", service: "Transfer Case R&R", baseHours: 4.0, diff: "hard", notes: "4WD/AWD." },

  // Brakes (added)
  { category: "Brakes", service: "Brake Lines / Hose (per corner)", baseHours: 1.0, diff: "medium", notes: "Flush + bleed included." },
  { category: "Brakes", service: "Parking Brake Shoes / Cable", baseHours: 1.5, diff: "medium", notes: "" },
  { category: "Brakes", service: "Electronic Parking Brake Service", baseHours: 1.2, diff: "medium", notes: "Scan tool to retract calipers." },
  { category: "Brakes", service: "Brake System Bleed (full)", baseHours: 1.0, diff: "easy", notes: "" },

  // Lighting & Body Electrical
  { category: "Lighting & Body Electrical", service: "Headlight Bulb (per side)", baseHours: 0.5, diff: "easy", notes: "Add time for bumper removal." },
  { category: "Lighting & Body Electrical", service: "Headlight Assembly (per side)", baseHours: 1.0, diff: "medium", notes: "" },
  { category: "Lighting & Body Electrical", service: "Headlight Restoration (pair)", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Lighting & Body Electrical", service: "Window Regulator / Motor", baseHours: 1.5, diff: "medium", notes: "Per door." },
  { category: "Lighting & Body Electrical", service: "Door Lock Actuator", baseHours: 1.2, diff: "medium", notes: "Per door." },
  { category: "Lighting & Body Electrical", service: "Backup Camera", baseHours: 1.5, diff: "medium", notes: "May require calibration." },

  // Body & Glass
  { category: "Body & Glass", service: "Windshield Replacement", baseHours: 1.5, diff: "medium", notes: "ADAS calibration may be required after." },
  { category: "Body & Glass", service: "Door Handle (exterior)", baseHours: 1.0, diff: "medium", notes: "Per door." },
  { category: "Body & Glass", service: "Side Mirror Assembly", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Body & Glass", service: "Wiper Linkage / Motor", baseHours: 1.5, diff: "medium", notes: "Cowl removal required." },

  // Safety & Restraints
  { category: "Safety & Restraints", service: "Airbag / SRS Diagnosis", baseHours: 1.5, diff: "hard", notes: "Disable system before work." },
  { category: "Safety & Restraints", service: "Clock Spring (SRS coil)", baseHours: 1.5, diff: "medium", notes: "Steering wheel removal." },
  { category: "Safety & Restraints", service: "Seat Belt Pretensioner", baseHours: 1.0, diff: "medium", notes: "" },

  // Hybrid & EV
  { category: "Hybrid & EV", service: "HV Battery Diagnosis", baseHours: 2.0, diff: "hard", notes: "HV-certified tech. System de-energize required." },
  { category: "Hybrid & EV", service: "Inverter Coolant Service", baseHours: 1.0, diff: "medium", notes: "" },
  { category: "Hybrid & EV", service: "12V (Aux) Battery — Hybrid", baseHours: 0.8, diff: "easy", notes: "Often in trunk/rear." },
  { category: "Hybrid & EV", service: "Charge Port / Cable Diagnosis", baseHours: 1.5, diff: "hard", notes: "EV only." },

  // Emissions
  { category: "Emissions", service: "EVAP Leak Diagnosis (smoke test)", baseHours: 1.0, diff: "medium", notes: "" },
  { category: "Emissions", service: "EGR Valve", baseHours: 1.2, diff: "medium", notes: "Add time for buried location." },
  { category: "Emissions", service: "Purge / Vent Solenoid", baseHours: 0.8, diff: "easy", notes: "" },
  { category: "Emissions", service: "DPF Regen / Service (diesel)", baseHours: 2.0, diff: "hard", notes: "Forced regen + inspection." },
];

export const LABOR_GUIDE_CATEGORIES = ["All", ...Array.from(new Set(LABOR_GUIDE.map(e => e.category)))];

export const DIFF_COLOR: Record<LaborDiff, string> = {
  easy: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  hard: "bg-orange-500/10 text-orange-600",
  complex: "bg-red-500/10 text-red-600",
};
