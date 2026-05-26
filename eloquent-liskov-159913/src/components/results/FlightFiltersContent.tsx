/**
 * Flight Filters Content
 * Comprehensive filter controls for flights - OTA style
 */

import { useState } from "react";
import { Plane, TrendingDown, Sunrise, Sun, Sunset, Moon, Clock, X, ChevronDown, ChevronUp, Armchair, Luggage } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FlightFilters } from "@/hooks/useResultsFilters";
import { getAirlineLogo } from "@/data/airlines";

interface FlightFiltersContentProps {
  filters: FlightFilters;
  onFilterChange: (filters: Partial<FlightFilters>) => void;
  availableAirlines?: { code: string; name: string; count: number }[];
  currency?: string;
}

const stopOptions = [
  { value: 0, label: "Nonstop" },
  { value: 1, label: "1 Stop" },
  { value: 2, label: "2+ Stops" },
];

const timeOptions = [
  { id: "morning", label: "Morning", icon: Sunrise, time: "5am-12pm" },
  { id: "afternoon", label: "Afternoon", icon: Sun, time: "12pm-5pm" },
  { id: "evening", label: "Evening", icon: Sunset, time: "5pm-9pm" },
  { id: "night", label: "Night", icon: Moon, time: "9pm-5am" },
];

const cabinOptions = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

export function FlightFiltersContent({
  filters,
  onFilterChange,
  availableAirlines = [],
  currency = "USD",
  onClearAll,
}: FlightFiltersContentProps & { onClearAll?: () => void }) {
  const [showAllAirlines, setShowAllAirlines] = useState(false);
  
  const formatPrice = (price: number) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
    return `${symbols[currency] || "$"}${price.toLocaleString()}`;
  };

  const toggleStop = (value: number) => {
    const newStops = filters.stops.includes(value)
      ? filters.stops.filter((s) => s !== value)
      : [...filters.stops, value];
    onFilterChange({ stops: newStops });
  };

  const toggleAirline = (code: string) => {
    const newAirlines = filters.airlines.includes(code)
      ? filters.airlines.filter((a) => a !== code)
      : [...filters.airlines, code];
    onFilterChange({ airlines: newAirlines });
  };

  const toggleDepartureTime = (id: string) => {
    const newTimes = filters.departureTime.includes(id)
      ? filters.departureTime.filter((t) => t !== id)
      : [...filters.departureTime, id];
    onFilterChange({ departureTime: newTimes });
  };

  const toggleArrivalTime = (id: string) => {
    const newTimes = filters.arrivalTime.includes(id)
      ? filters.arrivalTime.filter((t) => t !== id)
      : [...filters.arrivalTime, id];
    onFilterChange({ arrivalTime: newTimes });
  };

  const toggleCabin = (value: string) => {
    const newCabins = filters.cabinClass.includes(value)
      ? filters.cabinClass.filter((c) => c !== value)
      : [...filters.cabinClass, value];
    onFilterChange({ cabinClass: newCabins });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.stops.length > 0 || 
    filters.airlines.length > 0 || 
    filters.departureTime.length > 0 || 
    filters.arrivalTime.length > 0 ||
    filters.cabinClass.length > 0 ||
    filters.baggageIncluded ||
    filters.maxPrice < 5000 ||
    filters.maxDuration < 24;

  return (
    <div className="space-y-6">
      {/* Clear Filters Button */}
      {hasActiveFilters && onClearAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearAll}
          className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <X className="w-4 h-4" />
          Clear all filters
        </Button>
      )}

      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-500" />
          Max Price
        </Label>
        <div className="px-1">
          <div className="flex justify-center mb-2">
            <span className="text-2xl font-bold text-foreground">{formatPrice(filters.maxPrice)}</span>
          </div>
          <Slider
            value={[filters.maxPrice]}
            onValueChange={(v) => onFilterChange({ maxPrice: v[0] })}
            min={100}
            max={5000}
            step={50}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatPrice(100)}</span>
            <span>{formatPrice(5000)}</span>
          </div>
        </div>
      </div>

      {/* Stops */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Stops</Label>
        <div className="space-y-2">
          {stopOptions.map((stop) => (
            <label key={stop.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.stops.includes(stop.value)}
                onCheckedChange={() => toggleStop(stop.value)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {stop.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Airlines - Collapsible */}
      {availableAirlines.length > 0 && (
        <div>
          <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4 text-foreground" />
            Airlines
            {filters.airlines.length > 0 && (
              <span className="text-xs text-foreground font-normal">({filters.airlines.length} selected)</span>
            )}
          </Label>
          <div className="space-y-2">
            {(showAllAirlines ? availableAirlines : availableAirlines.slice(0, 6)).map((airline) => (
              <label key={airline.code} className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={filters.airlines.includes(airline.code)}
                  onCheckedChange={() => toggleAirline(airline.code)}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <img
                    src={getAirlineLogo(airline.code)}
	                    alt={airline.name}
	                    className="w-5 h-5 object-contain"
	                    loading="lazy"
	                    decoding="async"
	                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${airline.code}&background=0ea5e9&color=fff&size=24`;
                    }}
                  />
                  <span className="group-hover:text-foreground transition-colors truncate text-sm">
                    {airline.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">({airline.count})</span>
                </div>
              </label>
            ))}
          </div>
          
          {availableAirlines.length > 6 && (
            <button type="button"
              onClick={() => setShowAllAirlines(!showAllAirlines)}
              className="flex items-center gap-1 text-sm text-foreground hover:text-primary mt-2 font-medium transition-colors"
            >
              {showAllAirlines ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {availableAirlines.length - 6} more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Departure Time */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Departure Time</Label>
        <div className="grid grid-cols-2 gap-2">
          {timeOptions.map((time) => (
            <button type="button"
              key={time.id}
              onClick={() => toggleDepartureTime(time.id)}
              className={cn(
                "p-3 rounded-xl border text-center transition-all",
                filters.departureTime.includes(time.id)
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-500"
                  : "bg-muted/50 border-border hover:border-sky-500/30"
              )}
            >
              <time.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">{time.label}</p>
              <p className="text-[10px] text-muted-foreground">{time.time}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Arrival Time */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Arrival Time</Label>
        <div className="grid grid-cols-2 gap-2">
          {timeOptions.map((time) => (
            <button type="button"
              key={time.id}
              onClick={() => toggleArrivalTime(time.id)}
              className={cn(
                "p-3 rounded-xl border text-center transition-all",
                filters.arrivalTime.includes(time.id)
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500"
                  : "bg-muted/50 border-border hover:border-emerald-500/30"
              )}
            >
              <time.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">{time.label}</p>
              <p className="text-[10px] text-muted-foreground">{time.time}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Max Duration: {filters.maxDuration}h
        </Label>
        <div className="px-1">
          <Slider
            value={[filters.maxDuration]}
            onValueChange={(v) => onFilterChange({ maxDuration: v[0] })}
            min={2}
            max={24}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>2h</span>
            <span>24h</span>
          </div>
        </div>
      </div>

      {/* Cabin Class */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Armchair className="w-4 h-4 text-amber-500" />
          Cabin Class
        </Label>
        <div className="space-y-2">
          {cabinOptions.map((cabin) => (
            <label key={cabin.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.cabinClass.includes(cabin.value)}
                onCheckedChange={() => toggleCabin(cabin.value)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {cabin.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Baggage Included Toggle */}
      <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <Luggage className="w-4 h-4 text-foreground" />
          <Label className="text-sm font-medium cursor-pointer">Checked bag included</Label>
        </div>
        <Switch
          checked={filters.baggageIncluded}
          onCheckedChange={(checked) => onFilterChange({ baggageIncluded: checked })}
        />
      </div>

      {/* Filter Note */}
      <p className="text-[10px] text-muted-foreground italic mt-4 px-1">
        Filters adjust partner-provided results only.
      </p>
    </div>
  );
}
