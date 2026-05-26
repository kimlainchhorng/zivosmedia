/**
 * Vehicle-import CSV parser + column auto-mapper + row validator.
 *
 * Pure utilities (no React, no Supabase). The import dialog uses these to
 * turn a pasted/uploaded CSV into a list of `DealershipVehicleDraft`s that
 * can be batch-inserted.
 */
import type {
  DealershipVehicleDraft,
  DealershipCondition,
  DealershipTransmission,
  DealershipFuel,
  DealershipDrivetrain,
  DealershipVehicleStatus,
} from "@/hooks/car-dealership/useDealershipInventory";

// ─── CSV parser ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of header→value records. Handles quoted
 * fields with embedded commas and escaped double-quotes ("" inside quotes).
 *
 * Lenient: trailing empty rows are dropped, the first non-empty line is the
 * header row.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseRows(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c.trim() === "")) continue;
    const rec: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rec[headers[j]] = (row[j] ?? "").trim();
    }
    out.push(rec);
  }
  return out;
}

// Internal: tokenize the full text into a 2D array of cells.
function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* swallow CR */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ─── column auto-mapping ─────────────────────────────────────────────────────

/** Canonical CSV columns we know how to map to a draft. */
export const KNOWN_COLUMNS = [
  "year", "make", "model", "trim", "body_type",
  "vin", "stock_number", "license_plate",
  "condition", "transmission", "fuel_type", "drivetrain",
  "engine", "cylinders", "doors", "seats",
  "mileage", "mileage_unit",
  "exterior_color", "interior_color",
  "cost", "asking_price", "msrp", "min_price",
  "photo_url",
  "features", // comma- or pipe-separated
  "description",
  "acquired_at", "acquired_from",
  "location_label",
  "status",
] as const;

export type CanonicalColumn = (typeof KNOWN_COLUMNS)[number];

/** Common header synonyms that should auto-map. */
const ALIASES: Record<string, CanonicalColumn> = {
  // year
  year: "year", model_year: "year", yr: "year",
  // identity
  make: "make", manufacturer: "make", brand: "make",
  model: "model",
  trim: "trim", trim_level: "trim", "trim level": "trim",
  body_type: "body_type", body: "body_type", "body type": "body_type", "body style": "body_type",
  vin: "vin",
  stock_number: "stock_number", stock: "stock_number", "stock #": "stock_number", "stock_no": "stock_number", "stock no": "stock_number",
  license_plate: "license_plate", plate: "license_plate", "license plate": "license_plate", licence_plate: "license_plate",
  // categorical
  condition: "condition",
  transmission: "transmission", trans: "transmission",
  fuel_type: "fuel_type", fuel: "fuel_type", "fuel type": "fuel_type",
  drivetrain: "drivetrain", drive: "drivetrain", driveline: "drivetrain", "drive train": "drivetrain", "drive_train": "drivetrain",
  // mechanical
  engine: "engine", engine_description: "engine", "engine description": "engine", motor: "engine",
  cylinders: "cylinders", cyl: "cylinders", cylinder_count: "cylinders",
  doors: "doors", door: "doors",
  seats: "seats", seat: "seats", seating: "seats", "seat count": "seats",
  // mileage
  mileage: "mileage", miles: "mileage", odometer: "mileage", odo: "mileage", km: "mileage",
  mileage_unit: "mileage_unit", unit: "mileage_unit", "mileage unit": "mileage_unit",
  // colors
  exterior_color: "exterior_color", color: "exterior_color", "exterior color": "exterior_color", "ext color": "exterior_color", "ext_color": "exterior_color", paint: "exterior_color",
  interior_color: "interior_color", "interior color": "interior_color", "int color": "interior_color", "int_color": "interior_color",
  // pricing (dollars; we convert to cents)
  cost: "cost", cost_dollars: "cost", "cost ($)": "cost", "cost (usd)": "cost", purchase_price: "cost", acquisition_cost: "cost",
  asking_price: "asking_price", price: "asking_price", "asking price": "asking_price", "list price": "asking_price", listing_price: "asking_price", sale_price: "asking_price",
  msrp: "msrp", retail: "msrp", "retail price": "msrp",
  min_price: "min_price", floor_price: "min_price", "minimum price": "min_price",
  // misc
  photo_url: "photo_url", photo: "photo_url", "photo url": "photo_url", image: "photo_url", image_url: "photo_url",
  features: "features", options: "features",
  description: "description", notes: "description", details: "description",
  acquired_at: "acquired_at", acquired_on: "acquired_at", acquired: "acquired_at", purchase_date: "acquired_at", "acquired date": "acquired_at",
  acquired_from: "acquired_from", source: "acquired_from", "acquired from": "acquired_from",
  location_label: "location_label", location: "location_label", "lot location": "location_label", lot: "location_label",
  status: "status",
};

const normalizeHeader = (h: string) =>
  h.trim().toLowerCase().replace(/\s+/g, " ");

/** Map raw headers → canonical column names (or null if no match). */
export function autoMapColumns(headers: string[]): Record<string, CanonicalColumn | null> {
  const out: Record<string, CanonicalColumn | null> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    const direct = ALIASES[norm];
    if (direct) { out[h] = direct; continue; }
    // Try snake-case version of the normalized header
    const snake = norm.replace(/[\s-]+/g, "_");
    if (ALIASES[snake]) { out[h] = ALIASES[snake]; continue; }
    // Try just substring containment on a few common keys
    out[h] = null;
  }
  return out;
}

// ─── row validation + conversion ─────────────────────────────────────────────

type Severity = "ok" | "warn" | "error";

export interface ValidatedRow {
  /** Index in source CSV (1-based, after header). */
  rowNumber: number;
  /** The draft we'd insert (if valid). */
  draft: DealershipVehicleDraft;
  /** Per-row severity. `error` = won't import; `warn` = importable but flagged. */
  severity: Severity;
  /** Human messages for the user. */
  messages: string[];
  /** Whether this row matches an existing vehicle (VIN or stock #). */
  duplicateOf: "vin" | "stock_number" | null;
}

interface ValidateOpts {
  /** Existing VINs in the store, lowercased. */
  existingVins: Set<string>;
  /** Existing stock numbers, lowercased. */
  existingStocks: Set<string>;
}

const CONDITION_MAP: Record<string, DealershipCondition> = {
  new: "new",
  used: "used",
  preowned: "used", "pre-owned": "used", "pre owned": "used",
  certified: "certified_preowned",
  certified_preowned: "certified_preowned",
  "certified pre-owned": "certified_preowned", "certified pre owned": "certified_preowned",
  cpo: "certified_preowned",
};
const TRANSMISSION_MAP: Record<string, DealershipTransmission> = {
  automatic: "automatic", auto: "automatic", at: "automatic",
  manual: "manual", mt: "manual", stick: "manual",
  cvt: "cvt",
  dual_clutch: "dual_clutch", "dual clutch": "dual_clutch", dct: "dual_clutch",
  other: "other",
};
const FUEL_MAP: Record<string, DealershipFuel> = {
  gas: "gasoline", gasoline: "gasoline", petrol: "gasoline", unleaded: "gasoline",
  diesel: "diesel",
  hybrid: "hybrid",
  plugin_hybrid: "plugin_hybrid", "plug-in hybrid": "plugin_hybrid", phev: "plugin_hybrid",
  electric: "electric", ev: "electric", bev: "electric",
  flex_fuel: "flex_fuel", "flex-fuel": "flex_fuel", e85: "flex_fuel",
  lpg: "lpg", propane: "lpg",
  other: "other",
};
const DRIVETRAIN_MAP: Record<string, DealershipDrivetrain> = {
  fwd: "fwd", "front wheel drive": "fwd",
  rwd: "rwd", "rear wheel drive": "rwd",
  awd: "awd", "all wheel drive": "awd",
  "4wd": "4wd", "four wheel drive": "4wd", "4x4": "4wd",
};
const STATUS_MAP: Record<string, DealershipVehicleStatus> = {
  available: "available", "for sale": "available", active: "available",
  reserved: "reserved",
  pending_sale: "pending_sale", "pending sale": "pending_sale", pending: "pending_sale",
  sold: "sold",
  in_transit: "in_transit", "in transit": "in_transit", transit: "in_transit",
  service: "service", "in service": "service", servicing: "service",
  retired: "retired", archived: "retired",
};

const parseInt0 = (s: string): number | null => {
  const cleaned = s.replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
};

const parseDollarsToCents = (s: string): number | null => {
  const cleaned = s.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};

const parseDate = (s: string): string | null => {
  if (!s.trim()) return null;
  const d = new Date(s.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

const parseFeatures = (s: string): string[] => {
  if (!s.trim()) return [];
  // Split on pipe, semicolon, or comma; trim; dedupe
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(/[|;,]/)) {
    const t = raw.trim();
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
  }
  return out;
}

// Build a draft from a parsed row, given the column mapping.
export function validateRow(
  rec: Record<string, string>,
  mapping: Record<string, CanonicalColumn | null>,
  rowNumber: number,
  opts: ValidateOpts,
): ValidatedRow {
  const messages: string[] = [];
  let severity: Severity = "ok";
  const setSev = (s: Severity) => {
    if (s === "error") severity = "error";
    else if (s === "warn" && severity !== "error") severity = "warn";
  };

  // Build a flat canonical record from the row using the mapping.
  const canon: Partial<Record<CanonicalColumn, string>> = {};
  for (const [rawHeader, canonicalCol] of Object.entries(mapping)) {
    if (!canonicalCol) continue;
    const v = rec[rawHeader];
    if (v != null) canon[canonicalCol] = v;
  }

  // ── required ────────────────────────────────────────────────────────────
  const make = (canon.make ?? "").trim();
  const model = (canon.model ?? "").trim();
  if (!make) { setSev("error"); messages.push("Missing make."); }
  if (!model) { setSev("error"); messages.push("Missing model."); }

  // ── numeric ─────────────────────────────────────────────────────────────
  const year = canon.year ? parseInt0(canon.year) : null;
  if (canon.year && year == null) { setSev("warn"); messages.push(`Year "${canon.year}" not understood.`); }

  const mileage = canon.mileage ? parseInt0(canon.mileage) : null;
  if (canon.mileage && mileage == null) {
    setSev("warn");
    messages.push(`Mileage "${canon.mileage}" not understood.`);
  }

  const cylinders = canon.cylinders ? parseInt0(canon.cylinders) : null;
  const doors = canon.doors ? parseInt0(canon.doors) : null;
  const seats = canon.seats ? parseInt0(canon.seats) : null;

  // ── pricing ─────────────────────────────────────────────────────────────
  const costCents = canon.cost != null ? parseDollarsToCents(canon.cost) : 0;
  const askingPriceCents = canon.asking_price != null ? parseDollarsToCents(canon.asking_price) : 0;
  const msrpCents = canon.msrp != null ? parseDollarsToCents(canon.msrp) : 0;
  const minPriceCents = canon.min_price != null ? parseDollarsToCents(canon.min_price) : 0;

  if (canon.cost != null && costCents == null) {
    setSev("error");
    messages.push(`Cost "${canon.cost}" not a valid number.`);
  }
  if (canon.asking_price != null && askingPriceCents == null) {
    setSev("error");
    messages.push(`Asking price "${canon.asking_price}" not a valid number.`);
  }
  if (canon.msrp != null && msrpCents == null) {
    setSev("warn");
    messages.push(`MSRP "${canon.msrp}" not a valid number.`);
  }

  if ((askingPriceCents ?? 0) === 0) {
    setSev("warn");
    messages.push("Asking price is $0.");
  }

  // ── enums ──────────────────────────────────────────────────────────────
  let condition: DealershipCondition = "used";
  if (canon.condition) {
    const c = CONDITION_MAP[canon.condition.trim().toLowerCase()];
    if (c) condition = c;
    else { setSev("warn"); messages.push(`Condition "${canon.condition}" not recognised — defaulting to "used".`); }
  }

  let transmission: DealershipTransmission = "automatic";
  if (canon.transmission) {
    const t = TRANSMISSION_MAP[canon.transmission.trim().toLowerCase()];
    if (t) transmission = t;
    else { setSev("warn"); messages.push(`Transmission "${canon.transmission}" not recognised — defaulting to "automatic".`); }
  }

  let fuelType: DealershipFuel = "gasoline";
  if (canon.fuel_type) {
    const f = FUEL_MAP[canon.fuel_type.trim().toLowerCase()];
    if (f) fuelType = f;
    else { setSev("warn"); messages.push(`Fuel type "${canon.fuel_type}" not recognised — defaulting to "gasoline".`); }
  }

  let drivetrain: DealershipDrivetrain | null = null;
  if (canon.drivetrain) {
    const d = DRIVETRAIN_MAP[canon.drivetrain.trim().toLowerCase()];
    if (d) drivetrain = d;
    else { setSev("warn"); messages.push(`Drivetrain "${canon.drivetrain}" not recognised — leaving blank.`); }
  }

  let status: DealershipVehicleStatus = "available";
  if (canon.status) {
    const s = STATUS_MAP[canon.status.trim().toLowerCase()];
    if (s) status = s;
    else { setSev("warn"); messages.push(`Status "${canon.status}" not recognised — defaulting to "available".`); }
  }

  // ── mileage unit ───────────────────────────────────────────────────────
  let mileageUnit: "mi" | "km" = "mi";
  if (canon.mileage_unit) {
    const u = canon.mileage_unit.trim().toLowerCase();
    if (u === "mi" || u === "miles") mileageUnit = "mi";
    else if (u === "km" || u === "kilometers" || u === "kilometres") mileageUnit = "km";
  }

  // ── duplicates ─────────────────────────────────────────────────────────
  const vin = canon.vin?.trim() || null;
  const stockNumber = canon.stock_number?.trim() || null;
  let duplicateOf: "vin" | "stock_number" | null = null;
  if (vin && opts.existingVins.has(vin.toLowerCase())) {
    duplicateOf = "vin";
    setSev("warn");
    messages.push(`Duplicate VIN ${vin} — already in your inventory.`);
  } else if (stockNumber && opts.existingStocks.has(stockNumber.toLowerCase())) {
    duplicateOf = "stock_number";
    setSev("warn");
    messages.push(`Duplicate stock # ${stockNumber} — already in your inventory.`);
  }

  // ── build draft ────────────────────────────────────────────────────────
  const draft: DealershipVehicleDraft = {
    stock_number: stockNumber,
    vin,
    make,
    model,
    trim: canon.trim?.trim() || null,
    year,
    body_type: canon.body_type?.trim() || null,
    exterior_color: canon.exterior_color?.trim() || null,
    interior_color: canon.interior_color?.trim() || null,
    license_plate: canon.license_plate?.trim() || null,
    condition,
    transmission,
    fuel_type: fuelType,
    drivetrain,
    engine: canon.engine?.trim() || null,
    cylinders,
    doors,
    seats,
    mileage,
    mileage_unit: mileageUnit,
    cost_cents: costCents ?? 0,
    asking_price_cents: askingPriceCents ?? 0,
    msrp_cents: msrpCents ?? 0,
    min_price_cents: minPriceCents ?? 0,
    photo_url: canon.photo_url?.trim() || null,
    photo_urls: canon.photo_url?.trim() ? [canon.photo_url.trim()] : [],
    video_url: null,
    features: canon.features ? parseFeatures(canon.features) : [],
    description: canon.description?.trim() || null,
    acquired_at: canon.acquired_at ? parseDate(canon.acquired_at) : null,
    acquired_from: canon.acquired_from?.trim() || null,
    location_label: canon.location_label?.trim() || null,
    status,
    is_active: true,
    is_featured: false,
  };

  return { rowNumber, draft, severity, messages, duplicateOf };
}

// ─── sample template ────────────────────────────────────────────────────────

/** Sample CSV body — used to seed the "Download template" button. */
export const SAMPLE_CSV = [
  "year,make,model,trim,body_type,vin,stock_number,mileage,condition,exterior_color,interior_color,transmission,fuel_type,drivetrain,engine,cost,asking_price,msrp,features,description",
  '2023,Toyota,Camry,SE,Sedan,4T1G11AK3PU000001,T1001,12500,used,Pearl White,Black,automatic,gasoline,fwd,"2.5L 4-cyl",22500,26995,28500,"Backup camera|Heated seats|Bluetooth","One owner, clean Carfax, no accidents."',
  '2021,Honda,Civic,EX,Sedan,2HGFC2F75MH000002,H2042,28900,used,Crystal Black,Gray,cvt,gasoline,fwd,"2.0L 4-cyl",17800,21495,,"Sunroof|Apple CarPlay|Lane keep assist",',
  '2024,Ford,F-150,XLT,Truck,1FTFW1E50PFA00003,F1305,8200,used,Race Red,Black,automatic,gasoline,4wd,"3.5L V6 EcoBoost",42000,49995,52800,"Tow package|4WD|Bed liner|Backup camera","Lightly used demo truck."',
].join("\n");
