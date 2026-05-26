/**
 * Professional Car Rental Search Form
 * 
 * Features:
 * - Structured airport autocomplete (stores IATA codes)
 * - Smart date/time validation (dropoff >= pickup)
 * - Driver age selector
 * - Clean URL submission (codes only)
 * - Mobile-first responsive design
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
  Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, isBefore, startOfToday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import LocationAutocomplete, { type LocationOption } from "./LocationAutocomplete";
import { useAirportSearch } from "./hooks/useLocationSearch";

interface CarSearchFormProProps {
  // Initial values
  initialPickup?: string;
  initialPickupDate?: Date;
  initialPickupTime?: string;
  initialDropoffDate?: Date;
  initialDropoffTime?: string;
  initialDriverAge?: string;
  // Callbacks
  onSearch?: (params: URLSearchParams) => void;
  navigateOnSearch?: boolean;
  className?: string;
}

// Generate time options
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export default function CarSearchFormPro({
  initialPickup = "",
  initialPickupDate,
  initialPickupTime = "10:00",
  initialDropoffDate,
  initialDropoffTime = "10:00",
  initialDriverAge = "30",
  onSearch,
  navigateOnSearch = true,
  className,
}: CarSearchFormProProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { search: searchAirports, getPopular, getByCode, allOptions } = useAirportSearch();

  // Location state
  const [pickupOption, setPickupOption] = useState<LocationOption | null>(null);
  const [pickupDisplay, setPickupDisplay] = useState("");

  // Date/Time state
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    initialPickupDate || addDays(new Date(), 7)
  );
  const [pickupTime, setPickupTime] = useState(initialPickupTime);
  const [dropoffDate, setDropoffDate] = useState<Date | undefined>(
    initialDropoffDate || addDays(new Date(), 10)
  );
  const [dropoffTime, setDropoffTime] = useState(initialDropoffTime);

  // Driver age
  const [driverAge, setDriverAge] = useState(initialDriverAge);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate days
  const rentalDays = useMemo(() => {
    if (pickupDate && dropoffDate) {
      return Math.max(1, differenceInDays(dropoffDate, pickupDate));
    }
    return 0;
  }, [pickupDate, dropoffDate]);

  // Initialize from props
  useEffect(() => {
    if (initialPickup) {
      const option = getByCode(initialPickup);
      if (option) {
        setPickupOption(option);
        setPickupDisplay(option.label);
      } else {
        setPickupDisplay(initialPickup);
      }
    }
  }, [initialPickup, getByCode]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Location validation
    if (!pickupOption && !pickupDisplay.match(/\([A-Z]{3}\)/)) {
      newErrors.pickup = "Select a pickup location";
    }

    // Date validation
    if (!pickupDate) {
      newErrors.pickupDate = "Select pickup date";
    }

    if (!dropoffDate) {
      newErrors.dropoffDate = "Select return date";
    }

    // Ensure dropoff is after pickup
    if (pickupDate && dropoffDate) {
      if (isBefore(dropoffDate, pickupDate)) {
        newErrors.dropoffDate = "Return must be after pickup";
      } else if (
        format(pickupDate, "yyyy-MM-dd") === format(dropoffDate, "yyyy-MM-dd") &&
        pickupTime >= dropoffTime
      ) {
        newErrors.dropoffDate = "Return time must be after pickup";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle search
  const handleSearch = () => {
    if (!validate()) return;

    // Extract IATA code
    const pickupCode = pickupOption?.value || pickupDisplay.match(/\(([A-Z]{3})\)/)?.[1] || "";

    const params = new URLSearchParams({
      pickup: pickupCode.toUpperCase(),
      pickup_date: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
      pickup_time: pickupTime,
      dropoff_date: dropoffDate ? format(dropoffDate, "yyyy-MM-dd") : "",
      dropoff_time: dropoffTime,
      age: driverAge,
    });

    // Preserve UTM params
    const currentParams = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "creator"].forEach((key) => {
      const val = currentParams.get(key);
      if (val) params.set(key, val);
    });

    onSearch?.(params);

    if (navigateOnSearch) {
      navigate(`/rent-car/results?${params.toString()}`);
    }
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const hasPickup = !!pickupOption || !!pickupDisplay.match(/\([A-Z]{3}\)/);
    const hasPickupDate = !!pickupDate;
    const hasDropoffDate = !!dropoffDate;
    const validDates = pickupDate && dropoffDate ? !isBefore(dropoffDate, pickupDate) : true;
    return hasPickup && hasPickupDate && hasDropoffDate && validDates;
  }, [pickupOption, pickupDisplay, pickupDate, dropoffDate]);

  const ageOptions = [
    { value: "21", label: "21-24 years" },
    { value: "25", label: "25-29 years" },
    { value: "30", label: "30-64 years" },
    { value: "65", label: "65+ years" },
  ];

  return (
    <div className={cn(
      "bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-2xl",
      className
    )}>
      {/* Accent bar */}
      <div className="h-1 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 rounded-t-2xl mb-4 sm:mb-5 bg-secondary" />

      {/* Search Fields */}
      <div className="space-y-4">
        {/* Row 1: Pickup Location */}
        <LocationAutocomplete
          value={pickupOption?.value || ""}
          displayValue={pickupDisplay}
          onChange={setPickupOption}
          onDisplayChange={setPickupDisplay}
          options={allOptions}
          searchFn={searchAirports}
          popularFn={getPopular}
          placeholder="Airport or city"
          label="Pickup Location"
          icon="plane"
          accentColor="violet"
          error={errors.pickup}
          required
        />

        {/* Row 2: Pickup Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Pickup Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl",
                    !pickupDate && "text-muted-foreground",
                    errors.pickupDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2 text-foreground" />
                  {pickupDate ? format(pickupDate, "MMM d") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={pickupDate}
                  onSelect={(date) => {
                    setPickupDate(date);
                    // Auto-adjust dropoff if needed
                    if (date && dropoffDate && isBefore(dropoffDate, date)) {
                      setDropoffDate(addDays(date, 3));
                    }
                  }}
                  disabled={(date) => isBefore(date, startOfToday())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.pickupDate && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.pickupDate}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Pickup Time</Label>
            <Select value={pickupTime} onValueChange={setPickupTime}>
              <SelectTrigger className="h-11 sm:h-12 rounded-xl">
                <Clock className="w-4 h-4 mr-2 text-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Dropoff Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Return Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 sm:h-12 justify-start text-left font-normal rounded-xl",
                    !dropoffDate && "text-muted-foreground",
                    errors.dropoffDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2 text-foreground" />
                  {dropoffDate ? format(dropoffDate, "MMM d") : "Select"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dropoffDate}
                  onSelect={setDropoffDate}
                  disabled={(date) => pickupDate ? isBefore(date, pickupDate) : isBefore(date, startOfToday())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.dropoffDate && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.dropoffDate}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Return Time</Label>
            <Select value={dropoffTime} onValueChange={setDropoffTime}>
              <SelectTrigger className="h-11 sm:h-12 rounded-xl">
                <Clock className="w-4 h-4 mr-2 text-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rental days indicator */}
        {rentalDays > 0 && (
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {rentalDays} day{rentalDays !== 1 ? 's' : ''} rental
            </span>
          </div>
        )}

        {/* Row 4: Driver Age */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Driver Age</Label>
          <Select value={driverAge} onValueChange={setDriverAge}>
            <SelectTrigger className="h-11 sm:h-12 rounded-xl">
              <User className="w-4 h-4 mr-2 text-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ageOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground mt-1">
            Young driver fees may apply for ages 21-24
          </p>
        </div>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={!isFormValid}
        size="lg"
        className={cn(
          "w-full h-12 sm:h-14 mt-5 font-bold text-base sm:text-lg rounded-xl",
          "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 hover:from-violet-600 hover:via-purple-600 hover:to-violet-600",
          "text-primary-foreground shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40",
          "transition-all duration-300 active:scale-[0.98]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Search className="w-5 h-5 mr-2" />
        Search Cars
      </Button>

      {/* Affiliate notice */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3">
        ZIVO compares prices from multiple rental sites. We may earn a commission.
      </p>
    </div>
  );
}
