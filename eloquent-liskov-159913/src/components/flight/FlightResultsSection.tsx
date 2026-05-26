import { useState, useMemo } from "react";
import { getAllInPrice } from "@/utils/flightPricing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Zap,
  TrendingDown,
  Clock,
  Plane,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import CrossSellSection from "./CrossSellSection";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import type { GeneratedFlight } from "@/data/flightGenerator";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface FlightResultsSectionProps {
  searchResults: GeneratedFlight[];
  fromCity: string;
  toCity: string;
  fromCode: string;
  toCode: string;
  departDate?: Date;
  passengers: string;
  cabinClass: string;
  setCabinClass: (cabin: string) => void;
  onSelectFlight: (flight: GeneratedFlight) => void;
  selectedFlight: GeneratedFlight | null;
}

export default function FlightResultsSection({
  searchResults,
  fromCity,
  toCity,
  fromCode,
  toCode,
  departDate,
  passengers,
  cabinClass,
  setCabinClass,
  onSelectFlight,
  selectedFlight,
}: FlightResultsSectionProps) {
  const [sortBy, setSortBy] = useState<"price" | "duration" | "departure" | "rating">("price");

  const stats = useMemo(() => {
    const prices = searchResults.map(f => f.price);
    const durations = searchResults.map(f => {
      const match = f.duration.match(/(\d+)h/);
      return match ? parseInt(match[1]) : 0;
    });
    return {
      lowestPrice: Math.round(getAllInPrice(Math.min(...prices))),
      fastestDuration: Math.min(...durations),
      directFlights: searchResults.filter(f => f.stops === 0).length,
      realPrices: searchResults.filter(f => f.isRealPrice).length,
    };
  }, [searchResults]);

  const sortedResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      switch (sortBy) {
        case "price": return a.price - b.price;
        case "duration":
          const dA = parseInt(a.duration.match(/(\d+)h/)?.[1] || "0");
          const dB = parseInt(b.duration.match(/(\d+)h/)?.[1] || "0");
          return dA - dB;
        case "departure": return a.departure.time.localeCompare(b.departure.time);
        case "rating": return (b.onTimePerformance || 0) - (a.onTimePerformance || 0);
        default: return 0;
      }
    });
  }, [searchResults, sortBy]);

  return (
    <section className="py-4 sm:py-8">
      <div className="container mx-auto px-3 sm:px-4">
        {/* MoR Disclosure */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Book directly with ZIVO:</span>{" "}
              <span className="hidden sm:inline">Secure checkout, instant e-ticket, and full booking support — all handled by ZIVO. </span>
              No hidden fees. No redirects.{" "}
              <Link to="/partner-disclosure" className="text-emerald-500 hover:underline">Learn more</Link>
            </p>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-foreground">{searchResults.length}</span> flights found
              {stats.realPrices > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px] sm:text-xs">
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  {stats.realPrices} Live
                </Badge>
              )}
            </h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
              {fromCity.split(" (")[0]} → {toCity.split(" (")[0]} •{" "}
              {departDate ? format(departDate, "MMM d") : "Select date"} • {passengers} pax
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[130px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm">
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Lowest Price</SelectItem>
                <SelectItem value="duration">Shortest</SelectItem>
                <SelectItem value="departure">Departure</SelectItem>
                <SelectItem value="rating">Best Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: "Lowest", value: `$${stats.lowestPrice}`, color: "emerald", icon: TrendingDown },
            { label: "Fastest", value: `${stats.fastestDuration}h`, color: "sky", icon: Clock },
            { label: "Direct", value: `${stats.directFlights}`, color: "purple", icon: Plane },
            { label: "Verified", value: `${stats.realPrices}`, color: "amber", icon: CheckCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label} className={`bg-gradient-to-r from-${color}-500/10 to-${color}-500/5 border-${color}-500/20`}>
              <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-${color}-500/20 flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-500`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
                  <p className={`text-base sm:text-xl font-bold text-${color}-500`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Flight Results */}
        <div className="space-y-4">
          {sortedResults.map((flight, index) => (
            <div
              key={flight.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-200"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                  selectedFlight?.id === flight.id && "ring-2 ring-sky-500"
                )}
                onClick={() => onSelectFlight(flight)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <AirlineLogo
                        iataCode={flight.airlineCode}
                        airlineName={flight.airline}
                        size={48}
                        className="shrink-0 border border-border/30 bg-card/70"
                      />
                      <div>
                        <p className="font-semibold text-sm sm:text-base">{flight.airline}</p>
                        <p className="text-xs text-muted-foreground">{flight.flightNumber} • {flight.aircraft || "Boeing 737"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 text-center">
                      <div>
                        <p className="font-bold text-lg">{flight.departure.time}</p>
                        <p className="text-xs text-muted-foreground">{flight.departure.code}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xs text-muted-foreground">{flight.duration}</p>
                        <div className="w-16 sm:w-24 h-px bg-border relative">
                          <Plane className="w-3 h-3 text-foreground absolute -top-1.5 right-0" />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{flight.arrival.time}</p>
                        <p className="text-xs text-muted-foreground">{flight.arrival.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">${flight.price}</p>
                      <p className="text-[10px] text-muted-foreground">per person</p>
                      {flight.isRealPrice && (
                        <Badge className="mt-1 bg-emerald-500/20 text-emerald-500 text-[10px]">
                          <Zap className="w-2.5 h-2.5 mr-0.5" /> Live Price
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Cross-Sell */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <CrossSellSection
            destination={toCity.split(" (")[0]}
            origin={fromCity.split(" (")[0]}
            checkIn={departDate ? departDate.toISOString().split('T')[0] : undefined}
          />
        </div>
      </div>
    </section>
  );
}