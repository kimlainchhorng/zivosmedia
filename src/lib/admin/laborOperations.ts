/**
 * Common auto-repair labor operations for the Build R.O. description typeahead.
 * Typing in a line's Description filters this list (e.g. "brake" → brake jobs)
 * so techs can pick a standard op instead of free-typing. `hours` seeds the
 * labor Hrs field on select; it's a typical book-time starting point, editable.
 */
export interface LaborOperation {
  label: string;
  hours: number;
  group: string;
}

export const LABOR_OPERATIONS: LaborOperation[] = [
  // Brakes
  { label: "Brake Pads - Front - Replace", hours: 1.2, group: "Brakes" },
  { label: "Brake Pads - Rear - Replace", hours: 1.2, group: "Brakes" },
  { label: "Brake Pads & Rotors - Front - Replace", hours: 1.8, group: "Brakes" },
  { label: "Brake Pads & Rotors - Rear - Replace", hours: 1.8, group: "Brakes" },
  { label: "Brake Rotors - Front - Replace", hours: 1.0, group: "Brakes" },
  { label: "Brake Rotors - Rear - Replace", hours: 1.0, group: "Brakes" },
  { label: "Brake Caliper - Replace", hours: 1.2, group: "Brakes" },
  { label: "Brake Fluid - Flush & Bleed", hours: 0.8, group: "Brakes" },
  { label: "Brake Inspection", hours: 0.5, group: "Brakes" },
  { label: "Parking Brake - Adjust", hours: 0.6, group: "Brakes" },

  // Oil & filters
  { label: "Oil Change - Synthetic", hours: 0.5, group: "Maintenance" },
  { label: "Oil Change - Conventional", hours: 0.5, group: "Maintenance" },
  { label: "Engine Air Filter - Replace", hours: 0.3, group: "Maintenance" },
  { label: "Cabin Air Filter - Replace", hours: 0.4, group: "Maintenance" },
  { label: "Fuel Filter - Replace", hours: 0.7, group: "Maintenance" },

  // Tires & wheels
  { label: "Tire Rotation", hours: 0.4, group: "Tires" },
  { label: "Mount & Balance - 4 Tires", hours: 1.0, group: "Tires" },
  { label: "Flat Tire Repair", hours: 0.4, group: "Tires" },
  { label: "TPMS Sensor - Replace", hours: 0.6, group: "Tires" },
  { label: "Wheel Alignment - 4 Wheel", hours: 1.0, group: "Tires" },

  // Battery & electrical
  { label: "Battery - Test & Replace", hours: 0.4, group: "Electrical" },
  { label: "Alternator - Replace", hours: 1.5, group: "Electrical" },
  { label: "Starter - Replace", hours: 1.5, group: "Electrical" },
  { label: "Headlight Bulb - Replace", hours: 0.4, group: "Electrical" },
  { label: "Spark Plugs - Replace", hours: 1.2, group: "Electrical" },

  // Cooling & engine
  { label: "Coolant - Flush & Fill", hours: 1.0, group: "Engine" },
  { label: "Thermostat - Replace", hours: 1.2, group: "Engine" },
  { label: "Water Pump - Replace", hours: 2.5, group: "Engine" },
  { label: "Serpentine Belt - Replace", hours: 0.8, group: "Engine" },
  { label: "Timing Belt - Replace", hours: 4.0, group: "Engine" },
  { label: "Valve Cover Gasket - Replace", hours: 2.0, group: "Engine" },

  // Suspension & steering
  { label: "Front Struts - Replace (Pair)", hours: 2.5, group: "Suspension" },
  { label: "Rear Shocks - Replace (Pair)", hours: 1.5, group: "Suspension" },
  { label: "Control Arm - Replace", hours: 1.5, group: "Suspension" },
  { label: "Ball Joint - Replace", hours: 1.3, group: "Suspension" },
  { label: "Tie Rod End - Replace", hours: 1.0, group: "Suspension" },
  { label: "Wheel Bearing/Hub - Replace", hours: 1.5, group: "Suspension" },
  { label: "Sway Bar Link - Replace", hours: 0.7, group: "Suspension" },

  // Transmission & drivetrain
  { label: "Transmission Fluid Service", hours: 1.2, group: "Drivetrain" },
  { label: "CV Axle - Replace", hours: 1.5, group: "Drivetrain" },
  { label: "Clutch - Replace", hours: 5.0, group: "Drivetrain" },

  // HVAC
  { label: "A/C Recharge", hours: 0.8, group: "HVAC" },
  { label: "A/C System - Diagnose", hours: 1.0, group: "HVAC" },
  { label: "Blower Motor - Replace", hours: 1.2, group: "HVAC" },

  // Diagnostics & misc
  { label: "Check Engine Light - Diagnose", hours: 1.0, group: "Diagnostics" },
  { label: "No Start - Diagnose", hours: 1.0, group: "Diagnostics" },
  { label: "Electrical - Diagnose", hours: 1.0, group: "Diagnostics" },
  { label: "Wiper Blades - Replace", hours: 0.2, group: "Maintenance" },
  { label: "Oxygen (O2) Sensor - Replace", hours: 0.8, group: "Engine" },
  { label: "Multi-Point Inspection", hours: 0.5, group: "Diagnostics" },
];

export function searchLaborOperations(query: string, limit = 8): LaborOperation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = LABOR_OPERATIONS.map((op) => {
    const hay = op.label.toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) return null;
    const idx = hay.indexOf(tokens[0]);
    return { op, score: idx === 0 ? -1 : idx };
  }).filter((x): x is { op: LaborOperation; score: number } => x !== null);
  scored.sort((a, b) => a.score - b.score || a.op.label.localeCompare(b.op.label));
  return scored.slice(0, limit).map((x) => x.op);
}
