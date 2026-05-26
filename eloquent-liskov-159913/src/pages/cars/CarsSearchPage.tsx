/**
 * Public Car Rental Search Page
 * Owner-listed marketplace search with filters
 */

import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Car,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Fuel,
  Settings2,
  Star,
  Filter,
  X,
  Search,
  Zap,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { useP2PVehicleSearch, type P2PSearchFilters, type P2PVehicleWithOwner } from "@/hooks/useP2PBooking";
import { useCarRentalSettings } from "@/hooks/useCarRentalSettings";
import ServiceDisclaimer from "@/components/shared/ServiceDisclaimer";

// Vehicle category options
const categories = [
  { value: "all", label: "All Categories" },
  { value: "economy", label: "Economy" },
  { value: "compact", label: "Compact" },
  { value: "midsize", label: "Midsize" },
  { value: "fullsize", label: "Full Size" },
  { value: "suv", label: "SUV" },
  { value: "luxury", label: "Luxury" },
  { value: "sports", label: "Sports" },
  { value: "minivan", label: "Minivan" },
  { value: "pickup", label: "Pickup" },
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
  { value: "plug_in_hybrid", label: "Plug-in Hybrid" },
];

const usStates = [
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "TX", label: "Texas" },
  { value: "FL", label: "Florida" },
  { value: "IL", label: "Illinois" },
  { value: "PA", label: "Pennsylvania" },
  { value: "OH", label: "Ohio" },
  { value: "GA", label: "Georgia" },
  { value: "NC", label: "North Carolina" },
  { value: "MI", label: "Michigan" },
];

export default function CarsSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useCarRentalSettings();
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [state, setState] = useState(searchParams.get("state") || "");
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    searchParams.get("pickup") ? new Date(searchParams.get("pickup")!) : addDays(new Date(), 1)
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    searchParams.get("return") ? new Date(searchParams.get("return")!) : addDays(new Date(), 4)
  );
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [transmission, setTransmission] = useState(searchParams.get("transmission") || "all");
  const [fuelType, setFuelType] = useState(searchParams.get("fuel") || "all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [instantBook, setInstantBook] = useState(false);
  const [minSeats, setMinSeats] = useState<number | undefined>();

  // Build search filters
  const filters: P2PSearchFilters = {
    city: city || undefined,
    state: state || undefined,
    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined,
    returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
    category: category !== "all" ? category : undefined,
    transmission: transmission !== "all" ? transmission : undefined,
    fuelType: fuelType !== "all" ? fuelType : undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
    instantBook: instantBook || undefined,
    seats: minSeats,
  };

  // Search query
  const { data: vehicles = [], isLoading, isError } = useP2PVehicleSearch(filters);

  // Update URL params on search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    if (pickupDate) params.set("pickup", format(pickupDate, "yyyy-MM-dd"));
    if (returnDate) params.set("return", format(returnDate, "yyyy-MM-dd"));
    if (category !== "all") params.set("category", category);
    if (transmission !== "all") params.set("transmission", transmission);
    if (fuelType !== "all") params.set("fuel", fuelType);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setCategory("all");
    setTransmission("all");
    setFuelType("all");
    setPriceRange([0, 500]);
    setInstantBook(false);
    setMinSeats(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Rent Cars from Local Owners | ZIVO"
        description="Find and book cars from trusted local owners. Book on ZIVO with secure payments and verified vehicles."
      />
      <Header />

      <main className="pt-20 pb-16">
        {/* Hero Search */}
        <section className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                Rent Cars from Local Owners
              </h1>
              <p className="text-muted-foreground">
                Book verified cars directly on ZIVO • No redirects • Secure payments
              </p>
            </div>

            {/* Search Form */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-4 sm:p-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Location */}
                  <div className="space-y-2">
                    <Label className="text-xs">City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">State</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {usStates.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pickup Date */}
                  <div className="space-y-2">
                    <Label className="text-xs">Pickup Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !pickupDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pickupDate ? format(pickupDate, "MMM d") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Return Date */}
                  <div className="space-y-2">
                    <Label className="text-xs">Return Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !returnDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "MMM d") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(date) =>
                            date < (pickupDate || new Date())
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Button onClick={handleSearch} className="flex-1 sm:flex-none gap-2">
                    <Search className="w-4 h-4" />
                    Search Cars
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Transmission</Label>
                        <Select value={transmission} onValueChange={setTransmission}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {transmissions.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Fuel Type</Label>
                        <Select value={fuelType} onValueChange={setFuelType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fuelTypes.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">
                        Price Range: ${priceRange[0]} - ${priceRange[1]}/day
                      </Label>
                      <Slider
                        value={priceRange}
                        onValueChange={(v) => setPriceRange(v as [number, number])}
                        min={0}
                        max={500}
                        step={10}
                        className="py-2"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="instant-book"
                          checked={instantBook}
                          onCheckedChange={setInstantBook}
                        />
                        <Label htmlFor="instant-book" className="text-sm flex items-center gap-1">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Instant Book Only
                        </Label>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="w-4 h-4 mr-1" />
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Results */}
        <section className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching available cars...</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-500">Failed to load vehicles. Please try again.</p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Car className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No Cars Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try adjusting your filters or searching in a different location.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Found <span className="font-semibold text-foreground">{vehicles.length}</span> cars
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Disclosure */}
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              <p>
                ZIVO operates a vehicle rental marketplace. Vehicle owners provide rental
                services directly. ZIVO facilitates booking and payment and earns a service
                commission.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Vehicle Card Component
function VehicleCard({ vehicle }: { vehicle: P2PVehicleWithOwner }) {
  const images = vehicle.images as string[] | null;
  const imageUrl = images?.[0] || null;

  return (
    <Link to={`/cars/${vehicle.id}`}>
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        {/* Image */}
        <div className="aspect-[4/3] relative bg-muted overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Car className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {vehicle.instant_book && (
              <Badge className="bg-amber-500 text-primary-foreground gap-1">
                <Zap className="w-3 h-3" />
                Instant
              </Badge>
            )}
          </div>

          {/* Owner rating */}
          {vehicle.owner?.rating && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {vehicle.owner.rating.toFixed(1)}
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {vehicle.location_city}, {vehicle.location_state}
          </p>

          {/* Specs */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {vehicle.seats || 5}
            </span>
            <span className="flex items-center gap-1">
              <Settings2 className="w-3 h-3" />
              {vehicle.transmission === "automatic" ? "Auto" : "Manual"}
            </span>
            <span className="flex items-center gap-1">
              <Fuel className="w-3 h-3" />
              {vehicle.fuel_type?.replace("_", " ") || "Gas"}
            </span>
          </div>

          <Separator className="my-3" />

          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold">${vehicle.daily_rate}</span>
              <span className="text-sm text-muted-foreground">/day</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
