export type LaborDiff = "easy" | "medium" | "hard" | "complex";

export interface LaborGuideEntry {
  category: string;
  service: string;
  baseHours: number;
  diff: LaborDiff;
  notes: string;
}

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
];

export const LABOR_GUIDE_CATEGORIES = ["All", ...Array.from(new Set(LABOR_GUIDE.map(e => e.category)))];

export const DIFF_COLOR: Record<LaborDiff, string> = {
  easy: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  hard: "bg-orange-500/10 text-orange-600",
  complex: "bg-red-500/10 text-red-600",
};
