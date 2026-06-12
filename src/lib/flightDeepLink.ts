import { AIRPORT_ALIASES, getAirportByCode, searchAirports } from "@/data/airports";

export type FlightDeepLinkCabin = "economy" | "premium" | "business" | "first";
export type FlightDeepLinkTripType = "roundtrip" | "oneway" | "multicity";

export type FlightDeepLinkInitial = {
  initialFrom: string;
  initialTo: string;
  initialDepartDate?: Date;
  initialReturnDate?: Date;
  initialPassengers?: number;
  initialCabin: FlightDeepLinkCabin;
  initialTripType: FlightDeepLinkTripType;
};

const PRESERVED_RESULT_PARAMS = [
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "creator",
  "subid",
];

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeAirportCode(code: string) {
  const upper = code.trim().toUpperCase();
  return AIRPORT_ALIASES[upper] || upper;
}

function normalizeAirportCodeCandidate(code: string) {
  const normalized = normalizeAirportCode(code);
  return getAirportByCode(normalized) ? normalized : "";
}

function cleanAirportSeedText(value: string) {
  return value
    .replace(/[-_(),]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textTokens(value: string) {
  return value
    .split(/[\s,()/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function resolveAirportSeed(raw?: string | null) {
  const value = safeDecode(raw || "").trim();
  if (!value) return "";

  const directCode = normalizeAirportCodeCandidate(value);
  if (directCode) return directCode;

  const bracketCode = value.match(/\(([A-Z]{3})\)/i)?.[1];
  if (bracketCode) {
    const normalized = normalizeAirportCodeCandidate(bracketCode);
    if (normalized) return normalized;
  }

  const rawTokens = textTokens(value);
  const lastToken = rawTokens[rawTokens.length - 1] || "";
  const lastTokenCode = /^[A-Za-z]{3}$/.test(lastToken) ? normalizeAirportCodeCandidate(lastToken) : "";
  if (lastTokenCode) return lastTokenCode;

  const cleanValue = cleanAirportSeedText(value);

  const upper = cleanValue.toUpperCase();
  const cleanCode = normalizeAirportCodeCandidate(upper);
  if (cleanCode) return cleanCode;

  const match = searchAirports(cleanValue)[0];
  return match ? normalizeAirportCodeCandidate(match.code) || match.code : "";
}

function hasExplicitAirportCode(raw?: string | null) {
  const value = safeDecode(raw || "").trim();
  if (!value) return false;
  if (normalizeAirportCodeCandidate(value)) return true;

  const bracketCode = value.match(/\(([A-Z]{3})\)/i)?.[1];
  if (bracketCode && normalizeAirportCodeCandidate(bracketCode)) return true;

  const rawTokens = textTokens(value);
  const lastToken = rawTokens[rawTokens.length - 1] || "";
  return /^[A-Za-z]{3}$/.test(lastToken) && Boolean(normalizeAirportCodeCandidate(lastToken));
}

function isUnambiguousAirportText(raw?: string | null) {
  const cleanValue = cleanAirportSeedText(safeDecode(raw || ""));
  if (!cleanValue) return false;

  const lower = cleanValue.toLowerCase();
  const exactMatches = searchAirports(cleanValue).filter((airport) => {
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    const fullCity = `${airport.city}, ${airport.country}`.toLowerCase();
    return city === lower || name === lower || fullCity === lower;
  });

  return exactMatches.length === 1;
}

export function isAirportSeedSafeForAutoRun(raw?: string | null) {
  return hasExplicitAirportCode(raw) || isUnambiguousAirportText(raw);
}

export function parseFlightDeepLinkDate(raw?: string | null) {
  const value = (raw || "").trim();
  if (!value) return undefined;
  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || value;
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatFlightDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTravelers(params: URLSearchParams) {
  const raw = params.get("travelers") || params.get("passengers") || params.get("adults") || "";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 9) : undefined;
}

function normalizeCabin(raw?: string | null): FlightDeepLinkCabin {
  const value = (raw || "").trim().toLowerCase().replace(/-/g, "_");
  if (value === "premium" || value === "premium_economy" || value === "premiumeconomy") return "premium";
  if (value === "business") return "business";
  if (value === "first") return "first";
  return "economy";
}

function normalizeTripType(raw?: string | null): FlightDeepLinkTripType | undefined {
  const value = (raw || "").trim().toLowerCase().replace(/[-_\s]+/g, "");
  if (value === "one" || value === "oneway") return "oneway";
  if (value === "multi" || value === "multicity") return "multicity";
  if (value === "round" || value === "roundtrip" || value === "return") return "roundtrip";
  return undefined;
}

export function parseFlightDeepLinkInitial(
  params: URLSearchParams,
  fromCity?: string,
  toCity?: string,
): FlightDeepLinkInitial {
  const fromRaw = fromCity || params.get("from") || params.get("origin");
  const toRaw = toCity || params.get("to") || params.get("destination") || params.get("dest");
  const initialDepartDate = parseFlightDeepLinkDate(
    params.get("start") || params.get("depart") || params.get("departureDate") || params.get("date"),
  );
  const initialReturnDate = parseFlightDeepLinkDate(params.get("end") || params.get("return") || params.get("returnDate"));

  return {
    initialFrom: resolveAirportSeed(fromRaw),
    initialTo: resolveAirportSeed(toRaw),
    initialDepartDate,
    initialReturnDate,
    initialPassengers: parseTravelers(params),
    initialCabin: normalizeCabin(params.get("cabinClass") || params.get("cabin")),
    initialTripType: normalizeTripType(params.get("tripType") || params.get("type")) ||
      (initialDepartDate && !initialReturnDate ? "oneway" : "roundtrip"),
  };
}

export function shouldSkipFlightDeepLinkAutoRun(params: URLSearchParams) {
  const value = (params.get("autoRun") || params.get("autorun") || params.get("auto") || "").trim().toLowerCase();
  const manual = (params.get("manual") || "").trim().toLowerCase();
  return (
    value === "0" ||
    value === "false" ||
    value === "manual" ||
    manual === "1" ||
    manual === "true" ||
    manual === "yes"
  );
}

export function buildFlightResultsSearch(
  initial: FlightDeepLinkInitial,
  sourceParams: URLSearchParams,
) {
  if (shouldSkipFlightDeepLinkAutoRun(sourceParams)) return null;
  if (!initial.initialDepartDate) return null;

  const origin = getAirportByCode(initial.initialFrom)?.code;
  const destination = getAirportByCode(initial.initialTo)?.code;
  if (!origin || !destination || origin === destination) return null;

  const originRaw = sourceParams.get("from") || sourceParams.get("origin");
  const destinationRaw = sourceParams.get("to") || sourceParams.get("destination") || sourceParams.get("dest");
  if (!isAirportSeedSafeForAutoRun(originRaw) || !isAirportSeedSafeForAutoRun(destinationRaw)) return null;

  const departureDate = formatFlightDateParam(initial.initialDepartDate);
  const returnDate = initial.initialReturnDate ? formatFlightDateParam(initial.initialReturnDate) : "";
  const search = new URLSearchParams({
    origin,
    dest: destination,
    depart: departureDate,
    passengers: String(initial.initialPassengers || 1),
    cabin: initial.initialCabin,
    tripType: initial.initialTripType,
  });

  if (returnDate && returnDate > departureDate) {
    search.set("return", returnDate);
  }

  for (const key of PRESERVED_RESULT_PARAMS) {
    const value = sourceParams.get(key);
    if (value) search.set(key, value);
  }

  return search;
}
