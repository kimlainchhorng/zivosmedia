import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type VpicResult = {
  ErrorCode?: string;
  ErrorText?: string;
  Make?: string;
  Model?: string;
  ModelYear?: string;
  ManufacturerName?: string;
  VehicleType?: string;
  Trim?: string;
  Series?: string;
  Series2?: string;
  DisplacementL?: string;
  EngineCylinders?: string;
  EngineConfiguration?: string;
  EngineHP?: string;
  EngineModel?: string;
  FuelTypePrimary?: string;
  FuelTypeSecondary?: string;
  TransmissionStyle?: string;
  TransmissionSpeeds?: string;
  BodyClass?: string;
  Doors?: string;
  DriveType?: string;
  PlantCity?: string;
  PlantCountry?: string;
  PlantState?: string;
  GVWR?: string;
  Turbo?: string;
};

const sanitizeVin = (value: string) => value.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
const toTitle = (value = "") => value.replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeDriveType = (raw = "") => {
  const v = raw.toLowerCase();
  if (!v) return "";
  if (v.includes("4wd") || v.includes("4x4") || v.includes("4-wheel")) return "4WD";
  if (v.includes("awd") || v.includes("all-wheel") || v.includes("all wheel")) return "AWD";
  if (v.includes("fwd") || v.includes("front-wheel") || v.includes("front wheel")) return "FWD";
  if (v.includes("rwd") || v.includes("rear-wheel") || v.includes("rear wheel")) return "RWD";
  if (v.includes("2wd")) return "2WD";
  return toTitle(raw);
};

const normalizeTransmissionStyle = (raw = "") => {
  const v = raw.toLowerCase();
  if (!v) return "";
  if (v.includes("continuously variable") || v === "cvt") return "CVT";
  if (v.includes("dual-clutch") || v.includes("dual clutch") || v.includes("dct")) return "DCT";
  if (v.includes("automated manual") || v.includes("amt")) return "Automated Manual";
  if (v.includes("automatic")) return "Automatic";
  if (v.includes("manual")) return "Manual";
  return toTitle(raw);
};

const buildEngine = (r: VpicResult) => {
  const displ = r.DisplacementL ? `${parseFloat(r.DisplacementL).toFixed(1)}L` : "";
  const cylRaw = r.EngineCylinders;
  const cyl = cylRaw
    ? ` ${cylRaw === "4" ? "L4" : cylRaw === "6" ? "V6" : cylRaw === "8" ? "V8" : cylRaw === "10" ? "V10" : cylRaw === "12" ? "V12" : `${cylRaw}-cyl`}`
    : "";
  const config = r.EngineConfiguration && !cyl ? ` ${r.EngineConfiguration}` : "";
  const fuel = r.FuelTypePrimary && r.FuelTypePrimary !== "Gasoline" ? ` ${r.FuelTypePrimary}` : "";
  const turbo = r.Turbo && /yes|turbo/i.test(r.Turbo) ? " Turbo" : "";
  const hp = r.EngineHP ? ` (${r.EngineHP} hp)` : "";
  return `${displ}${cyl}${config}${fuel}${turbo}${hp}`.trim() || (r.EngineModel || "");
};

const buildTransmission = (r: VpicResult) => {
  const style = normalizeTransmissionStyle(r.TransmissionStyle || "");
  const speeds = r.TransmissionSpeeds ? `${r.TransmissionSpeeds}-Speed` : "";
  return [speeds, style].filter(Boolean).join(" ").trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();
    const clean = typeof vin === "string" ? sanitizeVin(vin) : "";

    if (clean.length !== 17) {
      return new Response(JSON.stringify({ error: "VIN must be 17 characters (no I, O, Q)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(clean)}?format=json`;
    const res = await fetch(url, { method: "GET", headers: { accept: "application/json" } });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `VIN provider failed (${res.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const r = (data?.Results?.[0] || {}) as VpicResult;
    const hasAnyData = r.Make || r.Model || r.ModelYear || r.ManufacturerName || r.VehicleType;

    if (!hasAnyData) {
      return new Response(JSON.stringify({
        error: r.ErrorText || "No vehicle data found",
        vin: clean,
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const year = r.ModelYear || "";
    const make = r.Make ? toTitle(r.Make) : "";
    const model = r.Model || "";
    const trim = r.Trim || r.Series || r.Series2 || "";
    const engine = buildEngine(r);
    const transmission = buildTransmission(r);
    const driveType = normalizeDriveType(r.DriveType || "");
    const bodyClass = r.BodyClass ? toTitle(r.BodyClass) : "";
    const doors = r.Doors || "";
    const fuel = r.FuelTypePrimary || "";
    const fuelSecondary = r.FuelTypeSecondary || "";
    const plant = [r.PlantCity, r.PlantState, r.PlantCountry].filter(Boolean).map(toTitle).join(", ");
    const vehicle = [year, make, model].filter(Boolean).join(" ");
    const partial = !!(r.ErrorCode && r.ErrorCode !== "0");

    return new Response(JSON.stringify({
      ok: true,
      partial,
      vin: clean,
      year,
      make,
      model,
      trim,
      engine,
      transmission,
      driveType,
      bodyClass,
      doors,
      fuel,
      fuelSecondary,
      plant,
      manufacturer: r.ManufacturerName ? toTitle(r.ManufacturerName) : "",
      vehicleType: r.VehicleType ? toTitle(r.VehicleType) : "",
      gvwr: r.GVWR || "",
      vehicle,
      errorCode: r.ErrorCode || "0",
      errorText: r.ErrorText || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[vin-decode] error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
