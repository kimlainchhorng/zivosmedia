/**
 * Smart Flight Empty State
 * Shows helpful suggestions when no flights found:
 * - Nearby airports
 * - Flexible dates
 * - One-way suggestion
 */

import { Plane, MapPin, Calendar, ArrowRight, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { getAirportByCode } from "@/data/airports";
import { cn } from "@/lib/utils";

// Major hub alternatives for common airports
const NEARBY_AIRPORTS: Record<string, string[]> = {
  // US airports
  MSY: ["IAH", "DFW", "ATL"],
  IAH: ["DFW", "MSY", "ATL"],
  DFW: ["IAH", "ATL", "ORD"],
  ATL: ["CLT", "MCO", "DFW"],
  ORD: ["DTW", "MSP", "ATL"],
  LAX: ["SFO", "SAN", "LAS"],
  SFO: ["LAX", "SJC", "OAK"],
  JFK: ["EWR", "LGA", "BOS"],
  EWR: ["JFK", "LGA", "PHL"],
  LGA: ["JFK", "EWR", "BDL"],
  MIA: ["FLL", "PBI", "TPA"],
  FLL: ["MIA", "PBI", "TPA"],
  SEA: ["PDX", "SFO", "YVR"],
  BOS: ["JFK", "PVD", "BDL"],
  DEN: ["SLC", "PHX", "ORD"],
  PHX: ["LAS", "LAX", "DEN"],
  LAS: ["LAX", "PHX", "SFO"],
  MCO: ["TPA", "MIA", "ATL"],
  CLT: ["ATL", "RDU", "DCA"],
  DTW: ["ORD", "CLE", "MSP"],
  MSP: ["ORD", "DTW", "DEN"],
  SLC: ["DEN", "LAS", "SEA"],
  PHL: ["EWR", "JFK", "BWI"],
  DCA: ["IAD", "BWI", "PHL"],
  IAD: ["DCA", "BWI", "JFK"],
  // Asia
  KTI: ["BKK", "SGN", "KUL", "REP"],
  REP: ["BKK", "SGN", "KTI", "KUL"],
  KOS: ["KTI", "BKK", "SGN", "REP"],
  BKK: ["SGN", "KUL", "SIN"],
  SGN: ["BKK", "KTI", "KUL"],
  HAN: ["BKK", "SGN", "HKG"],
  KUL: ["SIN", "BKK", "SGN"],
  SIN: ["KUL", "BKK", "HKG"],
  HKG: ["SIN", "BKK", "TPE"],
  NRT: ["HND", "ICN", "KIX"],
  HND: ["NRT", "ICN", "KIX"],
  ICN: ["NRT", "HND", "PVG"],
  PVG: ["PEK", "HKG", "ICN"],
  DEL: ["BOM", "BKK", "DXB"],
  BOM: ["DEL", "BLR", "DXB"],
  MNL: ["SGN", "BKK", "HKG"],
  // Europe
  LHR: ["LGW", "STN", "CDG"],
  CDG: ["LHR", "AMS", "FRA"],
  AMS: ["LHR", "CDG", "FRA"],
  FRA: ["MUC", "AMS", "CDG"],
  // Middle East
  DXB: ["DOH", "AUH", "BAH"],
  DOH: ["DXB", "AUH", "BAH"],
  // Australia
  SYD: ["MEL", "BNE", "SIN"],
  MEL: ["SYD", "BNE", "AKL"],
};

function getNearbyAirports(code: string): string[] {
  return NEARBY_AIRPORTS[code.toUpperCase()] || [];
}

function getFlexDates(dateStr: string, range: number = 3): string[] {
  const dates: string[] = [];
  const base = new Date(dateStr + "T00:00:00");
  for (let i = -range; i <= range; i++) {
    if (i === 0) continue;
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    if (d >= new Date()) {
      dates.push(d.toISOString().split("T")[0]);
    }
  }
  return dates;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

interface FlightEmptyStateProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
}

export default function FlightEmptyState({
  origin,
  destination,
  departureDate,
  returnDate,
  adults,
  children,
  infants,
  cabinClass,
}: FlightEmptyStateProps) {
  const navigate = useNavigate();

  const nearbyOrigins = getNearbyAirports(origin);
  const nearbyDests = getNearbyAirports(destination);
  const flexDates = getFlexDates(departureDate, 3);

  const buildSearchUrl = (params: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
  }) => {
    const p = new URLSearchParams({
      origin: params.origin || origin,
      destination: params.destination || destination,
      departureDate: params.departureDate || departureDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      cabinClass,
    });
    if (params.returnDate !== undefined) {
      if (params.returnDate) p.set("returnDate", params.returnDate);
    } else if (returnDate) {
      p.set("returnDate", returnDate);
    }
    return `/flights/results?${p.toString()}`;
  };

  const originAirport = getAirportByCode(origin);
  const destAirport = getAirportByCode(destination);

  // Airports with limited Duffel coverage
  const LIMITED_COVERAGE_AIRPORTS = ["KTI", "REP", "KOS"];
  const isLimitedCoverage = LIMITED_COVERAGE_AIRPORTS.includes(origin.toUpperCase()) || LIMITED_COVERAGE_AIRPORTS.includes(destination.toUpperCase());

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 sm:p-8 text-center bg-gradient-to-b from-muted/30 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center mx-auto mb-4">
            <Plane className="w-7 h-7 text-[hsl(var(--flights))]" />
          </div>
          <h2 className="text-lg font-bold mb-1.5">No Flights Found</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            We couldn't find flights from {originAirport?.city || origin} to {destAirport?.city || destination} on {formatShortDate(departureDate)}.
          </p>
          {isLimitedCoverage && (
            <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto bg-muted/40 rounded-lg px-3 py-2">
              Some local airlines may not be available through this booking source. Showing best available partner airlines.
            </p>
          )}
        </div>

        <div className="px-4 pb-5 sm:px-6 sm:pb-6 space-y-4">
          {/* Nearby Origin Airports */}
          {nearbyOrigins.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
                <p className="text-xs font-semibold">Try departing from a nearby airport</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nearbyOrigins.map(code => {
                  const ap = getAirportByCode(code);
                  return (
                    <Button
                      key={code}
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-medium gap-1.5 border-border/40 hover:border-[hsl(var(--flights))]/40 hover:bg-[hsl(var(--flights))]/5"
                      onClick={() => navigate(buildSearchUrl({ origin: code }))}
                    >
                      <span className="font-bold">{code}</span>
                      {ap && <span className="text-muted-foreground">{ap.city}</span>}
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-bold">{destination}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nearby Destination Airports */}
          {nearbyDests.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold">Try arriving at a nearby airport</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nearbyDests.map(code => {
                  const ap = getAirportByCode(code);
                  return (
                    <Button
                      key={code}
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] font-medium gap-1.5 border-border/40 hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => navigate(buildSearchUrl({ destination: code }))}
                    >
                      <span className="font-bold">{origin}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-bold">{code}</span>
                      {ap && <span className="text-muted-foreground">{ap.city}</span>}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flexible Dates */}
          {flexDates.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
                <p className="text-xs font-semibold">Try nearby dates</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {flexDates.slice(0, 6).map(date => (
                  <Button
                    key={date}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] font-medium border-border/40 hover:border-[hsl(var(--flights))]/40 hover:bg-[hsl(var(--flights))]/5"
                    onClick={() => navigate(buildSearchUrl({ departureDate: date }))}
                  >
                    {formatShortDate(date)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* One-way suggestion */}
          {returnDate && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold">Try one-way instead</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] font-medium border-border/40 hover:border-[hsl(var(--flights))]/40 hover:bg-[hsl(var(--flights))]/5"
                onClick={() => navigate(buildSearchUrl({ returnDate: "" }))}
              >
                One-way {origin} → {destination}
              </Button>
            </div>
          )}

          {/* Modify search CTA */}
          <div className="pt-2">
            <Button asChild className="w-full bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90">
              <Link to="/flights">Modify Search</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
