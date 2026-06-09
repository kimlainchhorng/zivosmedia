// VIN decode — NHTSA vPIC for make/model/year/engine; DOE Fuel Economy API as
// transmission fallback when NHTSA lacks that data (common for many VINs).
import { withSecurity } from "./_shared/withSecurity.ts";

const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin";
const FUELECONOMY = "https://www.fueleconomy.gov/ws/rest";

function pick(results: Array<{ Variable: string; Value: string | null }>, name: string): string {
  return results.find((r) => r.Variable === name)?.Value?.trim() || "";
}

// Parse XML menuItem list from Fuel Economy options endpoint.
// <menuItem><text>Auto 9-spd, 4 cyl, 1.5 L, Turbo</text><value>40269</value></menuItem>
function parseXmlMenuItems(xml: string): Array<{ text: string; value: string }> {
  const out: Array<{ text: string; value: string }> = [];
  const re = /<menuItem><text>([^<]*)<\/text><value>(\d+)<\/value><\/menuItem>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push({ text: m[1], value: m[2] });
  }
  return out;
}

// Derive a clean transmission string from a Fuel Economy option text.
// "Auto (S6), 4 cyl, 2.4 L"     → "Automatic (S6)"
// "Auto 9-spd, 4 cyl, 1.5 L"   → "Automatic 9-speed"
// "Manual 6-spd, 4 cyl, 2.0 L" → "Manual 6-speed"
function extractTransFromOptionText(text: string): string {
  const part = text.split(",")[0].trim();
  return part
    .replace(/^auto\b\s*/i, "Automatic ")
    .replace(/^manual\b\s*/i, "Manual ")
    .replace(/-spd\b/gi, "-speed")
    .trim();
}

// "FWD/Front-Wheel Drive" → "FWD"
function driveAbbr(raw: string): string {
  return raw.split("/")[0].trim().toUpperCase();
}

async function fetchTransmissionFromFuelEcon(
  year: number,
  make: string,
  model: string,
  dispL: string,
  driveType: string,
): Promise<string> {
  const abbr = driveAbbr(driveType);
  // Fuel Economy model names often include the drive-type suffix: "Terrain FWD"
  const variants = abbr ? [`${model} ${abbr}`, model] : [model];

  for (const mv of variants) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      let optText = "";
      try {
        const res = await fetch(
          `${FUELECONOMY}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(mv)}`,
          { headers: { "User-Agent": "zivosmedia-vin-decode/1.0" }, signal: controller.signal },
        );
        if (res.ok) optText = await res.text();
      } finally {
        clearTimeout(timer);
      }

      if (!optText) continue;
      const items = parseXmlMenuItems(optText);
      if (items.length === 0) continue;

      // Find best match by engine displacement
      let best = items[0];
      if (dispL) {
        const dispNum = parseFloat(dispL);
        for (const item of items) {
          if (item.text.includes(`${dispNum} L`)) { best = item; break; }
        }
      }

      const trany = extractTransFromOptionText(best.text);
      if (trany) {
        console.log("vin-decode: FuelEcon transmission", { model: mv, option: best.text, trany });
        return trany;
      }
    } catch (e: any) {
      console.warn("vin-decode: FuelEcon variant failed", { mv, error: e?.message });
    }
  }
  return "";
}

Deno.serve(withSecurity("vin-decode", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let vin: string;
  try {
    const body = await req.json();
    vin = (body.vin ?? "").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (vin.length !== 17) {
    return new Response(JSON.stringify({ ok: false, error: "VIN must be exactly 17 characters" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let nhtsaData: any;
  try {
    const res = await fetch(`${NHTSA}/${vin}?format=json`, {
      headers: { "User-Agent": "zivosmedia-vin-decode/1.0" },
    });
    if (!res.ok) throw new Error(`NHTSA responded ${res.status}`);
    nhtsaData = await res.json();
  } catch (e: any) {
    console.error("vin-decode: NHTSA fetch failed", e?.message);
    return new Response(JSON.stringify({ ok: false, error: "VIN lookup service unavailable" }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ Variable: string; Value: string | null }> = nhtsaData?.Results ?? [];

  const make = pick(results, "Make");
  const model = pick(results, "Model");
  const yearStr = pick(results, "Model Year");
  const year = yearStr ? parseInt(yearStr, 10) : null;
  const engineL = pick(results, "Displacement (L)");
  const engineConfig = pick(results, "Engine Configuration");
  const engineCyl = pick(results, "Engine Number of Cylinders");
  const engine = [engineL ? `${engineL}L` : "", engineConfig, engineCyl ? `${engineCyl}-cyl` : ""]
    .filter(Boolean).join(" ").trim();

  const transSpeeds = pick(results, "Transmission Speeds");
  const transStyle = pick(results, "Transmission Style");
  let transmission = [transSpeeds ? `${transSpeeds}-speed` : "", transStyle]
    .filter(Boolean).join(" ").trim();

  // NHTSA often lacks transmission data — fall back to DOE Fuel Economy API
  if (!transmission && year && make && model) {
    const driveType = pick(results, "Drive Type");
    try {
      transmission = await fetchTransmissionFromFuelEcon(year, make, model, engineL, driveType);
    } catch (e: any) {
      console.warn("vin-decode: FuelEcon fallback threw", e?.message);
    }
  }

  if (!make && !model) {
    return new Response(JSON.stringify({ ok: false, error: "VIN not found in NHTSA database" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("vin-decode: result", { vin, make, model, year, engine, transmission });

  return new Response(JSON.stringify({ ok: true, make, model, year, engine, transmission }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}, { rateLimit: "api_general", allowedMethods: ["POST"] }));
