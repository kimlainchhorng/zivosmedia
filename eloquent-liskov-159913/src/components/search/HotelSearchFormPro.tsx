/**
 * Professional Hotel Search Form
 * 
 * Features:
 * - Structured city autocomplete (stores slugs)
 * - Smart date validation (checkout > checkin)
 * - Guest/room controls
 * - Clean URL submission (slugs only)
 * - Mobile-first responsive design
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Users,
  Calendar as CalendarIcon,
  AlertCircle,
  Minus,
  Plus,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format, addDays, isBefore, startOfToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { recordSearchAttempt } from "@/lib/recordSearchAttempt";
import LocationAutocomplete, { type LocationOption } from "./LocationAutocomplete";
import { useCitySearch } from "./hooks/useLocationSearch";

export interface HotelSearchParams {
  citySlug: string;
  cityName: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  rooms: number;
  children?: number;
}

interface HotelSearchFormProProps {
  // Initial values
  initialCity?: string;
  initialCityDisplay?: string;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialAdults?: number;
  initialRooms?: number;
  // Callbacks
  onSearch?: (params: HotelSearchParams) => void;
  navigateOnSearch?: boolean;
  className?: string;
}

export default function HotelSearchFormPro({
  initialCity = "",
  initialCityDisplay = "",
  initialCheckIn,
  initialCheckOut,
  initialAdults = 2,
  initialRooms = 1,
  onSearch,
  navigateOnSearch = true,
  className,
}: HotelSearchFormProProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { search: searchCities, getPopular, getBySlug, allOptions } = useCitySearch();

  // Location state
  const [cityOption, setCityOption] = useState<LocationOption | null>(null);
  const [cityDisplay, setCityDisplay] = useState("");

  // Date state
  const [checkIn, setCheckIn] = useState<Date | undefined>(
    initialCheckIn || addDays(new Date(), 7)
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    initialCheckOut || addDays(new Date(), 10)
  );

  // Guests & rooms
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(initialRooms);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate nights
  const nights = useMemo(() => {
    if (checkIn && checkOut) {
      return Math.max(1, differenceInDays(checkOut, checkIn));
    }
    return 0;
  }, [checkIn, checkOut]);

  // Initialize from props
  useEffect(() => {
    if (initialCity) {
      const option = getBySlug(initialCity);
      if (option) {
        setCityOption(option);
        setCityDisplay(option.label);
      } else {
        setCityDisplay(initialCityDisplay || initialCity);
      }
    } else if (initialCityDisplay) {
      setCityDisplay(initialCityDisplay);
    }
  }, [initialCity, initialCityDisplay, getBySlug]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Destination validation
    if (!cityOption && !cityDisplay.trim()) {
      newErrors.city = "Select a destination";
    }

    // Date validation
    if (!checkIn) {
      newErrors.checkIn = "Select check-in date";
    }

    if (!checkOut) {
      newErrors.checkOut = "Select check-out date";
    }

    if (checkIn && checkOut && !isBefore(checkIn, checkOut)) {
      newErrors.checkOut = "Check-out must be after check-in";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle search
  const handleSearch = () => {
    if (!validate()) return;
    if (!checkIn || !checkOut) return;

    // Get city slug and name
    const citySlug = cityOption?.value || cityDisplay.toLowerCase().replace(/\s+/g, '-');
    const cityName = cityOption?.label || cityDisplay;

    // Call onSearch callback with structured params
    onSearch?.({
      citySlug,
      cityName,
      checkIn,
      checkOut,
      adults,
      rooms,
      children: children > 0 ? children : undefined,
    });

    // Telemetry: record this search so we can re-engage if the user never
    // books (powers the PriceAlertsWidget + "your search expired" emails).
    void recordSearchAttempt("hotel", {
      citySlug,
      cityName,
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      adults,
      rooms,
      children: children > 0 ? children : 0,
    });

    if (navigateOnSearch) {
      const params = new URLSearchParams({
        city: citySlug,
        checkin: format(checkIn, "yyyy-MM-dd"),
        checkout: format(checkOut, "yyyy-MM-dd"),
        adults: String(adults),
        rooms: String(rooms),
      });

      if (children > 0) {
        params.set("children", String(children));
      }

      // Preserve UTM params
      const currentParams = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "creator"].forEach((key) => {
        const val = currentParams.get(key);
        if (val) params.set(key, val);
      });

      navigate(`/hotels/results?${params.toString()}`);
    }
  };
  const isFormValid = useMemo(() => {
    const hasCity = !!cityOption || !!cityDisplay.trim();
    const hasCheckIn = !!checkIn;
    const hasCheckOut = !!checkOut;
    const validDates = checkIn && checkOut ? isBefore(checkIn, checkOut) : true;
    return hasCity && hasCheckIn && hasCheckOut && validDates;
  }, [cityOption, cityDisplay, checkIn, checkOut]);

  return (
    <div className={cn(
      "bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-2xl",
      className
    )}>
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-t-2xl mb-4 sm:mb-5" />

      {/* Search Fields */}
      <div className="space-y-4">
        {/* Row 1: Destination */}
        <LocationAutocomplete
          value={cityOption?.value || ""}
          displayValue={cityDisplay}
          onChange={setCityOption}
          onDisplayChange={setCityDisplay}
          options={allOptions}
          searchFn={searchCities}
          popularFn={getPopular}
          placeholder="City or destination"
          label="Where are you going?"
          icon="hotel"
          accentColor="amber"
          error={errors.city}
          required
        />

        {/* Row 2: Dates */}
        <div className="grid grid-cols-2 gap-3">
          {/* Check-in */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Check-in <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl",
                    !checkIn && "text-muted-foreground",
                    errors.checkIn && "border-destructive"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2 text-amber-500" />
                  {checkIn ? format(checkIn, "MMM d") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(date) => {
                    setCheckIn(date);
                    // Auto-adjust checkout if needed
                    if (date && checkOut && !isBefore(date, checkOut)) {
                      setCheckOut(addDays(date, 1));
                    }
                  }}
                  disabled={(date) => isBefore(date, startOfToday())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.checkIn && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.checkIn}
              </p>
            )}
          </div>

          {/* Check-out */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Check-out <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl",
                    !checkOut && "text-muted-foreground",
                    errors.checkOut && "border-destructive"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2 text-orange-500" />
                  {checkOut ? format(checkOut, "MMM d") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date) => checkIn ? !isBefore(checkIn, date) : isBefore(date, startOfToday())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.checkOut && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.checkOut}
              </p>
            )}
          </div>
        </div>

        {/* Nights indicator */}
        {nights > 0 && (
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Row 3: Guests & Rooms */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Guests & Rooms</Label>
          <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl"
              >
                <Users className="w-4 h-4 mr-2 text-amber-500" />
                {adults + children} guest{adults + children !== 1 ? 's' : ''}, {rooms} room{rooms !== 1 ? 's' : ''}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="start">
              <div className="space-y-4">
                {/* Adults */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Adults</span>
                    <p className="text-xs text-muted-foreground">Ages 18+</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fewer adults"
                      className="h-8 w-8"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{adults}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More adults"
                      className="h-8 w-8"
                      onClick={() => setAdults(Math.min(10, adults + 1))}
                      disabled={adults >= 10}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Children</span>
                    <p className="text-xs text-muted-foreground">Ages 0-17</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fewer children"
                      className="h-8 w-8"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{children}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More children"
                      className="h-8 w-8"
                      onClick={() => setChildren(Math.min(6, children + 1))}
                      disabled={children >= 6}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Rooms */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <span className="font-medium">Rooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Fewer rooms"
                      className="h-8 w-8"
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      disabled={rooms <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{rooms}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="More rooms"
                      className="h-8 w-8"
                      onClick={() => setRooms(Math.min(5, rooms + 1))}
                      disabled={rooms >= 5}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => setIsGuestOpen(false)}
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={!isFormValid}
        size="lg"
        className={cn(
          "w-full h-12 sm:h-14 mt-5 font-bold text-base sm:text-lg rounded-xl",
          "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600",
          "text-primary-foreground shadow-xl shadow-amber-500/30 hover:shadow-amber-500/40",
          "transition-all duration-300 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Search className="w-5 h-5 mr-2" />
        Search Hotels
      </Button>

      {/* Affiliate notice */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3">
        ZIVO compares prices from multiple booking sites. We may earn a commission.
      </p>
    </div>
  );
}
