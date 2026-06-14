/**
 * Cars Page - Public Vehicle Browse
 * Wrapper for P2PVehicleSearch that's SEO-optimized for /cars route
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CarElectricVehicles from "@/components/car/CarElectricVehicles";
import SEOHead from "@/components/SEOHead";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { useState, useMemo, type ReactNode } from "react";
import { 
  Search, MapPin, Calendar, Car, Zap, Star, Users, 
  Fuel, Settings2, X, SlidersHorizontal, ArrowRight, Shield
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useP2PVehicleSearch, type P2PSearchFilters } from "@/hooks/useP2PBooking";
import { PageTransition, Reveal, TiltCard } from "@/components/zivo-travel";

const categories = [
  { value: "all", label: "All Types" },
  { value: "economy", label: "Economy" },
  { value: "compact", label: "Compact" },
  { value: "midsize", label: "Midsize" },
  { value: "fullsize", label: "Full Size" },
  { value: "suv", label: "SUV" },
  { value: "luxury", label: "Luxury" },
  { value: "sports", label: "Sports" },
  { value: "minivan", label: "Minivan" },
  { value: "truck", label: "Truck" },
  { value: "electric", label: "Electric" },
];

const transmissions = [
  { value: "all", label: "Any Transmission" },
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

const fuelTypes = [
  { value: "all", label: "Any Fuel" },
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
];

const popularMakes = [
  "Tesla",
  "BMW",
  "Toyota",
  "Honda",
  "Mercedes",
  "Ford",
  "Chevrolet",
  "Audi",
  "Porsche",
  "Jeep",
];

function MaybePageTransition({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? <PageTransition>{children}</PageTransition> : <>{children}</>;
}

function MaybeReveal({
  enabled,
  children,
  className,
  delay,
}: {
  enabled: boolean;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return enabled ? (
    <Reveal className={className} delay={delay}>
      {children}
    </Reveal>
  ) : (
    <div className={className}>{children}</div>
  );
}

function MaybeTiltCard({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  return enabled ? (
    <TiltCard className={className}>{children}</TiltCard>
  ) : (
    <div className={className}>{children}</div>
  );
}

export default function Cars() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost();
  const seoBrand = isTravelHost ? "Zivo Travel" : "ZIVO";

  // Parse search params into filters
  const filters: P2PSearchFilters = useMemo(() => ({
    location: searchParams.get("city") || undefined,
    city: searchParams.get("city") || undefined,
    state: searchParams.get("state") || undefined,
    pickupDate: searchParams.get("pickup_date") || undefined,
    returnDate: searchParams.get("return_date") || undefined,
    category: searchParams.get("category") || undefined,
    make: searchParams.get("make") || undefined,
    transmission: searchParams.get("transmission") || undefined,
    fuelType: searchParams.get("fuel_type") || undefined,
    minPrice: searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined,
    maxPrice: searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined,
    seats: searchParams.get("seats") ? Number(searchParams.get("seats")) : undefined,
    instantBook: searchParams.get("instant_book") === "true",
  }), [searchParams]);

  const { data: vehicles, isLoading } = useP2PVehicleSearch(filters);

  // Local filter state
  const [localFilters, setLocalFilters] = useState({
    category: filters.category || "all",
    transmission: filters.transmission || "all",
    fuelType: filters.fuelType || "all",
    priceRange: [filters.minPrice || 0, filters.maxPrice || 500] as [number, number],
    instantBook: filters.instantBook || false,
  });

  const updateFilter = (key: string, value: string | number | boolean) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, String(value));
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const applyFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    
    if (localFilters.category !== "all") newParams.set("category", localFilters.category);
    else newParams.delete("category");
    
    if (localFilters.transmission !== "all") newParams.set("transmission", localFilters.transmission);
    else newParams.delete("transmission");
    
    if (localFilters.fuelType !== "all") newParams.set("fuel_type", localFilters.fuelType);
    else newParams.delete("fuel_type");
    
    if (localFilters.priceRange[0] > 0) newParams.set("min_price", String(localFilters.priceRange[0]));
    else newParams.delete("min_price");

    if (localFilters.priceRange[1] < 500) newParams.set("max_price", String(localFilters.priceRange[1]));
    else newParams.delete("max_price");
    
    if (localFilters.instantBook) newParams.set("instant_book", "true");
    else newParams.delete("instant_book");
    
    setSearchParams(newParams);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    if (filters.city) newParams.set("city", filters.city);
    if (filters.pickupDate) newParams.set("pickup_date", filters.pickupDate);
    if (filters.returnDate) newParams.set("return_date", filters.returnDate);
    setSearchParams(newParams);
    setLocalFilters({
      category: "all",
      transmission: "all",
      fuelType: "all",
      priceRange: [0, 500],
      instantBook: false,
    });
  };

  const activeFilterCount = [
    filters.make,
    filters.category,
    filters.transmission,
    filters.fuelType,
    filters.minPrice,
    filters.maxPrice,
    filters.instantBook,
  ].filter(Boolean).length;

  const handleVehicleClick = (vehicleId: string) => {
    const linkParams = new URLSearchParams();
    if (filters.pickupDate) linkParams.set("pickup_date", filters.pickupDate);
    if (filters.returnDate) linkParams.set("return_date", filters.returnDate);
    const query = linkParams.toString();
    const detailPath = `/cars/${vehicleId}${query ? `?${query}` : ""}`;
    
    if (!user) {
      // Redirect to login with return URL
      navigate(withRedirectParam("/login", detailPath));
    } else {
      navigate(detailPath);
    }
  };

  const pageTitle = filters.city ? `Rent Cars in ${filters.city}` : "Find Your Perfect Ride";
  const dateLabel = filters.pickupDate && filters.returnDate
    ? `${format(parseISO(filters.pickupDate), "MMM d")} - ${format(parseISO(filters.returnDate), "MMM d, yyyy")}`
    : "";
  const activeMake = filters.make?.toLowerCase();
  const makeChips = popularMakes.map((make) => {
    const selected = activeMake === make.toLowerCase();
    return (
      <button type="button"
        key={make}
        onClick={() => updateFilter("make", make.toLowerCase())}
        className={cn(
          "shrink-0 min-h-[40px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-200 whitespace-nowrap touch-manipulation active:scale-[0.95]",
          isTravelHost
            ? "zt-glass border-slate-900/10 bg-white/75 text-slate-700 hover:-translate-y-0.5 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            : "border-border hover:bg-muted hover:border-primary/30",
          selected && (isTravelHost
            ? "bg-gradient-to-r from-emerald-400/20 via-sky-400/20 to-violet-500/20 text-sky-800 ring-2 ring-sky-500/25"
            : "border-primary/40 bg-primary/10 text-primary"),
        )}
      >
        {make}
      </button>
    );
  });

  return (
    <div className={cn("min-h-screen bg-background", isTravelHost && "zivo-travel-3d zivo-travel-light text-slate-950")}>
      <SEOHead
        title={`Rent Cars from Local Owners${filters.city ? ` in ${filters.city}` : ""} | ${seoBrand}`}
        description={`Rent cars directly from local owners. Better prices, unique vehicles, flexible terms. Book now on ${seoBrand}'s peer-to-peer car sharing marketplace.`}
      />
      <Header />

      <MaybePageTransition enabled={isTravelHost}>
        <main className={cn("pt-20 pb-16", isTravelHost && "relative overflow-hidden pb-24 pt-28 sm:pt-32 lg:pt-24")}>
        {isTravelHost && <div className="zt-aurora fixed inset-0 opacity-70" aria-hidden />}

        {/* Cars Stats Bar */}
        <section className={cn("py-10 border-b border-border/30 mb-8", isTravelHost && "relative z-10 mb-0 border-b-0 py-6")}>
          <div className="container mx-auto px-4">
            <p className={cn("text-center text-sm font-medium text-muted-foreground mb-6", isTravelHost && "text-slate-500")}>
              Your peer-to-peer car marketplace
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Car,
                  value: "10K+",
                  label: "Vehicles",
                  borderColor: "border-t-[hsl(var(--cars))]",
                  iconBg: "bg-[hsl(var(--cars-light))]",
                  iconColor: "text-[hsl(var(--cars))]",
                },
                { icon: Users, value: "50K+", label: "Owners", borderColor: "border-t-primary", iconBg: "bg-primary/10", iconColor: "text-primary" },
                { icon: Star, value: "4.9", label: "Avg Rating", borderColor: "border-t-amber-500", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
                { icon: Shield, value: "100%", label: "Insured", borderColor: "border-t-emerald-500", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <MaybeTiltCard
                    enabled={isTravelHost}
                    className={cn(
                      `border-t-[3px] ${stat.borderColor}`,
                      isTravelHost
                        ? "zt-glass h-full rounded-3xl p-5 text-left transition hover:-translate-y-1 sm:p-6"
                        : "p-6 card-premium",
                    )}
                  >
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </MaybeTiltCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <MaybeReveal
            enabled={isTravelHost}
            className={cn(
              "mb-8",
              isTravelHost && "zt-glass zt-depth relative overflow-hidden rounded-[2rem] p-5 sm:p-8",
            )}
          >
            {isTravelHost && <div className="zt-aurora" aria-hidden />}
            <div className={cn(isTravelHost && "relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center")}>
              <div>
                <h1 className={cn("text-3xl sm:text-4xl font-bold mb-3", isTravelHost && "text-4xl leading-tight sm:text-5xl")}>
                  <span className={cn(isTravelHost && "zt-gradient-text")}>{pageTitle}</span>
                </h1>
                <p className={cn("text-lg text-muted-foreground max-w-2xl", isTravelHost && "text-slate-600")}>
                  Skip the rental counter. Book directly from local car owners for better prices and a personal touch.
                </p>

                {/* Price Match Guarantee Badge */}
                <div
                  className={cn(
                    "mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 font-medium",
                    isTravelHost && "bg-white/70 shadow-sm shadow-emerald-500/10",
                  )}
                >
                  <Shield className="w-4 h-4" />
                  Price Match Guarantee
                </div>

                {dateLabel && (
                  <p className={cn("text-muted-foreground mt-2", isTravelHost && "text-slate-500")}>
                    {dateLabel}
                  </p>
                )}
              </div>

              {isTravelHost && (
                <TiltCard className="zt-glass rounded-[1.5rem] p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-white shadow-lg shadow-sky-500/20">
                      <Search className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Search locked in</p>
                      <p className="text-sm font-bold text-slate-900">Local cars, travel-ready dates</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3">
                      <span className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-4 w-4 text-sky-600" /> Location
                      </span>
                      <span className="font-bold text-slate-900">{filters.city || "Any city"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 py-3">
                      <span className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4 text-emerald-600" /> Dates
                      </span>
                      <span className="text-right font-bold text-slate-900">{dateLabel || "Flexible"}</span>
                    </div>
                  </div>
                </TiltCard>
              )}
            </div>
          </MaybeReveal>

          {/* Popular Makes Scroll */}
          <div className={cn("mb-6", isTravelHost ? "relative z-10" : "-mx-4 px-4 overflow-x-auto scrollbar-hide")}>
            {isTravelHost ? (
              <div className="zt-rail -mx-4 px-4 pb-4" role="list" aria-label="Popular car makes">
                {makeChips}
              </div>
            ) : (
              <div className="flex gap-2 pb-2">{makeChips}</div>
            )}
          </div>

          {/* Filters Bar */}
          <div
            className={cn(
              "flex items-center gap-3 mb-6 overflow-x-auto pb-2",
              isTravelHost && "zt-glass relative z-10 rounded-3xl p-2 sm:p-3",
            )}
          >
            <Select
              value={filters.category || "all"}
              onValueChange={(v) => updateFilter("category", v)}
            >
              <SelectTrigger className={cn("w-[140px] shrink-0", isTravelHost && "rounded-2xl border-slate-900/10 bg-white/75")}>
                <Car className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("gap-2 shrink-0", isTravelHost && "rounded-2xl border-slate-900/10 bg-white/75")}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Filter Vehicles</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div className="space-y-3">
                    <Label>Vehicle Type</Label>
                    <Select
                      value={localFilters.category}
                      onValueChange={(v) => setLocalFilters((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Transmission</Label>
                    <Select
                      value={localFilters.transmission}
                      onValueChange={(v) => setLocalFilters((f) => ({ ...f, transmission: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {transmissions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Fuel Type</Label>
                    <Select
                      value={localFilters.fuelType}
                      onValueChange={(v) => setLocalFilters((f) => ({ ...f, fuelType: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>
                      Daily Price: ${localFilters.priceRange[0]} - ${localFilters.priceRange[1]}+
                    </Label>
                    <Slider
                      value={localFilters.priceRange}
                      onValueChange={(v) => setLocalFilters((f) => ({ ...f, priceRange: v as [number, number] }))}
                      min={0}
                      max={500}
                      step={10}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Instant Book Only</Label>
                      <p className="text-sm text-muted-foreground">Skip the approval wait</p>
                    </div>
                    <Switch
                      checked={localFilters.instantBook}
                      onCheckedChange={(v) => setLocalFilters((f) => ({ ...f, instantBook: v }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>Clear All</Button>
                    <Button className="flex-1" onClick={applyFilters}>Apply Filters</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {filters.instantBook && (
              <Badge
                variant="secondary"
                className={cn("gap-1 cursor-pointer", isTravelHost && "rounded-full bg-white/75 text-slate-700")}
                onClick={() => updateFilter("instant_book", false)}
              >
                <Zap className="w-3 h-3" />
                Instant Book
                <X className="w-3 h-3" />
              </Badge>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isTravelHost && "relative z-10")}>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className={cn("overflow-hidden", isTravelHost && "zt-glass rounded-[1.75rem] border-slate-900/10 bg-white/75")}>
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : vehicles && vehicles.length > 0 ? (
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isTravelHost && "relative z-10")}>
              {vehicles.map((vehicle) => {
                const images = (vehicle.images as string[]) || [];
                const primaryImage = images[0] || "/placeholder.svg";

                return (
                  <Card 
                    key={vehicle.id} 
                    className={cn(
                      "overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
                      isTravelHost && "zt-glass rounded-[1.75rem] border-slate-900/10 bg-white/75",
                    )}
                    onClick={() => handleVehicleClick(vehicle.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleVehicleClick(vehicle.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                        decoding="async"
                      />
                      {vehicle.instant_book && (
                        <Badge className="absolute top-3 left-3 bg-ig-gradient text-white border-0 gap-1 shadow-sm">
                          <Zap className="w-3 h-3" />
                          Instant
                        </Badge>
                      )}
                      <Badge variant="secondary" className="absolute top-3 right-3 capitalize">
                        {vehicle.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        {vehicle.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{vehicle.rating.toFixed(1)}</span>
                            {vehicle.total_trips && (
                              <span className="text-muted-foreground/70">
                                ({vehicle.total_trips} trips)
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {vehicle.location_city}, {vehicle.location_state}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        {vehicle.seats && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {vehicle.seats}
                          </div>
                        )}
                        {vehicle.transmission && (
                          <div className="flex items-center gap-1">
                            <Settings2 className="w-3.5 h-3.5" />
                            <span className="capitalize">{vehicle.transmission}</span>
                          </div>
                        )}
                        {vehicle.fuel_type && (
                          <div className="flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5" />
                            <span className="capitalize">{vehicle.fuel_type}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-bold">${vehicle.daily_rate}</span>
                          <span className="text-muted-foreground text-sm">/day</span>
                        </div>
                        <Button size="sm" className="gap-1">
                          {user ? "View Details" : "Sign in to Book"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className={cn("text-center py-16", isTravelHost && "zt-glass relative z-10 rounded-[2rem] px-6")}>
              <Car className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No vehicles found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search location
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
        {/* EV Section */}
        <div className={cn(isTravelHost && "relative z-10")}>
          <CarElectricVehicles />
        </div>
        </main>
      </MaybePageTransition>

      <Footer />
    </div>
  );
}
