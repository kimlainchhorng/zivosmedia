/**
 * VIN decoder — wraps the free NHTSA vPIC API and normalises the raw
 * response into a `Partial<DealershipVehicleDraft>` we can merge into the
 * vehicle dialog draft.
 *
 * API: https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json
 *
 * Notes:
 *  • No auth, no rate-limiting we need to worry about for typical dealer
 *    use. Returns a flat array of {Variable, Value, ValueId} entries.
 *  • Many fields come back as the string "Not Applicable" or null — we
 *    filter those out so they don't overwrite user-entered data.
 *  • Pre-1981 VINs and non-US/Canada vehicles may not decode fully; we
 *    return whatever we got and let the caller surface "no data" if needed.
 */
import type {
  DealershipVehicleDraft,
  DealershipFuel,
  DealershipDrivetrain,
} from "@/hooks/car-dealership/useDealershipInventory";

const ENDPOINT = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin";

interface VpicResult {
  Variable: string;
  Value: string | null;
  ValueId?: string | null;
}

interface VpicResponse {
  Results: VpicResult[];
  Count: number;
  Message: string;
}

/** What the decoder returns to the caller. */
export interface DecodedVin {
  /** Fields ready to merge into the dialog draft. */
  patch: Partial<DealershipVehicleDraft>;
  /** Short, user-friendly summary line ("2023 Toyota Camry SE · Sedan · 2.5L 4-cyl"). */
  summary: string;
  /** How many fields we managed to populate. Useful for "no data" detection. */
  fieldCount: number;
  /** Optional warning surfaced from the API (e.g. malformed VIN). */
  warning: string | null;
}

const isBlank = (v: string | null | undefined): boolean =>
  v == null || v.trim() === "" || /^not applicable$/i.test(v.trim()) || /^\d{1,3}$/.test(v.trim()) && v.trim() === "0";

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Map vPIC's fuel-type values to our enum.
const FUEL_MAP: Record<string, DealershipFuel> = {
  gasoline: "gasoline",
  "gasoline (hybrid)": "hybrid",
  "gasoline, hybrid": "hybrid",
  hybrid: "hybrid",
  diesel: "diesel",
  electric: "electric",
  "electric fuel system": "electric",
  "battery electric (bev)": "electric",
  "plug-in hybrid electric (phev)": "plugin_hybrid",
  "plug-in hybrid": "plugin_hybrid",
  flexible: "flex_fuel",
  "flexible fuel": "flex_fuel",
  e85: "flex_fuel",
  "compressed natural gas (cng)": "lpg",
  "liquefied petroleum gas (propane)": "lpg",
};

// Map vPIC's drive-type values to our enum.
const DRIVE_MAP: Record<string, DealershipDrivetrain> = {
  "fwd/front-wheel drive": "fwd",
  fwd: "fwd",
  "front-wheel drive": "fwd",
  "rwd/rear-wheel drive": "rwd",
  rwd: "rwd",
  "rear-wheel drive": "rwd",
  awd: "awd",
  "all-wheel drive": "awd",
  "4wd/4-wheel drive/4x4": "4wd",
  "4wd": "4wd",
  "4-wheel drive": "4wd",
  "4x4": "4wd",
};

/** Map any vPIC body-class string to a short pretty label. */
function normalizeBodyClass(raw: string): string {
  const v = raw.trim();
  // Common cleanups: drop trailing parenthesis qualifiers
  return v.replace(/\s*\(.*\)\s*$/, "").trim();
}

/** Build a single-line "engine" description from various vPIC fields. */
function buildEngineSummary(
  displacementL: string | null,
  cylinders: string | null,
  modelYearNum: number | null,
  turboCharger: string | null,
  superCharger: string | null,
): string | null {
  const parts: string[] = [];
  if (displacementL && !isBlank(displacementL)) {
    const n = parseFloat(displacementL);
    if (Number.isFinite(n) && n > 0) parts.push(`${n.toFixed(1)}L`);
  }
  if (cylinders && !isBlank(cylinders)) {
    const n = parseInt(cylinders, 10);
    if (Number.isFinite(n) && n > 0) {
      // V6 / V8 / etc. for >=6 cyl, "4-cyl" / "3-cyl" otherwise
      if (n >= 6 && n % 2 === 0) parts.push(`V${n}`);
      else parts.push(`${n}-cyl`);
    }
  }
  if (turboCharger && /yes|turbo/i.test(turboCharger)) parts.push("Turbocharged");
  if (superCharger && /yes|super/i.test(superCharger)) parts.push("Supercharged");
  if (parts.length === 0) return null;
  return parts.join(" ");
  void modelYearNum;
}

// ─── main decoder ────────────────────────────────────────────────────────────

export async function decodeVin(vin: string): Promise<DecodedVin> {
  const cleaned = vin.trim().toUpperCase();
  if (cleaned.length < 11 || cleaned.length > 17) {
    return {
      patch: {},
      summary: "",
      fieldCount: 0,
      warning: "VIN should be 11–17 characters.",
    };
  }

  const url = `${ENDPOINT}/${encodeURIComponent(cleaned)}?format=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error(`NHTSA returned ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as VpicResponse;
  if (!Array.isArray(data.Results)) {
    throw new Error("Unexpected NHTSA response shape.");
  }

  // Index results by Variable name for easy lookup
  const byVar: Record<string, string | null> = {};
  for (const r of data.Results) byVar[r.Variable] = r.Value;

  const errorText = byVar["Error Text"];
  const errorCode = byVar["Error Code"];
  const warning = errorText && !/^0/i.test(errorText) && !/^$/.test(errorText)
    ? errorText
    : null;

  // ── extract fields ─────────────────────────────────────────────────────
  const patch: Partial<DealershipVehicleDraft> = {};

  const year = byVar["Model Year"];
  if (!isBlank(year)) {
    const y = parseInt(year!, 10);
    if (Number.isFinite(y) && y > 1900) patch.year = y;
  }

  const make = byVar["Make"];
  if (!isBlank(make)) patch.make = titleCase(make!);

  const model = byVar["Model"];
  if (!isBlank(model)) patch.model = titleCase(model!);

  const trim = byVar["Trim"] || byVar["Trim2"] || byVar["Series"];
  if (!isBlank(trim)) patch.trim = titleCase(trim!);

  const bodyClass = byVar["Body Class"];
  if (!isBlank(bodyClass)) patch.body_type = normalizeBodyClass(bodyClass!);

  const cylinders = byVar["Engine Number of Cylinders"];
  if (!isBlank(cylinders)) {
    const n = parseInt(cylinders!, 10);
    if (Number.isFinite(n) && n > 0) patch.cylinders = n;
  }

  const doors = byVar["Doors"];
  if (!isBlank(doors)) {
    const n = parseInt(doors!, 10);
    if (Number.isFinite(n) && n > 0) patch.doors = n;
  }

  const seats = byVar["Seat Belts All"] || byVar["Number of Seats"];
  if (!isBlank(seats)) {
    const n = parseInt(seats!, 10);
    if (Number.isFinite(n) && n > 0) patch.seats = n;
  }

  // Engine summary from displacement + cylinders + boost type
  const engineDesc = buildEngineSummary(
    byVar["Displacement (L)"],
    cylinders,
    patch.year ?? null,
    byVar["Turbo"],
    byVar["Supercharger"],
  );
  if (engineDesc) patch.engine = engineDesc;

  // Fuel type — vPIC has "Fuel Type - Primary"
  const fuel = byVar["Fuel Type - Primary"] || byVar["Fuel Type Primary"];
  if (!isBlank(fuel)) {
    const key = fuel!.trim().toLowerCase();
    const mapped = FUEL_MAP[key];
    if (mapped) patch.fuel_type = mapped;
  }

  // Drive type
  const drive = byVar["Drive Type"];
  if (!isBlank(drive)) {
    const key = drive!.trim().toLowerCase();
    const mapped = DRIVE_MAP[key];
    if (mapped) patch.drivetrain = mapped;
  }

  // Store the VIN (capitalised) too
  patch.vin = cleaned;

  // ── build summary line ─────────────────────────────────────────────────
  const summaryParts = [
    patch.year ? String(patch.year) : "",
    patch.make ?? "",
    patch.model ?? "",
    patch.trim ?? "",
  ].filter(Boolean);
  const extras: string[] = [];
  if (patch.body_type) extras.push(patch.body_type);
  if (patch.engine) extras.push(patch.engine);
  const summary = summaryParts.length > 0
    ? summaryParts.join(" ") + (extras.length > 0 ? ` · ${extras.join(" · ")}` : "")
    : "(no recognisable data)";

  // ── count populated fields (excluding VIN itself, which we always set) ──
  const fieldCount = Object.keys(patch).filter((k) => k !== "vin").length;

  return { patch, summary, fieldCount, warning: warning && errorCode !== "0" ? warning : null };
}
