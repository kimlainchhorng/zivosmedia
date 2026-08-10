import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import NativeBackButton from "@/components/shared/NativeBackButton";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowRight,
  Star,
  MapPin,
  Shield,
  CheckCircle,
  Crown,
  Zap,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Award,
  Truck,
  Key,
  Fuel,
  CheckCircle2,
  Sparkles,
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
import { searchAirports, type Airport } from "@/data/airports";
import { CAR_DISCLAIMERS } from "@/config/carCompliance";
import TravelPageFrame from "@/components/travel/TravelPageFrame";

const carCategories = [
  { name: "Economy", passengers: 4, bags: 2, priceFrom: 25, transmission: 'Automatic' as const, hasAC: true },
  { name: "Compact", passengers: 5, bags: 2, priceFrom: 30, transmission: 'Automatic' as const, hasAC: true },
  { name: "Midsize", passengers: 5, bags: 3, priceFrom: 38, transmission: 'Automatic' as const, hasAC: true },
  { name: "Full-size", passengers: 5, bags: 4, priceFrom: 42, transmission: 'Automatic' as const, hasAC: true },
  { name: "SUV", passengers: 7, bags: 4, priceFrom: 55, transmission: 'Automatic' as const, hasAC: true },
  { name: "Luxury", passengers: 5, bags: 3, priceFrom: 95, transmission: 'Automatic' as const, hasAC: true },
  { name: "Electric", passengers: 5, bags: 3, priceFrom: 65, transmission: 'Automatic' as const, hasAC: true },
];

// ─── Road Trip Intelligence data ──────────────────────────────────────────────
const fuelEstimates = [
  { carType: "Economy (32 mpg)", distance: 300, cost: "$33", fuelType: "Regular" },
  { carType: "Midsize (28 mpg)", distance: 300, cost: "$38", fuelType: "Regular" },
  { carType: "SUV (22 mpg)", distance: 300, cost: "$48", fuelType: "Regular" },
  { carType: "EV (3.5 mi/kWh)", distance: 300, cost: "$12", fuelType: "Electric" },
];

const tollEstimates = [
  { route: "NYC → Boston", tolls: "$18.50", ezPass: "$13.20" },
  { route: "LA → San Diego", tolls: "$6.00", ezPass: "$4.50" },
  { route: "Chicago → Detroit", tolls: "$12.00", ezPass: "$8.80" },
  { route: "Miami → Orlando", tolls: "$22.00", ezPass: "$16.50" },
];

const parkingOptions = [
  { location: "Airport Terminal Lot", rate: "$18/day", type: "Covered", distance: "0 min walk", reservable: true },
  { location: "Economy Lot A", rate: "$8/day", type: "Open air", distance: "5 min shuttle", reservable: true },
  { location: "Off-site Park N Fly", rate: "$6/day", type: "Covered", distance: "8 min shuttle", reservable: true },
  { location: "Hotel valet", rate: "$25/day", type: "Valet", distance: "At lobby", reservable: false },
];

const rentalTips = [
  { tip: "Book 3-6 weeks ahead for best rates", icon: CalendarDays, category: "Timing", color: "violet" },
  { tip: "Always photograph the car before driving off", icon: Shield, category: "Protection", color: "emerald" },
  { tip: "Check credit card for included rental insurance", icon: CheckCircle2, category: "Savings", color: "sky" },
  { tip: "Return with full tank to avoid $9+/gal refuel fees", icon: Fuel, category: "Savings", color: "amber" },
  { tip: "Decline GPS — use your phone instead", icon: MapPin, category: "Savings", color: "rose" },
  { tip: "Book at off-airport locations to save 20-30%", icon: DollarSign, category: "Savings", color: "emerald" },
];

const roadTripAccordion = [
  {
    id: "fuel",
    label: "Fuel Cost Estimator",
    icon: Fuel,
    iconColor: "text-amber-500",
    content: fuelEstimates.map(f => ({
      primary: f.carType,
      secondary: `${f.distance} mi · ${f.fuelType}`,
      value: f.cost,
      valueColor: "text-emerald-500",
    })),
  },
  {
    id: "tolls",
    label: "Toll Estimates by Route",
    icon: DollarSign,
    iconColor: "text-violet-500",
    content: tollEstimates.map(t => ({
      primary: t.route,
      secondary: `EZ-Pass: ${t.ezPass}`,
      value: t.tolls,
      valueColor: "text-foreground",
    })),
  },
  {
    id: "parking",
    label: "Airport Parking Options",
    icon: MapPin,
    iconColor: "text-sky-500",
    content: parkingOptions.map(p => ({
      primary: p.location,
      secondary: `${p.type} · ${p.distance}`,
      value: p.rate,
      valueColor: "text-foreground",
      badge: p.reservable ? "Reservable" : undefined,
    })),
  },
  {
    id: "tips",
    label: "Pro Rental Tips",
    icon: Award,
    iconColor: "text-amber-400",
    isTips: true,
  },
];

const inspectionItems = [
  { id: "exterior", label: "Exterior body", icon: Car },
  { id: "tires", label: "Tires & wheels", icon: CheckCircle2 },
  { id: "interior", label: "Interior condition", icon: Star },
  { id: "lights", label: "Lights & signals", icon: Zap },
  { id: "windshield", label: "Windshield", icon: Shield },
  { id: "fuel", label: "Fuel level", icon: Fuel },
];

const roadsideFeatures = [
  { feature: "Flat tire change", included: true },
  { feature: "Jump start", included: true },
  { feature: "Lockout service", included: true },
  { feature: "Fuel delivery", included: true },
  { feature: "Towing (up to 50 mi)", included: true },
  { feature: "Trip interruption coverage", included: false, premium: true },
];

const mileageOptions = [
  { plan: "Standard", miles: "200 mi/day", extraCost: "$0.25/mi over", included: true },
  { plan: "Extended", miles: "400 mi/day", extraCost: "$0.20/mi over", addOn: "+$8/day" },
  { plan: "Unlimited", miles: "Unlimited", extraCost: "No extra charges", addOn: "+$15/day" },
];

// ─── Accordion component ────────────────────────────────────────────────────
function AccordionItem({ label, icon: Icon, iconColor, open, onToggle, children }: {
  label: string; icon: React.ElementType; iconColor: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-4 text-left hover:opacity-80 transition-opacity touch-manipulation"
      >
        <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground/50 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle pill component ─────────────────────────────────────────────────
function TogglePill({ active, onToggle, icon: Icon, iconColor, label, sub }: {
  active: boolean; onToggle: () => void;
  icon: React.ElementType; iconColor: string;
  label: string; sub: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 min-w-[160px] w-full text-left transition-all touch-manipulation",
        active
          ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
          : "border-border/40 bg-card hover:border-border",
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
        active ? "bg-violet-500/20" : "bg-muted/40",
      )}>
        <Icon className={cn("w-4 h-4", active ? iconColor : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs font-bold truncate", active ? "text-foreground" : "text-muted-foreground")}>{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      <div className={cn(
        "w-9 h-5 rounded-full relative shrink-0 ml-auto transition-all",
        active ? "bg-violet-500" : "bg-muted/50",
      )}>
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
          active ? "left-[18px]" : "left-0.5",
        )} />
      </div>
    </motion.button>
  );
}

// ─── Protection card ─────────────────────────────────────────────────────────
const protectionTiers = [
  {
    id: "none" as const,
    name: "Decline",
    price: "$0",
    priceLabel: "per day",
    features: ["No coverage", "Responsible for all damage"],
    color: "muted",
  },
  {
    id: "basic" as const,
    name: "Basic",
    price: "$9",
    priceLabel: "per day",
    features: ["$2,500 deductible", "Liability coverage", "24/7 roadside"],
    color: "sky",
  },
  {
    id: "standard" as const,
    name: "Standard",
    price: "$19",
    priceLabel: "per day",
    features: ["$500 deductible", "Liability coverage", "24/7 roadside", "Lost key replacement"],
    badge: "Popular",
    color: "violet",
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "$35",
    priceLabel: "per day",
    features: ["$0 deductible", "Full liability", "24/7 concierge", "Lost key", "Tire & windshield"],
    badge: "Best Value",
    color: "amber",
    icon: Crown,
  },
];

// ─── Main component ──────────────────────────────────────────────────────────
const CarRentalBooking = () => {
  const navigate = useNavigate();

  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [pickupDisplayValue, setPickupDisplayValue] = useState("");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [driverAge, setDriverAge] = useState("25");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showElectricOnly, setShowElectricOnly] = useState(false);

  const [selectedProtection, setSelectedProtection] = useState<"none" | "basic" | "standard" | "premium">("standard");

  // Road Trip accordion state
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const toggleAccordion = (id: string) => setOpenAccordion(prev => prev === id ? null : id);

  // Pre-pickup accordion
  const [openPrePickup, setOpenPrePickup] = useState<string | null>(null);
  const togglePrePickup = (id: string) => setOpenPrePickup(prev => prev === id ? null : id);

  const handleAirportChange = (airport: Airport | null, displayValue: string) => {
    setSelectedAirport(airport);
    setPickupDisplayValue(displayValue);
  };

  const handleSearch = () => {
    const pickupCode = selectedAirport?.code || pickupDisplayValue.match(/\(([A-Z]{3})\)/)?.[1];
    if (!pickupCode || !pickupDate || !returnDate) return;
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

  // "View all car types" is the inverse of picking one: clear the filter and
  // run the same search, so the user lands on the full list rather than on a
  // button that appeared interactive and did nothing.
  const handleViewAllCategories = () => {
    setSelectedCategory(null);
    setHasSearched(true);
  };

  const handleCategoryTileSelect = (category: CarCategory) => {
    const categoryMap: Record<CarCategory, string> = {
      economy: "Economy", compact: "Compact", midsize: "Midsize",
      suv: "SUV", luxury: "Luxury", van: "Full-size", electric: "Electric",
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
      pickupTime, returnTime, driverAge: parseInt(driverAge),
    });
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const handleLocationSelect = (city: string) => {
    // Resolve the picked city to its top airport so the Search button enables
    // (mirrors handleAirportChange). Falls back to the bare city if unmatched.
    const match = searchAirports(city)[0];
    if (match) {
      setSelectedAirport(match);
      setPickupDisplayValue(`${match.city} (${match.code})`);
    } else {
      setPickupDisplayValue(city);
    }
  };

  const daysCount = pickupDate && returnDate
    ? Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;

  const timeOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ":00");

  return (
    <TravelPageFrame>
      <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
        <SEOHead
          title="ZIVO Car Rentals – Compare & Rent Cars Worldwide"
          description="Compare car rental prices from top providers worldwide. Find the best deals on economy, SUV, luxury and more. Book with trusted partners."
        />
      <OGImageMeta pageType="cars" />
      <Header />
      <NativeBackButton />

      <main className="pb-32 lg:pb-20">
        {/* Compliance banner */}
        <section className="border-b border-border py-2.5 bg-secondary">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {CAR_DISCLAIMERS.partnerBooking}
            </p>
          </div>
        </section>

        {/* ── Hero + Search ────────────────────────────────────────────── */}
        <ImageHero service="cars" icon={Car}>
          <BigSearchCard service="cars">
            <div className="space-y-4">
              {/* Pickup location */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Pickup Location</label>
                <AirportAutocomplete
                  value={pickupDisplayValue}
                  onChange={handleAirportChange}
                  placeholder="Airport or city (e.g., LAX, Miami)"
                />
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Pickup Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start text-sm font-medium">
                        <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                        {pickupDate ? format(pickupDate, "MMM d") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Return Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start text-sm font-medium">
                        <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                        {returnDate ? format(returnDate, "MMM d") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Times + age row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Pickup Time</label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger className="h-12">
                      <Clock className="w-4 h-4 mr-1.5 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Return Time</label>
                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="h-12">
                      <Clock className="w-4 h-4 mr-1.5 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Driver Age</label>
                  <Select value={driverAge} onValueChange={setDriverAge}>
                    <SelectTrigger className="h-12">
                      <User className="w-4 h-4 mr-1.5 shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21">21–24</SelectItem>
                      <SelectItem value="25">25–29</SelectItem>
                      <SelectItem value="30">30–64</SelectItem>
                      <SelectItem value="65">65+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={!selectedAirport && !pickupDisplayValue.match(/\([A-Z]{3}\)/)}
              size="lg"
              className="w-full h-14 font-bold text-base mt-6 transition-all active:scale-[0.98]"
            >
              <Search className="w-5 h-5 mr-2" />
              Search Cars
            </Button>
          </BigSearchCard>
        </ImageHero>

        {/* ── Search Results ─────────────────────────────────────────── */}
        {hasSearched && (
          <section className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">
                Car Rentals in {selectedAirport?.city || pickupDisplayValue}
              </h2>
              <p className="text-sm text-muted-foreground">
                {carCategories.length} categories • Compare across rental sites
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
                {carCategories.filter((category) => !showElectricOnly || category.name === "Electric").map((category) => (
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

            <div className="mt-6 p-4 rounded-2xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground text-center font-medium mb-1">
                {CAR_DISCLAIMERS.partnerBooking}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {CAR_DISCLAIMERS.price} {CAR_DISCLAIMERS.insurance}
              </p>
            </div>
          </section>
        )}

        {/* ── P2P Banner ─────────────────────────────────────────────── */}
        <P2PDiscoveryBanner city={selectedAirport?.city || pickupDisplayValue} />

        {/* ── Quick Filters ───────────────────────────────────────────── */}
        <section className="py-6 border-b border-border/30">
          <div className="container mx-auto px-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Quick Filters</h3>
            {/* Horizontal scroll on mobile, grid on md+ */}
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3">
              <div className="snap-start shrink-0 w-[200px] md:w-auto">
                <TogglePill
                  active={showElectricOnly}
                  onToggle={() => setShowElectricOnly(!showElectricOnly)}
                  icon={Fuel}
                  iconColor="text-emerald-400"
                  label="Electric Only"
                  sub="Tesla, Rivian, Lucid & more"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Long-Term Savings ────────────────────────────────────────── */}
        <section className="py-5 border-b border-border/30">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Long-Term Discounts</p>
                  <p className="text-xs text-muted-foreground">Save up to 40% on extended rentals</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                {[["3+ days", "10% off"], ["7+ days", "25% off"], ["30+ days", "40% off"]].map(([days, off]) => (
                  <span key={days} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {days} · {off}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Trip Protection Plans ─────────────────────────────────────── */}
        <section className="py-10 border-b border-border/30">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-violet-500" />
                <h2 className="text-xl font-extrabold tracking-tight">Trip Protection</h2>
              </div>
              <p className="text-sm text-muted-foreground">Pick your coverage level — change anytime before pickup</p>
            </div>

            {/* Horizontal scroll on mobile, 4-col on md+ */}
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4">
              {protectionTiers.map((tier) => {
                const isSelected = selectedProtection === tier.id;
                const colorMap: Record<string, string> = {
                  muted: "border-border/40 bg-card",
                  sky: "border-sky-500/40 bg-sky-500/5",
                  violet: "border-violet-500/50 bg-violet-500/8",
                  amber: "border-amber-500/50 bg-amber-500/8",
                };
                const selectedBorder: Record<string, string> = {
                  muted: "border-foreground shadow-lg",
                  sky: "border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.2)]",
                  violet: "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.2)]",
                  amber: "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                };

                return (
                  <motion.button
                    type="button"
                    key={tier.id}
                    onClick={() => setSelectedProtection(tier.id)}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "snap-start shrink-0 w-[148px] md:w-auto rounded-xl p-3 text-left relative border transition-all touch-manipulation",
                      isSelected ? selectedBorder[tier.color] : colorMap[tier.color],
                    )}
                  >
                    {tier.badge && (
                      <span className={cn(
                        "absolute -top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full",
                        tier.color === "amber" ? "bg-amber-500 text-white" : "bg-violet-500 text-white",
                      )}>
                        {tier.badge}
                      </span>
                    )}

                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">{tier.name}</p>
                        <p className="text-xl font-extrabold text-foreground leading-none mt-0.5">{tier.price}</p>
                        <p className="text-[9px] text-muted-foreground">{tier.priceLabel}</p>
                      </div>
                      {tier.icon && <tier.icon className="w-4 h-4 text-amber-400 opacity-60 shrink-0" />}
                    </div>

                    <ul className="space-y-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-1 text-[10px] text-muted-foreground leading-tight">
                          <CheckCircle className={cn("w-2.5 h-2.5 mt-0.5 shrink-0", tier.id === "none" ? "text-muted-foreground/30" : "text-emerald-500")} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isSelected && (
                      <motion.div
                        layoutId="protection-check"
                        className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-background" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pre-Pickup Checklist + Mileage + Roadside ─────────────── */}
        <section className="py-8 border-b border-border/30">
          <div className="container mx-auto px-4 max-w-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Before You Drive</h3>

            <AccordionItem
              label="Pre-Pickup Inspection Checklist"
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              open={openPrePickup === "inspection"}
              onToggle={() => togglePrePickup("inspection")}
            >
              <div className="space-y-2">
                {inspectionItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/40">
                    <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground flex-1">{item.label}</span>
                    <div className="w-5 h-5 rounded border-2 border-border/50" />
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-1">Take photos before and after for damage protection</p>
              </div>
            </AccordionItem>

            <AccordionItem
              label="Mileage Plans"
              icon={Car}
              iconColor="text-violet-400"
              open={openPrePickup === "mileage"}
              onToggle={() => togglePrePickup("mileage")}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mileageOptions.map((opt) => (
                  <div key={opt.plan} className={cn(
                    "rounded-xl p-4 border",
                    opt.included ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40 bg-card",
                  )}>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground/70">{opt.plan}</p>
                    <p className="text-lg font-extrabold text-foreground mt-1">{opt.miles}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.extraCost}</p>
                    {opt.addOn && <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{opt.addOn}</span>}
                    {opt.included && <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Included</span>}
                  </div>
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              label="24/7 Roadside Assistance"
              icon={Truck}
              iconColor="text-sky-500"
              open={openPrePickup === "roadside"}
              onToggle={() => togglePrePickup("roadside")}
            >
              <div className="space-y-2">
                {roadsideFeatures.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/40">
                    <span className="text-xs font-semibold text-foreground flex-1">{f.feature}</span>
                    {f.included ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 shrink-0">Premium</span>
                    )}
                  </div>
                ))}
              </div>
            </AccordionItem>
          </div>
        </section>

        {/* ── Road Trip Intelligence ────────────────────────────────────── */}
        <section className="py-10 bg-muted/20">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h2 className="text-xl font-extrabold tracking-tight">Road Trip Intelligence</h2>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {roadTripAccordion.map((item) => (
                <AccordionItem
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  open={openAccordion === item.id}
                  onToggle={() => toggleAccordion(item.id)}
                >
                  {item.isTips ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                      {rentalTips.map((t) => (
                        <div key={t.tip} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div className="w-7 h-7 rounded-lg bg-card border border-border/50 flex items-center justify-center shrink-0">
                            <t.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground leading-snug">{t.tip}</p>
                            <p className="text-[10px] text-emerald-500 font-bold mt-0.5">{t.category}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 px-1">
                      {(item.content ?? []).map((row: any) => (
                        <div key={row.primary} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{row.primary}</p>
                            <p className="text-[10px] text-muted-foreground">{row.secondary}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-sm font-extrabold", row.valueColor)}>{row.value}</p>
                            {row.badge && <p className="text-[9px] text-emerald-500 font-bold">{row.badge}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionItem>
              ))}
            </div>
          </div>
        </section>

        {/* ── Discovery Sections ────────────────────────────────────── */}
        {!hasSearched && (
          <>
            <CarCategoryTiles onSelect={handleCategoryTileSelect} onViewAll={handleViewAllCategories} selectedCategory={null} />
            <SEOContentBlock serviceType="cars" className="bg-muted/5" />
            <DestinationCardsGrid service="cars" onSelect={handleLocationSelect} />
            <TrustFeatureCards columns={4} />
            <TrustSection service="cars" />
            <EnhanceYourTrip currentService="cars" destination={selectedAirport?.city || pickupDisplayValue} />
            <InternalLinkGrid currentService="cars" />
            <TravelFAQ serviceType="cars" className="bg-muted/20" />
          </>
        )}

        {/* ── Sticky CTA ──────────────────────────────────────────────── */}
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
    </TravelPageFrame>
  );
};

export default CarRentalBooking;
