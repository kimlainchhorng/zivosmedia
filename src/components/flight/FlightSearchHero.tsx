import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plane,
  Search,
  CalendarIcon,
  Users,
  ArrowLeftRight,
  Shield,
  Star,
  Clock,
  Sparkles,
  Globe,
  CalendarDays,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Award,
  RefreshCw,
  MapPin,
  Flame,
  ChevronDown,
  ChevronUp,
  Filter,
  Minus,
  Plus,
  Baby,
  User,
} from "lucide-react";
import { format } from "date-fns";
import AirportAutocomplete from "./AirportAutocomplete";
import PriceCalendar from "./PriceCalendar";
import flightHeroImage from "@/assets/flight-hero.jpg";
import { cn } from "@/lib/utils";
import { FLIGHT_HEADER_MICROCOPY } from "@/config/flightCompliance";

interface FlightSearchHeroProps {
  tripType: "roundtrip" | "oneway";
  setTripType: (type: "roundtrip" | "oneway") => void;
  fromCity: string;
  setFromCity: (city: string) => void;
  toCity: string;
  setToCity: (city: string) => void;
  departDate?: Date;
  setDepartDate: (date: Date | undefined) => void;
  returnDate?: Date;
  setReturnDate: (date: Date | undefined) => void;
  passengers: string;
  setPassengers: (passengers: string) => void;
  cabinClass: string;
  setCabinClass: (cabin: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  recentSearches: string[];
}

export default function FlightSearchHero({
  tripType,
  setTripType,
  fromCity,
  setFromCity,
  toCity,
  setToCity,
  departDate,
  setDepartDate,
  returnDate,
  setReturnDate,
  passengers,
  setPassengers,
  cabinClass,
  setCabinClass,
  onSearch,
  isSearching,
  recentSearches,
}: FlightSearchHeroProps) {
  const [showPriceCalendar, setShowPriceCalendar] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [nearbyAirports, setNearbyAirports] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  // Extract airport codes
  const fromMatch = fromCity.match(/\(([A-Z]{3})\)/);
  const toMatch = toCity.match(/\(([A-Z]{3})\)/);
  const fromCode = fromMatch ? fromMatch[1] : "LAX";
  const toCode = toMatch ? toMatch[1] : "JFK";

  const totalPassengers = adults + children + infants;

  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const updatePassengers = () => {
    setPassengers(String(totalPassengers));
  };

  const trustBadges = [
    { icon: Search, text: "Compare 500+ Airlines", color: "text-foreground" },
    { icon: Shield, text: "Trusted Partners", color: "text-emerald-500" },
    { icon: Clock, text: "Real-Time Prices", color: "text-amber-500" },
    { icon: Zap, text: "Fast & Easy", color: "text-purple-500" },
  ];

  const quickDestinations = [
    { city: "New York", code: "JFK", price: 299, oldPrice: 349, trend: -14, hot: true },
    { city: "London", code: "LHR", price: 449, oldPrice: 510, trend: -12, hot: false },
    { city: "Tokyo", code: "NRT", price: 699, oldPrice: 759, trend: -8, hot: true },
    { city: "Paris", code: "CDG", price: 399, oldPrice: 389, trend: +3, hot: false },
    { city: "Dubai", code: "DXB", price: 549, oldPrice: 620, trend: -11, hot: true },
    { city: "Singapore", code: "SIN", price: 629, oldPrice: 699, trend: -10, hot: false },
  ];

  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={flightHeroImage}
          alt="Airplane window view at sunset"
	          className="w-full h-full object-cover"
	          loading="eager"
	          decoding="async"
	          fetchPriority="high"
	        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-background/80" />
      </div>

      {/* Animated Background Elements - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <div className="absolute top-20 left-[10%] w-32 h-32 bg-secondary rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-[15%] w-40 h-40 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Floating decorative tiles - Desktop only */}
      <div className="absolute top-20 right-10 hidden lg:block">
        <div
          className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center"
          style={{ animation: "float3d 6s ease-in-out infinite" }}
        >
          <Plane className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <div className="absolute top-40 right-32 hidden lg:block">
        <div
          className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center"
          style={{ animation: "float3d 6s ease-in-out infinite 1s" }}
        >
          <Globe className="w-4 h-4 text-foreground" />
        </div>
      </div>
      <div className="absolute bottom-40 left-12 hidden lg:block">
        <div
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center"
          style={{ animation: "float3d 6s ease-in-out infinite 2s" }}
        >
          <Star className="w-4 h-4 text-foreground" />
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 relative z-10 pt-4 sm:pt-10 pb-6 sm:pb-10">
        <div className="text-center mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Live Indicator - Compact on mobile */}
          <div className="flex justify-center mb-2 sm:mb-3">
            <Badge className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              Live Prices • 500+ Airlines
            </Badge>
          </div>
          
          <Badge variant="secondary" className="mb-2 sm:mb-4 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            ZIVO Flights
          </Badge>
          <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 sm:mb-3 leading-tight">
            Search &amp; Compare <span className="text-accent-foreground">Flights</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed mb-3 sm:mb-4 px-2">
            {FLIGHT_HEADER_MICROCOPY.standard}
          </p>

          {/* Trust Badges - Horizontal scroll on mobile */}
          <div className="flex sm:flex-wrap sm:justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 px-1 -mx-3 sm:mx-0 scrollbar-hide">
            {trustBadges.map((item, index) => (
              <div
                key={item.text}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-card/60 backdrop-blur-xl border border-border/50 flex-shrink-0 first:ml-3 sm:first:ml-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", item.color)} />
                <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search Card - Mobile Optimized */}
        <div
          className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "0.1s" }}
        >
          <Card className="overflow-hidden border-0 bg-transparent shadow-none relative">
            {/* Card content wrapper */}
            <div className="relative bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border">
              {/* Top accent line */}
              <div className="h-0.5 sm:h-1 bg-foreground" />
              
              <CardContent className="p-3 sm:p-4 lg:p-6">
                {/* Trip Type Toggle - Mobile Compact */}
                <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {[
                    { type: "roundtrip" as const, label: "Round", fullLabel: "Round Trip", icon: RefreshCw },
                    { type: "oneway" as const, label: "One Way", fullLabel: "One Way", icon: Plane },
                  ].map((item) => (
                    <button type="button"
                      key={item.type}
                      onClick={() => setTripType(item.type)}
                      className={cn(
                        "px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-[11px] sm:text-xs transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0 touch-manipulation active:scale-95",
                        tripType === item.type
                          ? "bg-foreground text-background"
                          : "bg-muted/80 text-foreground/70 border border-border/60"
                      )}
                    >
                      <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="sm:hidden">{item.label}</span>
                      <span className="hidden sm:inline">{item.fullLabel}</span>
                    </button>
                  ))}
                  <button type="button" className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-[11px] sm:text-xs bg-muted/80 text-foreground/70 flex items-center gap-1.5 sm:gap-2 border border-border/60 flex-shrink-0 touch-manipulation active:scale-95">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Multi
                  </button>
                </div>

                {/* Search Fields - Mobile Stacked, Desktop 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 relative">
                  {/* Left Column: From + Departure */}
                  <div className="space-y-2 sm:space-y-3">
                    {/* From Field */}
                    <div className="relative">
                      <div className="bg-muted/50 rounded-xl border border-border/40 focus-within:border-border/50 transition-colors">
                        <AirportAutocomplete
                          value={fromCity}
                          onChange={setFromCity}
                          label="From"
                          placeholder="City or airport"
                          recentSearches={recentSearches}
                          excludeCode={toCode}
                        />
                      </div>
                    </div>

                    {/* Departure Date - Mobile Compact */}
                    <div className="relative">
                      <label className="text-[10px] sm:text-xs font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border border-border/20">
                          <CalendarIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-foreground" />
                        </div>
                        Departure
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 sm:h-11 justify-start bg-muted/60 hover:bg-muted border border-border/50 transition-all rounded-xl text-xs sm:text-sm font-medium touch-manipulation active:scale-[0.98]",
                              !departDate && "text-muted-foreground"
                            )}
                          >
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center mr-2 sm:mr-3 border border-border/20">
                              <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground" />
                            </div>
                            <div className="text-left flex-1">
                              {departDate ? (
                                <span className="font-bold text-foreground text-xs sm:text-sm">{format(departDate, "EEE, MMM d")}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs sm:text-sm">Select date</span>
                              )}
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border border-border/50 shadow-2xl rounded-xl" align="start">
                          <Calendar
                            mode="single"
                            selected={departDate}
                            onSelect={setDepartDate}
                            initialFocus
                            className="p-2 pointer-events-auto"
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Swap Button - Mobile inline, Desktop center */}
                  <button type="button"
                    onClick={swapCities}
                    className="flex md:hidden w-full h-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground border border-border/50 my-1 touch-manipulation active:scale-95 gap-1.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">Swap</span>
                  </button>
                  <button type="button"
                    onClick={swapCities}
                    className="hidden md:flex absolute left-1/2 top-[36px] -translate-x-1/2 w-9 h-9 items-center justify-center rounded-full bg-foreground text-background transition-transform z-20 hover:scale-105 active:scale-95 ring-2 ring-background"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Right Column: To + Return */}
                  <div className="space-y-2 sm:space-y-3">
                    {/* To Field */}
                    <div className="relative">
                      <div className="bg-muted/50 rounded-xl border border-border/40 focus-within:border-border/50 transition-colors">
                        <AirportAutocomplete
                          value={toCity}
                          onChange={setToCity}
                          label="To"
                          placeholder="City or airport"
                          recentSearches={recentSearches}
                          excludeCode={fromCode}
                        />
                      </div>
                    </div>

                    {/* Return Date - Mobile Compact */}
                    <div className="relative">
                      <label className="text-[10px] sm:text-xs font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border border-border/20">
                          <CalendarIcon className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-foreground" />
                        </div>
                        {tripType === "roundtrip" ? "Return" : "One Way"}
                      </label>
                      {tripType === "roundtrip" ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 sm:h-11 justify-start bg-muted/60 hover:bg-muted border border-border/50 transition-all rounded-xl text-xs sm:text-sm font-medium touch-manipulation active:scale-[0.98]",
                                !returnDate && "text-muted-foreground"
                              )}
                            >
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center mr-2 sm:mr-3 border border-border/20">
                                <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground" />
                              </div>
                              <div className="text-left flex-1">
                                {returnDate ? (
                                  <span className="font-bold text-foreground text-xs sm:text-sm">{format(returnDate, "EEE, MMM d")}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs sm:text-sm">Select date</span>
                                )}
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-card border border-border/50 shadow-2xl rounded-lg" align="start">
                            <Calendar
                              mode="single"
                              selected={returnDate}
                              onSelect={setReturnDate}
                              initialFocus
                              className="p-2 pointer-events-auto"
                              disabled={(date) => date < (departDate || new Date())}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="h-10 sm:h-11 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-dashed border-border/60 flex items-center justify-center text-muted-foreground text-[10px] sm:text-xs gap-1.5">
                          <Plane className="w-3 h-3 sm:w-3.5 sm:h-3.5 -rotate-45 text-muted-foreground/70" />
                          <span className="font-medium">No return</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passengers, Class & Search - Mobile optimized */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-end mb-4 sm:mb-6">
                  {/* Passengers Dropdown - Mobile Compact */}
                  <div className="col-span-1 sm:flex-1 sm:min-w-[140px]">
                    <label className="text-[10px] sm:text-xs font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border border-border/20">
                        <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-foreground" />
                      </div>
                      Travelers
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-10 sm:h-11 justify-between bg-muted/60 border border-border/50 rounded-lg text-xs sm:text-sm font-medium touch-manipulation active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center border border-border/20">
                              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground" />
                            </div>
                            <span className="font-bold text-foreground">{totalPassengers}</span>
                          </div>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 sm:w-72 p-3 sm:p-4 bg-card border border-border/50 shadow-2xl rounded-xl" align="start">
                        <div className="space-y-2 sm:space-y-3">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2 mb-2 sm:mb-3">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
                            Select Travelers
                          </h4>
                          {/* Adults */}
                          <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gradient-to-br from-muted/60 to-muted/40 border border-border/30">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-border/30">
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-foreground">Adults</p>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground">12+ years</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" aria-label="Fewer adults" className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl" onClick={() => setAdults(Math.max(1, adults - 1))} disabled={adults <= 1}>
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-bold text-xs sm:text-sm">{adults}</span>
                              <Button variant="outline" size="icon" aria-label="More adults" className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl" onClick={() => setAdults(Math.min(9, adults + 1))} disabled={adults >= 9}>
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Children */}
                          <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gradient-to-br from-muted/60 to-muted/40 border border-border/30">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-amber-500/30">
                                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-foreground">Children</p>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground">2-11 years</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" aria-label="Fewer children" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" onClick={() => setChildren(Math.max(0, children - 1))} disabled={children <= 0}>
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-bold text-xs sm:text-sm">{children}</span>
                              <Button variant="outline" size="icon" aria-label="More children" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" onClick={() => setChildren(Math.min(6, children + 1))} disabled={children >= 6}>
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Infants */}
                          <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gradient-to-br from-muted/60 to-muted/40 border border-border/30">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border border-border">
                                <Baby className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs sm:text-sm text-foreground">Infants</p>
                                <p className="text-[9px] sm:text-[10px] text-muted-foreground">Under 2</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" aria-label="Fewer infants" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" onClick={() => setInfants(Math.max(0, infants - 1))} disabled={infants <= 0}>
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                              <span className="w-6 sm:w-8 text-center font-bold text-xs sm:text-sm">{infants}</span>
                              <Button variant="outline" size="icon" aria-label="More infants" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" onClick={() => setInfants(Math.min(adults, infants + 1))} disabled={infants >= adults}>
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                            </div>
                          </div>

                          <Button className="w-full h-9 sm:h-10 mt-2 font-semibold text-xs sm:text-sm rounded-lg shadow-md" onClick={updatePassengers}>
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Cabin Class - Mobile Compact */}
                  <div className="col-span-1 sm:flex-1 sm:min-w-[120px]">
                    <label className="text-[10px] sm:text-xs font-bold text-foreground mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-secondary flex items-center justify-center border border-amber-500/20">
                        <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-400" />
                      </div>
                      Class
                    </label>
                    <Select value={cabinClass} onValueChange={setCabinClass}>
                      <SelectTrigger className="h-10 sm:h-11 bg-muted/60 border border-border/50 rounded-xl text-xs sm:text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border border-border/50 shadow-2xl rounded-xl">
                        <SelectItem value="economy" className="py-2 rounded-md text-xs sm:text-sm">Economy</SelectItem>
                        <SelectItem value="premium" className="py-2 rounded-md text-xs sm:text-sm">Premium</SelectItem>
                        <SelectItem value="business" className="py-2 rounded-md text-xs sm:text-sm">Business</SelectItem>
                        <SelectItem value="first" className="py-2 rounded-md text-xs sm:text-sm">First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search Button - Full width on mobile */}
                  <Button
                    onClick={onSearch}
                    disabled={isSearching}
                    className="col-span-2 sm:col-span-1 h-11 sm:h-11 px-6 sm:px-8 text-primary-foreground font-bold text-sm shadow-lg transition-all active:scale-[0.98] rounded-lg relative overflow-hidden touch-manipulation"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    <span className="relative">{isSearching ? "Searching..." : "Search Flights"}</span>
                  </Button>
                </div>

                {/* Advanced Options Toggle - Mobile friendly */}
                <button type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4 touch-manipulation active:scale-95"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-muted flex items-center justify-center transition-colors">
                    <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                  Options
                  {showAdvanced ? <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                </button>

                {/* Advanced Options Panel - Mobile optimized */}
                {showAdvanced && (
                  <div className="p-2 sm:p-3 rounded-lg bg-muted/40 border border-border/50 mb-3 sm:mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                        <Switch checked={directOnly} onCheckedChange={setDirectOnly} className="data-[state=checked]:bg-secondary scale-75 sm:scale-90" />
                        <div>
                          <p className="text-[11px] sm:text-xs font-semibold">Direct only</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">No stops</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                        <Switch checked={flexibleDates} onCheckedChange={setFlexibleDates} className="data-[state=checked]:bg-secondary scale-75 sm:scale-90" />
                        <div>
                          <p className="text-[11px] sm:text-xs font-semibold">Flexible</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">±3 days</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                        <Switch checked={nearbyAirports} onCheckedChange={setNearbyAirports} className="data-[state=checked]:bg-secondary scale-75 sm:scale-90" />
                        <div>
                          <p className="text-[11px] sm:text-xs font-semibold">Nearby</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">100mi</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Quick Destinations - Mobile horizontal scroll */}
                <div className="pt-3 sm:pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-bold text-foreground flex items-center gap-1.5 sm:gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-emerald-500/15 flex items-center justify-center">
                        <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                      </div>
                      Trending
                    </span>
                    <Badge className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-secondary text-foreground border-border/30 font-semibold text-[9px] sm:text-[10px]">
                      <Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                      Live
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
                    {quickDestinations.slice(0, 6).map((dest, index) => (
                      <button type="button"
                        key={dest.code}
                        onClick={() => setToCity(`${dest.city} (${dest.code})`)}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border transition-all flex-shrink-0 touch-manipulation active:scale-95 relative",
                          toCity.includes(dest.code)
                            ? "border-border text-foreground"
                            : "border-border/50 bg-muted/40"
                        )}
                      >
                        {dest.hot && (
                          <div className="absolute -top-1 -right-1">
                            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-500" />
                          </div>
                        )}
                        <span className="font-semibold text-[10px] sm:text-xs text-foreground whitespace-nowrap">{dest.city}</span>
                        <Badge className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0 sm:py-0.5 text-foreground border-border/30 font-bold">
                          ${dest.price}
                        </Badge>
                        <span className={cn(
                          "text-[8px] sm:text-[10px] font-bold flex items-center gap-0.5 px-1 py-0.5 rounded hidden sm:flex",
                          dest.trend < 0 ? "text-emerald-400 bg-emerald-500/15" : "text-orange-400 bg-orange-500/15"
                        )}>
                          {dest.trend < 0 ? <TrendingDown className="w-2 h-2" /> : <TrendingUp className="w-2 h-2" />}
                          {Math.abs(dest.trend)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Calendar Toggle - Mobile compact */}
                {toCity && (
                  <div className="pt-3 sm:pt-4 border-t border-border/40 mt-3 sm:mt-4">
                    <button type="button"
                      onClick={() => setShowPriceCalendar(!showPriceCalendar)}
                      className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-foreground transition-colors touch-manipulation active:scale-95"
                    >
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-secondary flex items-center justify-center">
                        <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      {showPriceCalendar ? "Hide" : "View"} Prices
                      <Badge className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-secondary text-foreground border-border/30 font-semibold text-[9px] sm:text-[10px]">
                        <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                        Best fares
                      </Badge>
                    </button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>

          {/* Price Calendar */}
          {showPriceCalendar && toCity && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-200">
              <PriceCalendar
                basePrice={299}
                selectedDate={departDate}
                onSelectDate={(date) => {
                  setDepartDate(date);
                  setShowPriceCalendar(false);
                }}
                fromCode={fromCode}
                toCode={toCode}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add shimmer animation to tailwind */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </section>
  );
}
