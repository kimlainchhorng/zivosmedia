/**
 * Professional Flight Search Form
 * 
 * Features:
 * - Structured airport autocomplete (stores IATA codes)
 * - Smart date validation (return >= depart)
 * - Passenger/cabin controls
 * - Clean URL submission (codes only)
 * - Mobile-first responsive design
 * - Full-screen mobile date picker
 * - Bottom-sheet passenger selector
 * - Multi-city search support
 */

import { useState, useEffect, useMemo } from "react";
import tabFlightsBg from "@/assets/tab-flights-bg.jpg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plane, 
  Search, 
  ArrowLeftRight, 
  RefreshCw, 
  MapPin, 
  Users,
  Crown,
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronDown,
  Minus,
  ExternalLink,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import LocationAutocomplete, { type LocationOption } from "./LocationAutocomplete";
import { useAirportSearch } from "./hooks/useLocationSearch";
import MultiCityLegs from "./MultiCityLegs";
import { MobileDatePickerSheet, MobileDateRangePickerSheet, MobilePassengerCabinSheet } from "@/components/mobile";
import { useFlightFunnel } from "@/hooks/useFlightFunnel";
import { useTranslation } from "@/hooks/useI18n";
import { recordSearchAttempt } from "@/lib/recordSearchAttempt";

type TripType = "roundtrip" | "oneway" | "multicity";
type CabinClass = "economy" | "premium" | "business" | "first";

interface FlightSearchFormProProps {
  initialFrom?: string;
  initialTo?: string;
  initialDepartDate?: Date;
  initialReturnDate?: Date;
  initialPassengers?: number;
  initialCabin?: CabinClass;
  initialTripType?: TripType;
  onSearch?: (params: URLSearchParams) => void;
  navigateOnSearch?: boolean;
  className?: string;
}

export default function FlightSearchFormPro({
  initialFrom = "",
  initialTo = "",
  initialDepartDate,
  initialReturnDate,
  initialPassengers = 1,
  initialCabin = "economy",
  initialTripType = "roundtrip",
  onSearch,
  navigateOnSearch = true,
  className,
}: FlightSearchFormProProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { search: searchAirports, getPopular, getByCode, allOptions } = useAirportSearch();
  const { trackSearchStarted } = useFlightFunnel();
  const { t } = useTranslation("flights");

  // Trip type
  const [tripType, setTripType] = useState<TripType>(initialTripType);

  // Location state
  const [fromOption, setFromOption] = useState<LocationOption | null>(null);
  const [fromDisplay, setFromDisplay] = useState("");
  const [toOption, setToOption] = useState<LocationOption | null>(null);
  const [toDisplay, setToDisplay] = useState("");

  // Date state
  const [departDate, setDepartDate] = useState<Date | undefined>(
    initialDepartDate
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    initialReturnDate
  );

  // Passengers & cabin
  const [passengers, setPassengers] = useState(initialPassengers);
  const [cabin, setCabin] = useState<CabinClass>(initialCabin);
  const [isPassengerOpen, setIsPassengerOpen] = useState(false);
  
  // Mobile sheet states
  const [departSheetOpen, setDepartSheetOpen] = useState(false);
  const [returnSheetOpen, setReturnSheetOpen] = useState(false);
  const [passengerSheetOpen, setPassengerSheetOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize from props
  useEffect(() => {
    if (initialFrom) {
      const option = getByCode(initialFrom);
      if (option) {
        setFromOption(option);
        setFromDisplay(option.label);
      } else {
        setFromDisplay(initialFrom);
      }
    }
    if (initialTo) {
      const option = getByCode(initialTo);
      if (option) {
        setToOption(option);
        setToDisplay(option.label);
      } else {
        setToDisplay(initialTo);
      }
    }
  }, [initialFrom, initialTo, getByCode]);

  // Swap cities
  const handleSwap = () => {
    const tempOption = fromOption;
    const tempDisplay = fromDisplay;
    setFromOption(toOption);
    setFromDisplay(toDisplay);
    setToOption(tempOption);
    setToDisplay(tempDisplay);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fromOption) newErrors.from = "Please choose an airport from the list.";
    if (!toOption) newErrors.to = "Please choose an airport from the list.";
    if (fromOption && toOption && fromOption.value === toOption.value) {
      newErrors.to = "Destination must differ from origin";
    }
    if (!departDate) newErrors.depart = "Select departure date";
    if (tripType === "roundtrip" && !returnDate) newErrors.return = "Select return date";
    if (tripType === "roundtrip" && departDate && returnDate && isBefore(returnDate, departDate)) {
      newErrors.return = "Return must be after departure";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle search
  const handleSearch = () => {
    if (!validate()) return;
    const fromCode = (fromOption?.value || fromDisplay.match(/\(([A-Z]{3})\)/)?.[1] || "").toUpperCase();
    const toCode = (toOption?.value || toDisplay.match(/\(([A-Z]{3})\)/)?.[1] || "").toUpperCase();
    const departDateStr = departDate ? format(departDate, "yyyy-MM-dd") : "";
    const returnDateStr = tripType === "roundtrip" && returnDate ? format(returnDate, "yyyy-MM-dd") : undefined;

    trackSearchStarted({
      origin: fromCode,
      destination: toCode,
      departureDate: departDateStr,
      returnDate: returnDateStr,
      passengers,
      cabinClass: cabin,
    });

    const resultsParams = new URLSearchParams({
      origin: fromCode,
      dest: toCode,
      depart: departDateStr,
      passengers: String(passengers),
      cabin: cabin,
    });
    if (returnDateStr) resultsParams.set("return", returnDateStr);
    navigate(`/flights/results?${resultsParams.toString()}`);
    if (onSearch) onSearch(resultsParams);

    // Telemetry: record this flight search for re-engagement / price alerts.
    void recordSearchAttempt("flight", {
      origin: fromCode,
      destination: toCode,
      departureDate: departDateStr,
      returnDate: returnDateStr ?? null,
      passengers,
      cabinClass: cabin,
      tripType,
    });
  };

  const isFormValid = useMemo(() => {
    const hasFrom = !!fromOption;
    const hasTo = !!toOption;
    const hasDepart = !!departDate;
    const hasReturn = tripType === "oneway" || tripType === "multicity" || !!returnDate;
    return hasFrom && hasTo && hasDepart && hasReturn;
  }, [fromOption, toOption, departDate, returnDate, tripType]);

  const cabinOptions: { value: CabinClass; label: string }[] = [
    { value: "economy", label: "Economy" },
    { value: "premium", label: "Premium Economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First Class" },
  ];

  return (
    <div className={cn(
      "relative bg-card/80 backdrop-blur-2xl border border-border/20 rounded-3xl p-5 sm:p-7 overflow-hidden",
      "shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.12),0_2px_12px_-4px_hsl(var(--primary)/0.08)]",
      "before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-b before:from-white/[0.06] before:to-transparent before:pointer-events-none",
      className
    )} style={{ transformStyle: "preserve-3d" }}>
      {/* Background image */}
      <img
        src={tabFlightsBg}
	        alt=""
	        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
	        loading="lazy"
	        decoding="async"
	        style={{ opacity: 0.3 }}
	      />
      <span className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, hsl(var(--card) / 0.55) 0%, hsl(var(--card) / 0.7) 50%, hsl(var(--card) / 0.6) 100%)" }} />

      {/* Accent bar with 3D lift */}
      <div
        className="relative h-1.5 -mx-5 sm:-mx-7 -mt-5 sm:-mt-7 rounded-t-3xl mb-5 sm:mb-6 shadow-[0_2px_12px_hsl(var(--primary)/0.3)] bg-secondary"
        style={{ transform: "translateZ(4px)" }}
      />

      {/* Trip Type Toggle */}
      <div className="relative flex gap-2 mb-5 flex-wrap" style={{ transform: "translateZ(8px)" }}>
        {[
          { id: "roundtrip" as TripType, label: t("flights.roundtrip"), icon: RefreshCw },
          { id: "oneway" as TripType, label: t("flights.oneway"), icon: Plane },
          { id: "multicity" as TripType, label: "Multi-City", icon: MapPin },
        ].map((type) => (
          <button type="button"
            key={type.id}
            onClick={() => setTripType(type.id)}
            className={cn(
              "relative min-h-[44px] px-3.5 sm:px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-hidden touch-manipulation",
              tripType === type.id
                ? "text-primary-foreground shadow-[0_4px_16px_hsl(var(--primary)/0.35),inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.96]"
                : "bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:shadow-md active:scale-[0.97] border border-border/30"
            )}
            style={tripType === type.id ? { transform: "translateZ(6px)" } : {}}
          >
            {tripType === type.id && (
              <>
	                <img src={tabFlightsBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ opacity: 0.5 }} />
                <span className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(var(--flights) / 0.7), hsl(var(--flights) / 0.5))" }} />
              </>
            )}
            <type.icon className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="relative z-10">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Multi-City Mode */}
      {tripType === "multicity" ? (
        <MultiCityLegs passengers={passengers} cabin={cabin} />
      ) : (
        <>
          {/* Search Fields Grid */}
          <div className="relative space-y-4">
            {/* Row 1: From / Swap / To */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-end">
              <LocationAutocomplete
                value={fromOption?.value || ""}
                displayValue={fromDisplay}
                onChange={setFromOption}
                onDisplayChange={setFromDisplay}
                options={allOptions}
                searchFn={searchAirports}
                popularFn={getPopular}
                placeholder="From where?"
                label={t("flights.from")}
                icon="plane"
                accentColor="sky"
                error={errors.from}
                required
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="h-11 sm:h-12 w-11 sm:w-12 rounded-full border-dashed hover:border-border hover:bg-secondary shrink-0 transition-all hover:rotate-180 duration-500 hidden md:flex shadow-md hover:shadow-lg active:scale-[0.95] active:shadow-sm"
                aria-label="Swap cities"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </Button>

              <LocationAutocomplete
                value={toOption?.value || ""}
                displayValue={toDisplay}
                onChange={setToOption}
                onDisplayChange={setToDisplay}
                options={allOptions.filter(o => o.value !== fromOption?.value)}
                searchFn={(q, l) => searchAirports(q, l).filter(o => o.value !== fromOption?.value)}
                popularFn={(l) => getPopular(l).filter(o => o.value !== fromOption?.value)}
                placeholder="To where?"
                label={t("flights.to")}
                icon="plane"
                accentColor="sky"
                error={errors.to}
                required
              />
            </div>

            {/* Mobile swap button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSwap}
              className="w-full h-11 md:hidden rounded-xl border-dashed gap-2 shadow-sm hover:shadow-md active:scale-[0.97] transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap
            </Button>

            {/* Row 2: Dates */}
            <div>
              <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                {tripType === "roundtrip" ? `${t("flights.departure")} & ${t("flights.return")}` : t("flights.departure")}
                <span className="text-destructive"> *</span>
              </Label>

              <div
                className={cn(
                  "rounded-2xl border border-border/30 bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm",
                  (errors.depart || errors.return) && "border-destructive"
                )}
              >
                <div className={cn("grid", tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1")}>
                  {isMobile ? (
                    <>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setDepartSheetOpen(true)}
                        className={cn(
                          "h-14 justify-start rounded-none px-4 text-left font-normal touch-manipulation",
                          !departDate && "text-muted-foreground",
                          tripType === "roundtrip" && "border-r border-border"
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 mr-3 text-primary" />
                        <div className="flex flex-col items-start">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("flights.departure")}
                          </span>
                          <span>{departDate ? format(departDate, "EEE, MMM d") : "Select date"}</span>
                        </div>
                      </Button>

                      {tripType === "roundtrip" && (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setDepartSheetOpen(true)}
                          className={cn(
                            "h-14 justify-start rounded-none px-4 text-left font-normal touch-manipulation",
                            !returnDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="w-4 h-4 mr-3 text-primary" />
                          <div className="flex flex-col items-start">
                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {t("flights.return")}
                            </span>
                            <span>{returnDate ? format(returnDate, "EEE, MMM d") : "Select date"}</span>
                          </div>
                        </Button>
                      )}

                      {tripType === "roundtrip" ? (
                        <MobileDateRangePickerSheet
                          open={departSheetOpen}
                          onOpenChange={setDepartSheetOpen}
                          departDate={departDate}
                          returnDate={returnDate}
                          onRangeConfirmed={(dep, ret) => {
                            setDepartDate(dep);
                            setReturnDate(ret);
                          }}
                          label="Departure → Return"
                          origin={fromOption?.value}
                          destination={toOption?.value}
                          cabinClass={cabin}
                        />
                      ) : (
                        <MobileDatePickerSheet
                          open={departSheetOpen}
                          onOpenChange={setDepartSheetOpen}
                          selectedDate={departDate}
                          onDateSelect={setDepartDate}
                          label="Departure Date"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            type="button"
                            className={cn(
                              "h-14 justify-start rounded-none px-4 text-left font-normal hover:bg-muted/50",
                              !departDate && "text-muted-foreground",
                              tripType === "roundtrip" && "border-r border-border"
                            )}
                          >
                            <CalendarIcon className="w-4 h-4 mr-3 text-primary" />
                            <div className="flex flex-col items-start">
                              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                {t("flights.departure")}
                              </span>
                              <span>{departDate ? format(departDate, "EEE, MMM d") : "Select date"}</span>
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={departDate}
                            onSelect={(date) => {
                              setDepartDate(date);
                              if (date && returnDate && isBefore(returnDate, date)) {
                                setReturnDate(addDays(date, 7));
                              }
                            }}
                            disabled={(date) => isBefore(date, startOfToday())}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>

                      {tripType === "roundtrip" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              type="button"
                              className={cn(
                                "h-14 justify-start rounded-none px-4 text-left font-normal hover:bg-muted/50",
                                !returnDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="w-4 h-4 mr-3 text-primary" />
                              <div className="flex flex-col items-start">
                                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {t("flights.return")}
                                </span>
                                <span>{returnDate ? format(returnDate, "EEE, MMM d") : "Select date"}</span>
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={returnDate}
                              onSelect={setReturnDate}
                              disabled={(date) => departDate ? isBefore(date, departDate) : isBefore(date, startOfToday())}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </>
                  )}
                </div>
              </div>

              {(errors.depart || errors.return) && (
                <div className="mt-1 space-y-1">
                  {errors.depart && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.depart}
                    </p>
                  )}
                  {errors.return && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.return}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Row 3: Passengers & Cabin */}
            <div className="grid grid-cols-2 gap-3">
              {isMobile ? (
                <>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Travelers & Cabin</Label>
                    <Button
                      variant="outline"
                      onClick={() => setPassengerSheetOpen(true)}
                      className="w-full h-14 justify-start text-left font-normal rounded-2xl touch-manipulation shadow-sm border-border/30 hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <Users className="w-4 h-4 mr-2 text-foreground" />
                      {passengers} {passengers === 1 ? "Traveler" : "Travelers"} • {cabin.charAt(0).toUpperCase() + cabin.slice(1)}
                    </Button>
                    <MobilePassengerCabinSheet
                      open={passengerSheetOpen}
                      onOpenChange={setPassengerSheetOpen}
                      passengers={passengers}
                      cabin={cabin}
                      onPassengersChange={setPassengers}
                      onCabinChange={setCabin}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("flights.passengers")}</Label>
                    <Popover open={isPassengerOpen} onOpenChange={setIsPassengerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-11 sm:h-12 justify-start text-left font-normal rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <Users className="w-4 h-4 mr-2 text-foreground" />
                          {passengers} {passengers === 1 ? "Traveler" : "Travelers"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-4" align="start">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Adults</span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPassengers(Math.max(1, passengers - 1))}
                              disabled={passengers <= 1}
                              aria-label="Fewer passengers"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{passengers}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPassengers(Math.min(9, passengers + 1))}
                              disabled={passengers >= 9}
                              aria-label="More passengers"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          onClick={() => setIsPassengerOpen(false)}
                        >
                          Done
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{t("flights.class")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-11 sm:h-12 justify-start text-left font-normal rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          <Crown className={cn(
                            "w-4 h-4 mr-2",
                            cabin === "first" ? "text-amber-500" :
                            cabin === "business" ? "text-blue-500" : "text-emerald-500"
                          )} />
                          <span className="capitalize truncate">{cabin.replace("premium", "Premium Eco")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="space-y-1">
                          {cabinOptions.map((opt) => (
                            <button type="button"
                              key={opt.value}
                              onClick={() => setCabin(opt.value)}
                              className={cn(
                                "w-full px-3 py-2 text-left text-sm rounded-xl transition-colors",
                                cabin === opt.value
                                  ? "bg-sky-500/15 text-sky-500 font-medium"
                                  : "hover:bg-muted"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Button — solid, high-contrast */}
          <Button
            onClick={handleSearch}
            disabled={!isFormValid}
            size="lg"
            className={cn(
              "relative w-full h-13 sm:h-14 mt-6 font-bold text-base sm:text-lg rounded-2xl overflow-hidden",
              "text-white",
              "bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90",
              "shadow-[0_8px_24px_-6px_hsl(var(--flights)/0.55),inset_0_1px_0_rgba(255,255,255,0.18)]",
              "hover:shadow-[0_12px_32px_-6px_hsl(var(--flights)/0.65)]",
              "hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            )}
          >
            <Search className="relative z-10 w-5 h-5 mr-2" />
            <span className="relative z-10 tracking-wide">{t("flights.search_title")}</span>
          </Button>
          
          <p className="relative text-xs text-muted-foreground text-center mt-3">
            Payment completed securely on ZIVO. Tickets issued by licensed partners.
          </p>
        </>
      )}
    </div>
  );
}
