import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import NativeBackButton from "@/components/shared/NativeBackButton";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/shared/StarRating";
import SafeCaption from "@/components/social/SafeCaption";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { 
  Car,
  Search,
  CalendarDays,
  Clock,
  User,
  ShieldCheck,
  Users,
  ArrowRight,
  Sparkles,
  Star,
  Heart,
  MapPin,
  Shield,
  CheckCircle,
  Crown,
  Zap,
  ChevronRight,
  DollarSign,
  Award,
  Bell,
  Truck,
  Key,
  Fuel,
} from "lucide-react";
import { useP2PVehicleCount } from "@/hooks/useP2PBooking";
import P2PDiscoveryBanner from "@/components/car/P2PDiscoveryBanner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AirportAutocomplete, { getAirportByCode } from "@/components/car/AirportAutocomplete";
import CarResultCardPro from "@/components/car/CarResultCardPro";
import CarPartnerSelector from "@/components/car/CarPartnerSelector";
import AffiliateRedirectNotice from "@/components/shared/AffiliateRedirectNotice";
import CarTopSearchCTA from "@/components/car/CarTopSearchCTA";
import CarStickyBookingCTA from "@/components/car/CarStickyBookingCTA";
import ImageHero from "@/components/shared/ImageHero";
import BigSearchCard from "@/components/shared/BigSearchCard";
import DestinationCardsGrid from "@/components/shared/DestinationCardsGrid";
import TrustSection from "@/components/shared/TrustSection";
import { EnhanceYourTrip } from "@/components/travel-extras";
import TravelFAQ from "@/components/shared/TravelFAQ";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import { TrustFeatureCards, OGImageMeta } from "@/components/marketing";
import { SEOContentBlock, InternalLinkGrid } from "@/components/seo";
import { carAffiliatePartners } from "@/data/carAffiliatePartners";
import CarCategoryTiles from "@/components/car/CarCategoryTiles";
import type { CarCategory } from "@/config/photos";
import type { Airport } from "@/data/airports";
import { CAR_DISCLAIMERS } from "@/config/carCompliance";

/**
 * ZIVO CAR RENTAL - Top-Tier Car Search
 * Uses IATA codes for location handling
 */

const carCategories = [
  { name: "Economy", passengers: 4, bags: 2, priceFrom: 25, transmission: 'Automatic' as const, hasAC: true },
  { name: "Compact", passengers: 5, bags: 2, priceFrom: 30, transmission: 'Automatic' as const, hasAC: true },
  { name: "Midsize", passengers: 5, bags: 3, priceFrom: 38, transmission: 'Automatic' as const, hasAC: true },
  { name: "Full-size", passengers: 5, bags: 4, priceFrom: 42, transmission: 'Automatic' as const, hasAC: true },
  { name: "SUV", passengers: 7, bags: 4, priceFrom: 55, transmission: 'Automatic' as const, hasAC: true },
  { name: "Luxury", passengers: 5, bags: 3, priceFrom: 95, transmission: 'Automatic' as const, hasAC: true },
];

const CarRentalBooking = () => {
  const navigate = useNavigate();
  
  // Location state with IATA code
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [pickupDisplayValue, setPickupDisplayValue] = useState("");
  
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [driverAge, setDriverAge] = useState("25");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // === NEW: Turo-inspired features ===
  const [deliveryToYou, setDeliveryToYou] = useState(false);
  const [instantBook, setInstantBook] = useState(true);
  const [longTermDiscount, setLongTermDiscount] = useState(false);
  const [showTripProtection, setShowTripProtection] = useState(false);
  const [selectedProtection, setSelectedProtection] = useState<"none" | "basic" | "standard" | "premium">("standard");
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [savedCars, setSavedCars] = useState<string[]>([]);
  const [showCarFeatureFilter, setShowCarFeatureFilter] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [unlimitedMileage, setUnlimitedMileage] = useState(true);
  const [showElectricOnly, setShowElectricOnly] = useState(false);
  const [freeDelivery] = useState(true);
  const [hostRating] = useState(4.9);
  const [hostTrips] = useState(342);
  const [responseRate] = useState("99%");
  const [responseTime] = useState("< 1 hour");

  // Trip protection tiers (Turo)
  const protectionTiers = [
    { id: "none" as const, name: "Decline", price: "$0", features: ["No coverage", "You're responsible for all damage"] },
    { id: "basic" as const, name: "Basic", price: "$9/day", features: ["$2,500 deductible", "Liability coverage", "24/7 roadside"] },
    { id: "standard" as const, name: "Standard", price: "$19/day", features: ["$500 deductible", "Liability coverage", "24/7 roadside", "Lost key replacement"], badge: "Popular" },
    { id: "premium" as const, name: "Premium", price: "$35/day", features: ["$0 deductible", "Full liability", "24/7 concierge", "Lost key", "Tire & windshield"], badge: "Best Value" },
  ];

  // Car feature filters (Turo)
  const carFeatures = [
    { id: "bluetooth", label: "Bluetooth", icon: "📱" },
    { id: "gps", label: "GPS", icon: "📍" },
    { id: "backup-camera", label: "Backup Camera", icon: "📷" },
    { id: "heated-seats", label: "Heated Seats", icon: "🔥" },
    { id: "sunroof", label: "Sunroof", icon: "☀️" },
    { id: "apple-carplay", label: "Apple CarPlay", icon: "🍎" },
    { id: "smartphone-integration", label: "Smartphone Integration", icon: "📲" },
    { id: "keyless", label: "Keyless Entry", icon: "🔑" },
  ];

  // Host profiles will be populated from real Turo-style listings; empty
  // until that pipeline exists so we never display fabricated hosts.
  const hostProfiles: Array<{
    name: string; rating: number; trips: number;
    responseTime: string; superhost: boolean; joined: string;
  }> = [];

  // === NEW Wave 2: More Turo features ===
  const [showDamageInspection, setShowDamageInspection] = useState(false);
  const [showMileageCalc, setShowMileageCalc] = useState(false);
  const [showRoadsideDetails, setShowRoadsideDetails] = useState(false);
  const [showCarReviews, setShowCarReviews] = useState(false);
  const [showInsuranceComparison, setShowInsuranceComparison] = useState(false);

  // === WAVE 4: Road Trip Intelligence ===
  const [showFuelCalc, setShowFuelCalc] = useState(false);
  const [showTollEstimator, setShowTollEstimator] = useState(false);
  const [showParkingFinder, setShowParkingFinder] = useState(false);
  const [showRoadTripPlanner, setShowRoadTripPlanner] = useState(false);
  const [showVehicleCompare, setShowVehicleCompare] = useState(false);
  const [showRentalTips, setShowRentalTips] = useState(false);

  // Fuel cost calculator
  const fuelEstimates = [
    { carType: "Economy (32 mpg)", distance: 300, gallons: 9.4, cost: "$33", fuelType: "Regular" },
    { carType: "Midsize (28 mpg)", distance: 300, gallons: 10.7, cost: "$38", fuelType: "Regular" },
    { carType: "SUV (22 mpg)", distance: 300, gallons: 13.6, cost: "$48", fuelType: "Regular" },
    { carType: "EV (3.5 mi/kWh)", distance: 300, gallons: 0, cost: "$12", fuelType: "Electric" },
  ];

  // Toll estimator
  const tollEstimates = [
    { route: "NYC → Boston", tolls: "$18.50", ezPass: "$13.20", bridges: 1, tunnels: 0 },
    { route: "LA → San Diego", tolls: "$6.00", ezPass: "$4.50", bridges: 0, tunnels: 0 },
    { route: "Chicago → Detroit", tolls: "$12.00", ezPass: "$8.80", bridges: 1, tunnels: 0 },
    { route: "Miami → Orlando", tolls: "$22.00", ezPass: "$16.50", bridges: 0, tunnels: 0 },
  ];

  // Parking finder
  const parkingOptions = [
    { location: "Airport Terminal Lot", rate: "$18/day", type: "Covered", distance: "0 min walk", reservable: true },
    { location: "Economy Lot A", rate: "$8/day", type: "Open air", distance: "5 min shuttle", reservable: true },
    { location: "Off-site Park N Fly", rate: "$6/day", type: "Covered", distance: "8 min shuttle", reservable: true },
    { location: "Hotel valet", rate: "$25/day", type: "Valet", distance: "At lobby", reservable: false },
  ];

  // Road trip planner
  const roadTripStops = [
    { stop: "Rest stop", interval: "Every 2 hrs", amenities: ["Restrooms", "Gas", "Snacks"], tip: "Stretch for 10 min" },
    { stop: "Scenic overlook", interval: "Route-dependent", amenities: ["Photo ops", "Walking trails"], tip: "Check sunrise/sunset timing" },
    { stop: "EV charging", interval: "Every 150 mi", amenities: ["Fast charge (30 min)", "Nearby dining"], tip: "Plan stops with PlugShare app" },
  ];

  // Rental tips
  const rentalTips = [
    { tip: "Book 3-6 weeks ahead for best rates", icon: "📅", category: "Timing" },
    { tip: "Always photograph the car before driving off", icon: "📸", category: "Protection" },
    { tip: "Check credit card for included rental insurance", icon: "💳", category: "Savings" },
    { tip: "Return with full tank to avoid $9+/gal refuel fees", icon: "⛽", category: "Savings" },
    { tip: "Decline GPS — use your phone instead", icon: "📱", category: "Savings" },
    { tip: "Book at off-airport locations to save 20-30%", icon: "📍", category: "Savings" },
  ];

  // Damage inspection checklist
  const inspectionItems = [
    { id: "exterior", label: "Exterior body", icon: "🚗", checked: false },
    { id: "tires", label: "Tires & wheels", icon: "🛞", checked: false },
    { id: "interior", label: "Interior condition", icon: "💺", checked: false },
    { id: "lights", label: "Lights & signals", icon: "💡", checked: false },
    { id: "windshield", label: "Windshield", icon: "🪟", checked: false },
    { id: "fuel", label: "Fuel level", icon: "⛽", checked: false },
  ];

  // Mileage calculator
  const mileageOptions = [
    { plan: "Standard", miles: "200 mi/day", extraCost: "$0.25/mi over", included: true },
    { plan: "Extended", miles: "400 mi/day", extraCost: "$0.20/mi over", addOn: "+$8/day" },
    { plan: "Unlimited", miles: "Unlimited", extraCost: "No extra charges", addOn: "+$15/day" },
  ];

  // Roadside assistance
  const roadsideFeatures = [
    { feature: "Flat tire change", icon: "🔧", included: true },
    { feature: "Jump start", icon: "🔋", included: true },
    { feature: "Lockout service", icon: "🔐", included: true },
    { feature: "Fuel delivery", icon: "⛽", included: true },
    { feature: "Towing (up to 50 mi)", icon: "🚛", included: true },
    { feature: "Trip interruption", icon: "🏨", included: false, premium: true },
  ];

  // Real renter reviews will be sourced from a reviews table; empty until
  // that data exists so we never show fabricated reviews/ratings.
  const carReviews: Array<{
    name: string; car: string; rating: number; text: string; date: string;
  }> = [];

  // Handle airport selection from autocomplete
  const handleAirportChange = (airport: Airport | null, displayValue: string) => {
    setSelectedAirport(airport);
    setPickupDisplayValue(displayValue);
  };

  const handleSearch = () => {
    // Get pickup code - either from selected airport or extract from display value
    const pickupCode = selectedAirport?.code || pickupDisplayValue.match(/\(([A-Z]{3})\)/)?.[1];
    
    if (!pickupCode || !pickupDate || !returnDate) return;
    
    // Navigate to results page with proper URL params
    const params = new URLSearchParams({
      pickup: pickupCode,
      pickup_date: format(pickupDate, 'yyyy-MM-dd'),
      pickup_time: pickupTime,
      dropoff_date: format(returnDate, 'yyyy-MM-dd'),
      dropoff_time: returnTime,
      age: driverAge,
    });
    
    navigate(`/rent-car/results?${params.toString()}`);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setTimeout(() => {
      document.getElementById('partner-selector')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCategoryTileSelect = (category: CarCategory) => {
    const categoryMap: Record<CarCategory, string> = {
      economy: "Economy",
      compact: "Compact",
      midsize: "Midsize",
      suv: "SUV",
      luxury: "Luxury",
      van: "Full-size",
      electric: "Electric",
    };
    setSelectedCategory(categoryMap[category] || category);
    setHasSearched(true);
  };

  const handleRentCar = (categoryName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const partner = carAffiliatePartners[0];
    const pickupCode = selectedAirport?.code || pickupDisplayValue.match(/\(([A-Z]{3})\)/)?.[1] || '';
    const url = partner.urlTemplate({
      pickupLocation: pickupCode,
      pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined,
      returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      pickupTime,
      returnTime,
      driverAge: parseInt(driverAge),
    });
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const handleLocationSelect = (city: string) => {
    setPickupDisplayValue(city);
  };

  // Calculate days for pricing
  const daysCount = pickupDate && returnDate 
    ? Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <SEOHead 
        title="ZIVO Car Rentals – Compare & Rent Cars Worldwide"
        description="Compare car rental prices from top providers worldwide. Find the best deals on economy, SUV, luxury and more. Book with trusted partners."
      />
      <OGImageMeta pageType="cars" />
      <Header />
      <NativeBackButton />

      <main className="pb-32 lg:pb-20">
        {/* Car Rental Disclaimer Banner - LOCKED TEXT */}
        <section className="border-b border-border py-2.5 bg-secondary">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
              {CAR_DISCLAIMERS.partnerBooking}
            </p>
          </div>
        </section>

        {/* Hero with Big Search */}
        <ImageHero service="cars" icon={Car}>
          <BigSearchCard service="cars">
            {/* Main Search Fields */}
            <div className="space-y-4">
              {/* Row 1: Location - Airport Autocomplete */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Pickup Location</label>
                <AirportAutocomplete
                  value={pickupDisplayValue}
                  onChange={handleAirportChange}
                  placeholder="Airport or city (e.g., LAX, Miami)"
                />
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Pickup Date */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Pickup Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <CalendarDays className="mr-2 h-4 w-4 text-foreground" />
                        {pickupDate ? format(pickupDate, "MMM d") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={setPickupDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Pickup Time */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Pickup Time</label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="h-12">
                      <Clock className="w-4 h-4 mr-2 text-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>{hour}:00</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Return Date */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Return Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start">
                        <CalendarDays className="mr-2 h-4 w-4 text-foreground" />
                        {returnDate ? format(returnDate, "MMM d") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Return Time */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Return Time</label>
                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="h-12">
                      <Clock className="w-4 h-4 mr-2 text-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>{hour}:00</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Driver Age */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Driver Age</label>
                  <Select value={driverAge} onValueChange={setDriverAge}>
                    <SelectTrigger className="h-12">
                      <User className="w-4 h-4 mr-2 text-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21">21-24 years</SelectItem>
                      <SelectItem value="25">25-29 years</SelectItem>
                      <SelectItem value="30">30-64 years</SelectItem>
                      <SelectItem value="65">65+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Search Button - Big & Prominent */}
            <Button 
              onClick={handleSearch}
              disabled={!selectedAirport && !pickupDisplayValue.match(/\([A-Z]{3}\)/)}
              size="lg"
              className={cn(
                "w-full h-14 font-bold text-lg mt-6",
                "transition-all duration-200 active:scale-[0.98]"
              )}
            >
              <Search className="w-5 h-5 mr-2" />
              Search Cars
            </Button>
          </BigSearchCard>
        </ImageHero>

        {/* Search Results */}
        {hasSearched && (
          <section className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">
                Car Rentals in {selectedAirport?.city || pickupDisplayValue}
              </h2>
              <p className="text-sm text-muted-foreground">
                {carCategories.length} categories available • Compare prices across rental sites
              </p>
            </div>

            <CarTopSearchCTA
              pickupLocation={selectedAirport?.code || pickupDisplayValue}
              pickupDate={pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined}
              returnDate={returnDate ? format(returnDate, "yyyy-MM-dd") : undefined}
              pickupTime={pickupTime}
              returnTime={returnTime}
              driverAge={parseInt(driverAge)}
              className="mb-6"
            />

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {carCategories.map((category) => (
                  <CarResultCardPro
                    key={category.name}
                    id={category.name}
                    category={category.name}
                    passengers={category.passengers}
                    bags={category.bags}
                    transmission={category.transmission}
                    hasAC={category.hasAC}
                    mileage="Unlimited"
                    fuelPolicy="Full to Full"
                    pricePerDay={category.priceFrom}
                    totalPrice={daysCount ? category.priceFrom * daysCount : undefined}
                    daysCount={daysCount}
                    isSelected={selectedCategory === category.name}
                    onSelect={() => handleCategorySelect(category.name)}
                    onBook={() => handleRentCar(category.name)}
                  />
                ))}
              </div>

              <div className="space-y-6">
                {selectedCategory && (
                  <div id="partner-selector">
                    <CarPartnerSelector
                      carName={selectedCategory}
                      pickupLocation={selectedAirport?.code || pickupDisplayValue}
                      pickupDate={pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined}
                      returnDate={returnDate ? format(returnDate, "yyyy-MM-dd") : undefined}
                      pickupTime={pickupTime}
                      returnTime={returnTime}
                      driverAge={parseInt(driverAge)}
                    />
                  </div>
                )}

                <AffiliateRedirectNotice variant="banner" />
              </div>
            </div>

            {/* Price Disclaimer - LOCKED TEXT */}
            <div className="mt-6 p-4 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground text-center font-medium mb-1">
                {CAR_DISCLAIMERS.partnerBooking}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {CAR_DISCLAIMERS.price} {CAR_DISCLAIMERS.insurance}
              </p>
            </div>
          </section>
        )}

        {/* P2P Discovery Banner */}
        <P2PDiscoveryBanner city={selectedAirport?.city || pickupDisplayValue} />

        {/* === TURO-INSPIRED FEATURES === */}

        {/* Delivery & Instant Book Toggles */}
        <section className="py-6 border-b border-border/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-center gap-3">
                <button type="button" onClick={() => { setDeliveryToYou(!deliveryToYou); if (!deliveryToYou) toast.success("🚗 Car will be delivered to your location!"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", deliveryToYou ? "bg-emerald-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", deliveryToYou ? "left-[18px]" : "left-0.5")} />
                </button>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> Delivery to You</p>
                  <p className="text-[10px] text-muted-foreground">{freeDelivery ? "Free delivery!" : "From $15"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-center gap-3">
                <button type="button" onClick={() => setInstantBook(!instantBook)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", instantBook ? "bg-primary" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", instantBook ? "left-[18px]" : "left-0.5")} />
                </button>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Instant Book</p>
                  <p className="text-[10px] text-muted-foreground">Skip approval, book instantly</p>
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border/40 p-4 flex items-center gap-3">
                <button type="button" onClick={() => setShowElectricOnly(!showElectricOnly)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", showElectricOnly ? "bg-emerald-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", showElectricOnly ? "left-[18px]" : "left-0.5")} />
                </button>
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5 text-emerald-500" /> Electric Only</p>
                  <p className="text-[10px] text-muted-foreground">Tesla, Rivian, Lucid & more</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Car Feature Filters (Turo) */}
        <section className="py-6 border-b border-border/30 bg-muted/5">
          <div className="container mx-auto px-4">
            <button type="button" onClick={() => setShowCarFeatureFilter(!showCarFeatureFilter)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-all mb-4">
              <Key className="w-4 h-4 text-foreground" /> Car Features
              <ChevronRight className={cn("w-4 h-4 transition-transform", showCarFeatureFilter && "rotate-90")} />
            </button>
            {showCarFeatureFilter && (
              <div className="flex gap-2 flex-wrap">
                {carFeatures.map(f => (
                  <button type="button" key={f.id} onClick={() => setSelectedFeatures(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                    className={cn("px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                      selectedFeatures.includes(f.id) ? "bg-secondary text-foreground border border-border" : "bg-card text-muted-foreground border border-border/40")}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trip Protection Plans (Turo) */}
        <section className="py-8 border-b border-border/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-foreground" /> Trip Protection Plans
              </h2>
              <p className="text-sm text-muted-foreground">Choose your coverage level</p>
            </div>
            <div className="grid md:grid-cols-4 gap-3 max-w-5xl mx-auto">
              {protectionTiers.map(tier => (
                <button type="button" key={tier.id} onClick={() => setSelectedProtection(tier.id)}
                  className={cn("rounded-2xl p-4 text-left transition-all border relative",
                    selectedProtection === tier.id ? "border-foreground bg-secondary" : "border-border bg-card hover:border-foreground/30")}>
                  {"badge" in tier && tier.badge && (
                    <span className="absolute -top-2 right-3 text-[8px] font-bold bg-foreground text-background px-2 py-0.5 rounded-full">{tier.badge}</span>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-foreground">{tier.name}</h3>
                    <span className="text-xs font-bold text-foreground">{tier.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {tier.features.map(f => (
                      <li key={f} className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Host Profiles (Turo) — hidden until real host data exists */}
        {hostProfiles.length > 0 && (
        <section className="py-8 border-b border-border/30 bg-muted/5">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-foreground" /> Top-Rated Hosts
            </h2>
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {hostProfiles.map(host => (
                <div key={host.name} className="rounded-2xl bg-card border border-border/40 p-5 text-center hover:border-border transition-all">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-secondary border border-border flex items-center justify-center text-2xl font-bold text-foreground">
                    {host.name.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                    {host.name}
                    {host.superhost && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px] ml-1">⭐ Superhost</Badge>}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {host.rating}</span>
                    <span>{host.trips} trips</span>
                    <span>Since {host.joined}</span>
                  </div>
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">Responds {host.responseTime}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Long-Term Discount Banner (Turo) */}
        <section className="py-6 border-b border-border bg-secondary">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">Long-Term Discounts Available</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Save up to 25% on weekly rentals and 40% on monthly rentals</p>
            <div className="flex justify-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">3+ days: 10% off</span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">7+ days: 25% off</span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">30+ days: 40% off</span>
            </div>
          </div>
        </section>

        {/* === WAVE 2: More Turo Features === */}

        {/* Damage Inspection Checklist */}
        <section className="py-8 border-b border-border/30">
          <div className="container mx-auto px-4">
            <button type="button" onClick={() => setShowDamageInspection(!showDamageInspection)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-all mb-4">
              <CheckCircle className="w-5 h-5 text-foreground" /> Pre-Pickup Inspection Checklist
              <ChevronRight className={cn("w-4 h-4 transition-transform", showDamageInspection && "rotate-90")} />
            </button>
            {showDamageInspection && (
              <div className="max-w-md mx-auto space-y-2">
                {inspectionItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-foreground flex-1">{item.label}</span>
                    <div className="w-5 h-5 rounded border-2 border-border/40" />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center mt-2">📸 Take photos before and after for damage protection</p>
              </div>
            )}
          </div>
        </section>

        {/* Mileage Calculator */}
        <section className="py-8 border-b border-border/30 bg-muted/10">
          <div className="container mx-auto px-4">
            <button type="button" onClick={() => setShowMileageCalc(!showMileageCalc)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-all mb-4">
              <Fuel className="w-5 h-5 text-emerald-500" /> Mileage Plans
              <ChevronRight className={cn("w-4 h-4 transition-transform", showMileageCalc && "rotate-90")} />
            </button>
            {showMileageCalc && (
              <div className="grid md:grid-cols-3 gap-3 max-w-4xl mx-auto">
                {mileageOptions.map(opt => (
                  <div key={opt.plan} className={cn("rounded-2xl p-4 border transition-all",
                    opt.included ? "border-emerald-500 bg-emerald-500/5" : "border-border/40 bg-card")}>
                    <h3 className="text-sm font-bold text-foreground mb-1">{opt.plan}</h3>
                    <p className="text-lg font-bold text-primary">{opt.miles}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{opt.extraCost}</p>
                    {opt.addOn && <Badge className="mt-2 bg-secondary text-foreground border-0 text-[9px]">{opt.addOn}</Badge>}
                    {opt.included && <Badge className="mt-2 bg-emerald-500/10 text-emerald-500 border-0 text-[9px]">Included</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Roadside Assistance */}
        <section className="py-8 border-b border-border/30">
          <div className="container mx-auto px-4">
            <button type="button" onClick={() => setShowRoadsideDetails(!showRoadsideDetails)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-all mb-4">
              <Truck className="w-5 h-5 text-foreground" /> 24/7 Roadside Assistance
              <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px]">Included</Badge>
              <ChevronRight className={cn("w-4 h-4 transition-transform", showRoadsideDetails && "rotate-90")} />
            </button>
            {showRoadsideDetails && (
              <div className="max-w-md mx-auto space-y-2">
                {roadsideFeatures.map(f => (
                  <div key={f.feature} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-xs font-bold text-foreground flex-1">{f.feature}</span>
                    {f.included ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Badge className="bg-secondary text-foreground border-0 text-[8px]">Premium only</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Car Reviews — hidden until real reviews exist */}
        {carReviews.length > 0 && (
        <section className="py-8 border-b border-border/30 bg-muted/10">
          <div className="container mx-auto px-4">
            <button type="button" onClick={() => setShowCarReviews(!showCarReviews)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-all mb-4">
              <Star className="w-5 h-5 text-amber-500" /> Renter Reviews
              <ChevronRight className={cn("w-4 h-4 transition-transform", showCarReviews && "rotate-90")} />
            </button>
            {showCarReviews && (
              <div className="max-w-3xl mx-auto space-y-3">
                {carReviews.map(review => (
                  <div key={review.name} className="rounded-2xl bg-card border border-border/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                          {review.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{review.name}</p>
                          <p className="text-[10px] text-muted-foreground">{review.car} · {review.date}</p>
                        </div>
                      </div>
                      <StarRating value={review.rating} size="xs" />
                    </div>
                    <p className="text-xs text-muted-foreground"><SafeCaption text={review.text} /></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        )}

        {/* === WAVE 4: Road Trip Intelligence === */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl space-y-4">
            <h2 className="text-xl font-bold text-foreground mb-4">🚗 Road Trip Intelligence</h2>

            {/* Fuel Calculator */}
            <button type="button" onClick={() => setShowFuelCalc(!showFuelCalc)} className="w-full flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
              <Fuel className="w-4 h-4 text-amber-500" /> Fuel Cost Estimator
              <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showFuelCalc && "rotate-90")} />
            </button>
            {showFuelCalc && (
              <div className="space-y-2 pt-2">
                {fuelEstimates.map(f => (
                  <div key={f.carType} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <div className="flex-1"><p className="text-xs font-bold text-foreground">{f.carType}</p><p className="text-[10px] text-muted-foreground">{f.distance} mi · {f.fuelType}</p></div>
                    <span className="text-sm font-bold text-emerald-500">{f.cost}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Toll Estimator */}
            <button type="button" onClick={() => setShowTollEstimator(!showTollEstimator)} className="w-full flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
              <DollarSign className="w-4 h-4 text-foreground" /> Toll Estimates
              <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showTollEstimator && "rotate-90")} />
            </button>
            {showTollEstimator && (
              <div className="space-y-2 pt-2">
                {tollEstimates.map(t => (
                  <div key={t.route} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <div className="flex-1"><p className="text-xs font-bold text-foreground">{t.route}</p><p className="text-[10px] text-muted-foreground">{t.bridges} bridge(s) · EZ-Pass: {t.ezPass}</p></div>
                    <span className="text-sm font-bold text-foreground">{t.tolls}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Parking Finder */}
            <button type="button" onClick={() => setShowParkingFinder(!showParkingFinder)} className="w-full flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
              <MapPin className="w-4 h-4 text-foreground" /> Airport Parking Options
              <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showParkingFinder && "rotate-90")} />
            </button>
            {showParkingFinder && (
              <div className="space-y-2 pt-2">
                {parkingOptions.map(p => (
                  <div key={p.location} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <div className="flex-1"><p className="text-xs font-bold text-foreground">{p.location}</p><p className="text-[10px] text-muted-foreground">{p.type} · {p.distance}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-foreground">{p.rate}</p>{p.reservable && <p className="text-[9px] text-emerald-500">Reservable</p>}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Road Trip Stops */}
            <button type="button" onClick={() => setShowRoadTripPlanner(!showRoadTripPlanner)} className="w-full flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
              <Car className="w-4 h-4 text-emerald-500" /> Road Trip Stop Guide
              <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showRoadTripPlanner && "rotate-90")} />
            </button>
            {showRoadTripPlanner && (
              <div className="space-y-2 pt-2">
                {roadTripStops.map(s => (
                  <div key={s.stop} className="rounded-xl bg-card border border-border/40 p-4">
                    <p className="text-xs font-bold text-foreground">{s.stop} <span className="text-muted-foreground font-normal">({s.interval})</span></p>
                    <div className="flex flex-wrap gap-1 mt-2">{s.amenities.map(a => <span key={a} className="px-2 py-0.5 rounded-full bg-muted/50 text-[10px] text-muted-foreground">{a}</span>)}</div>
                    <p className="text-xs text-amber-500 mt-2">💡 {s.tip}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Rental Tips */}
            <button type="button" onClick={() => setShowRentalTips(!showRentalTips)} className="w-full flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all">
              <Award className="w-4 h-4 text-amber-500" /> Pro Rental Tips
              <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[10px] ml-auto">Expert</Badge>
              <ChevronRight className={cn("w-4 h-4 transition-transform", showRentalTips && "rotate-90")} />
            </button>
            {showRentalTips && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {rentalTips.map(t => (
                  <div key={t.tip} className="flex items-start gap-2 p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-lg">{t.icon}</span>
                    <div><p className="text-xs text-foreground">{t.tip}</p><p className="text-[10px] text-emerald-500 font-bold">{t.category}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Discovery Sections (shown when no search) */}
        {!hasSearched && (
          <>
            <CarCategoryTiles onSelect={handleCategoryTileSelect} selectedCategory={null} />
            <SEOContentBlock serviceType="cars" className="bg-muted/5" />
            <DestinationCardsGrid service="cars" onSelect={handleLocationSelect} />
            <TrustFeatureCards columns={4} />
            <TrustSection service="cars" />
            <EnhanceYourTrip currentService="cars" destination={selectedAirport?.city || pickupDisplayValue} />
            <InternalLinkGrid currentService="cars" />
            <TravelFAQ serviceType="cars" className="bg-muted/20" />
          </>
        )}

        {/* Sticky CTA */}
        {hasSearched && (
          <CarStickyBookingCTA
            pickupLocation={selectedAirport?.code || pickupDisplayValue}
            pickupDate={pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined}
            returnDate={returnDate ? format(returnDate, "yyyy-MM-dd") : undefined}
            pickupTime={pickupTime}
            returnTime={returnTime}
            driverAge={parseInt(driverAge)}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default CarRentalBooking;
