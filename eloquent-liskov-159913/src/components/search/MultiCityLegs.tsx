/**
 * Multi-City Flight Search Legs Component
 * Renders dynamic origin→destination+date rows for multi-city searches
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Search, AlertCircle, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import LocationAutocomplete, { type LocationOption } from "./LocationAutocomplete";
import { useAirportSearch } from "./hooks/useLocationSearch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { MobileDatePickerSheet } from "@/components/mobile";

export interface FlightLeg {
  fromOption: LocationOption | null;
  fromDisplay: string;
  toOption: LocationOption | null;
  toDisplay: string;
  departDate: Date | undefined;
}

const createEmptyLeg = (prevLeg?: FlightLeg): FlightLeg => ({
  fromOption: prevLeg?.toOption || null,
  fromDisplay: prevLeg?.toDisplay || "",
  toOption: null,
  toDisplay: "",
  departDate: prevLeg?.departDate ? addDays(prevLeg.departDate, 3) : addDays(new Date(), 7),
});

interface MultiCityLegsProps {
  className?: string;
  passengers?: number;
  cabin?: string;
}

export default function MultiCityLegs({ className, passengers = 1, cabin = "economy" }: MultiCityLegsProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { search: searchAirports, getPopular, allOptions } = useAirportSearch();

  const [legs, setLegs] = useState<FlightLeg[]>([
    createEmptyLeg(),
    createEmptyLeg(),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mobileSheetLeg, setMobileSheetLeg] = useState<number | null>(null);

  const updateLeg = useCallback((index: number, updates: Partial<FlightLeg>) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      // Auto-chain: if updating destination, set next leg's origin
      if (updates.toOption && index < next.length - 1 && !next[index + 1].fromOption) {
        next[index + 1] = {
          ...next[index + 1],
          fromOption: updates.toOption,
          fromDisplay: updates.toDisplay || next[index + 1].fromDisplay,
        };
      }
      return next;
    });
  }, []);

  const addLeg = () => {
    if (legs.length >= 6) return;
    setLegs((prev) => [...prev, createEmptyLeg(prev[prev.length - 1])]);
  };

  const removeLeg = (index: number) => {
    if (legs.length <= 2) return;
    setLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    legs.forEach((leg, i) => {
      if (!leg.fromOption) newErrors[`${i}-from`] = "Select airport";
      if (!leg.toOption) newErrors[`${i}-to`] = "Select airport";
      if (!leg.departDate) newErrors[`${i}-date`] = "Select date";
      if (leg.fromOption && leg.toOption && leg.fromOption.value === leg.toOption.value) {
        newErrors[`${i}-to`] = "Must differ from origin";
      }
      if (i > 0 && leg.departDate && legs[i - 1].departDate && isBefore(leg.departDate, legs[i - 1].departDate!)) {
        newErrors[`${i}-date`] = "Must be after previous leg";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;

    // Encode multi-city legs into URL params
    const params = new URLSearchParams({
      type: "multi",
      legs: String(legs.length),
      passengers: String(passengers),
      cabin,
    });

    legs.forEach((leg, i) => {
      params.set(`origin${i}`, leg.fromOption!.value);
      params.set(`dest${i}`, leg.toOption!.value);
      params.set(`depart${i}`, format(leg.departDate!, "yyyy-MM-dd"));
    });

    navigate(`/flights/results?${params.toString()}`);
  };

  const isValid = legs.every((l) => l.fromOption && l.toOption && l.departDate);

  return (
    <div className={cn("space-y-3", className)}>
      {legs.map((leg, i) => (
        <div
          key={i}
          className="relative p-3 sm:p-4 rounded-xl border border-border/50 bg-muted/20"
        >
          {/* Leg label */}
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-[10px] font-semibold">
              <Plane className="w-3 h-3 mr-1" />
              Flight {i + 1}
            </Badge>
            {legs.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive/60 hover:text-destructive"
                onClick={() => removeLeg(i)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-3 items-end">
            {/* From */}
            <LocationAutocomplete
              value={leg.fromOption?.value || ""}
              displayValue={leg.fromDisplay}
              onChange={(opt) => updateLeg(i, { fromOption: opt, fromDisplay: opt?.label || "" })}
              onDisplayChange={(d) => updateLeg(i, { fromDisplay: d })}
              options={allOptions}
              searchFn={searchAirports}
              popularFn={getPopular}
              placeholder="From"
              label="From"
              icon="plane"
              accentColor="sky"
              error={errors[`${i}-from`]}
              required
            />

            {/* To */}
            <LocationAutocomplete
              value={leg.toOption?.value || ""}
              displayValue={leg.toDisplay}
              onChange={(opt) => updateLeg(i, { toOption: opt, toDisplay: opt?.label || "" })}
              onDisplayChange={(d) => updateLeg(i, { toDisplay: d })}
              options={allOptions.filter((o) => o.value !== leg.fromOption?.value)}
              searchFn={(q, l) => searchAirports(q, l).filter((o) => o.value !== leg.fromOption?.value)}
              popularFn={(l) => getPopular(l).filter((o) => o.value !== leg.fromOption?.value)}
              placeholder="To"
              label="To"
              icon="plane"
              accentColor="sky"
              error={errors[`${i}-to`]}
              required
            />

            {/* Date */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Date <span className="text-destructive">*</span>
              </Label>
              {isMobile ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setMobileSheetLeg(i)}
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal rounded-xl touch-manipulation",
                      !leg.departDate && "text-muted-foreground",
                      errors[`${i}-date`] && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 text-foreground" />
                    {leg.departDate ? format(leg.departDate, "MMM d") : "Date"}
                  </Button>
                  <MobileDatePickerSheet
                    open={mobileSheetLeg === i}
                    onOpenChange={(open) => !open && setMobileSheetLeg(null)}
                    selectedDate={leg.departDate}
                    onDateSelect={(date) => updateLeg(i, { departDate: date })}
                    label={`Flight ${i + 1} Date`}
                    minDate={i > 0 ? legs[i - 1].departDate : undefined}
                    accentColor="sky"
                  />
                </>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl min-w-[140px]",
                        !leg.departDate && "text-muted-foreground",
                        errors[`${i}-date`] && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2 text-foreground" />
                      {leg.departDate ? format(leg.departDate, "EEE, MMM d") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={leg.departDate}
                      onSelect={(date) => updateLeg(i, { departDate: date })}
                      disabled={(date) => {
                        const minDate = i > 0 && legs[i - 1].departDate ? legs[i - 1].departDate! : startOfToday();
                        return isBefore(date, minDate);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
              {errors[`${i}-date`] && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors[`${i}-date`]}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add leg button */}
      {legs.length < 6 && (
        <Button
          variant="outline"
          className="w-full h-10 rounded-xl border-dashed gap-2 text-sm"
          onClick={addLeg}
        >
          <Plus className="w-4 h-4" />
          Add Another Flight (up to 6)
        </Button>
      )}

      {/* Search button */}
      <Button
        onClick={handleSearch}
        disabled={!isValid}
        size="lg"
        className={cn(
          "w-full h-12 sm:h-14 font-bold text-base sm:text-lg rounded-xl",
          "bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 hover:from-sky-600 hover:via-blue-700 hover:to-sky-600",
          "text-primary-foreground shadow-xl shadow-sky-500/30 hover:shadow-sky-500/40",
          "transition-all duration-200 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Search className="w-5 h-5 mr-2" />
        Search {legs.length} Flights
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Payment completed securely on ZIVO. Tickets issued by licensed partners.
      </p>
    </div>
  );
}
