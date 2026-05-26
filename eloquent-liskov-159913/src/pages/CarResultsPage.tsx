/**
 * Car Rental Results Page - Production Ready
 * Premium, enterprise-grade travel booking UI
 * Always-visible pricing with clean card-based layout
 * Legally compliant with partner disclosures
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AlertCircle, ExternalLink, ShieldCheck, SlidersHorizontal, RotateCcw, Car } from "lucide-react";
// DriverCrossSell removed
import P2PResultsCrossSell from "@/components/car/P2PResultsCrossSell";
import { differenceInDays, format, parseISO } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StickySearchSummary,
  FiltersSheet,
  RampCarCard,
  RampResultsLayout,
  RampResultsHeader,
  RampGlobalDisclaimer,
  RampIndicativeNotice,
  ResultsBreadcrumbs,
  ResultsFAQ,
  CarEditSearchForm,
  CarPartnerTrustStrip,
  CarResultsSkeleton,
  type RampCarCardData,
} from "@/components/results";
import { useRealCarSearch, type CarResult } from "@/hooks/useRealCarSearch";
import { getAirportByCode } from "@/components/car/AirportAutocomplete";
import { trackAffiliateClick } from "@/lib/affiliateTracking";
import { CAR_DISCLAIMERS } from "@/config/carCompliance";

// Parse and validate URL parameters
interface ParsedSearchParams {
  pickupCode: string;
  pickupLabel: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: number;
  isValid: boolean;
  errors: string[];
}

function parseSearchParams(searchParams: URLSearchParams): ParsedSearchParams {
  const errors: string[] = [];

  const pickupCode = (searchParams.get("pickup") || "").toUpperCase();
  const airport = getAirportByCode(pickupCode);
  const pickupLabel = airport ? `${airport.city} (${airport.code})` : pickupCode;

  if (!pickupCode || pickupCode.length !== 3) errors.push("Invalid pickup location code");

  const pickupDate = searchParams.get("pickup_date") || "";
  const dropoffDate = searchParams.get("dropoff_date") || "";

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(pickupDate)) errors.push("Invalid pickup date format");
  if (!dateRegex.test(dropoffDate)) errors.push("Invalid dropoff date format");

  if (pickupDate && dropoffDate) {
    if (new Date(dropoffDate) < new Date(pickupDate)) {
      errors.push("Dropoff date must be after pickup date");
    }
  }

  const pickupTime = searchParams.get("pickup_time") || "10:00";
  const dropoffTime = searchParams.get("dropoff_time") || "10:00";

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(pickupTime)) errors.push("Invalid pickup time format");
  if (!timeRegex.test(dropoffTime)) errors.push("Invalid dropoff time format");

  const driverAge = parseInt(searchParams.get("age") || "25", 10);
  if (isNaN(driverAge) || driverAge < 18 || driverAge > 99) {
    errors.push("Driver age must be between 18 and 99");
  }

  return {
    pickupCode,
    pickupLabel,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    driverAge: isNaN(driverAge) ? 25 : Math.min(99, Math.max(18, driverAge)),
    isValid: errors.length === 0,
    errors,
  };
}

// Filter state
interface CarFilters {
  maxPrice: number;
  categories: string[];
  transmission: string[];
}

const defaultFilters: CarFilters = {
  maxPrice: 500,
  categories: [],
  transmission: [],
};

// Sort options
type SortOption = "lowest" | "highest" | "best";

export default function CarResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<CarFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("lowest");

  const { isLoading, results, search, getPartners } = useRealCarSearch();

  const parsed = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const { pickupCode, pickupLabel, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge, isValid, errors } = parsed;

  const days = useMemo(() => {
    if (!pickupDate || !dropoffDate) return 0;
    try {
      return Math.max(1, differenceInDays(parseISO(dropoffDate), parseISO(pickupDate)));
    } catch {
      return 0;
    }
  }, [pickupDate, dropoffDate]);

  useEffect(() => {
    if (isValid && pickupCode && pickupDate && dropoffDate) {
      search({
        pickupCode,
        pickupLabel,
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        driverAge,
      });
    }
  }, [pickupCode, pickupLabel, pickupDate, pickupTime, dropoffDate, dropoffTime, driverAge, isValid]);

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let filtered = results.filter((car) => car.pricePerDay <= filters.maxPrice);

    if (filters.categories.length > 0) {
      filtered = filtered.filter((car) =>
        filters.categories.some((cat) => car.category.toLowerCase().includes(cat.toLowerCase()))
      );
    }

    if (filters.transmission.length > 0) {
      filtered = filtered.filter((car) => filters.transmission.includes(car.transmission));
    }

    // Sort based on selected option
    switch (sortBy) {
      case "highest":
        return filtered.sort((a, b) => b.pricePerDay - a.pricePerDay);
      case "best":
        // Best deal = combines price + features (has free cancellation, unlimited mileage)
        return filtered.sort((a, b) => {
          const aScore = a.pricePerDay - (a.features.length * 5);
          const bScore = b.pricePerDay - (b.features.length * 5);
          return aScore - bScore;
        });
      case "lowest":
      default:
        return filtered.sort((a, b) => a.pricePerDay - b.pricePerDay);
    }
  }, [results, filters, sortBy]);

  // Find best deal for badge
  const bestDealId = useMemo(() => {
    if (filteredResults.length === 0) return null;
    const sorted = [...filteredResults].sort((a, b) => {
      const aScore = a.pricePerDay - (a.features.length * 5);
      const bScore = b.pricePerDay - (b.features.length * 5);
      return aScore - bScore;
    });
    return sorted[0]?.id;
  }, [filteredResults]);

  // Convert to Ramp card format
  const carCards: RampCarCardData[] = filteredResults.map((car: CarResult) => ({
    id: car.id,
    category: car.category,
    company: car.company,
    seats: car.seats,
    bags: car.bags,
    transmission: car.transmission as "Automatic" | "Manual",
    hasAC: car.hasAC,
    pricePerDay: car.pricePerDay,
    totalPrice: car.totalPrice,
    days,
    features: car.features,
    mileage: car.mileage,
    freeCancellation: car.features.some((f) => f.toLowerCase().includes("cancel")),
    theftProtection: car.features.some((f) => f.toLowerCase().includes("theft") || f.toLowerCase().includes("protection")),
    isBestDeal: car.id === bestDealId,
  }));

  const handleViewDeal = (car: RampCarCardData) => {
    const outParams = new URLSearchParams({
      pickup: pickupCode,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      dropoff_date: dropoffDate,
      dropoff_time: dropoffTime,
      age: String(driverAge),
      carId: car.id,
      category: car.category,
      price: String(car.pricePerDay),
      partner: "economybookings",
      product: "cars",
      source: "result_card",
    });

    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    const creator = searchParams.get("creator");

    if (utmSource) outParams.set("utm_source", utmSource);
    if (utmCampaign) outParams.set("utm_campaign", utmCampaign);
    if (creator) outParams.set("creator", creator);

    trackAffiliateClick({
      flightId: car.id,
      airline: car.company,
      airlineCode: "CAR",
      origin: pickupCode,
      destination: pickupCode,
      price: car.pricePerDay,
      passengers: 1,
      cabinClass: "standard",
      affiliatePartner: "economybookings",
      referralUrl: `/out?${outParams.toString()}`,
      source: "car_result_card",
      ctaType: "result_card",
      serviceType: "car_rental",
    });

    import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(`/out?${outParams.toString()}`));
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const airport = getAirportByCode(pickupCode);
  const locationName = airport?.city || pickupCode;

  const activeFilterCount = filters.categories.length + filters.transmission.length + (filters.maxPrice < 500 ? 1 : 0);

  const resetFilters = () => setFilters(defaultFilters);

  const pageTitle = locationName
    ? `Car Rentals in ${locationName} | From $${carCards[0]?.pricePerDay || 25}/day | ZIVO`
    : "Car Rental Search Results | ZIVO";

  const pageDescription = locationName
    ? `Compare ${results.length}+ car rental options in ${locationName}. ${pickupDate && dropoffDate ? `${days} days, ${formatDisplayDate(pickupDate)} - ${formatDisplayDate(dropoffDate)}.` : ""} Book securely on partner sites.`
    : "Search and compare car rental prices across booking sites.";

  // Filters UI Component
  const FiltersContent = () => (
    <div className="space-y-8">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-4 block">
          Max Price: ${filters.maxPrice}/day
        </Label>
        <Slider
          value={[filters.maxPrice]}
          onValueChange={(v) => setFilters((f) => ({ ...f, maxPrice: v[0] }))}
          min={20}
          max={500}
          step={10}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>$20</span>
          <span>$500</span>
        </div>
      </div>

      {/* Car Categories */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-4 block">Car Category</Label>
        <div className="space-y-3">
          {["Economy", "Compact", "Midsize", "SUV", "Luxury"].map((cat) => (
            <label key={cat} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.categories.includes(cat)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters((f) => ({ ...f, categories: [...f.categories, cat] }));
                  } else {
                    setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== cat) }));
                  }
                }}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-4 block">Transmission</Label>
        <div className="space-y-3">
          {["Automatic", "Manual"].map((trans) => (
            <label key={trans} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.transmission.includes(trans)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters((f) => ({ ...f, transmission: [...f.transmission, trans] }));
                  } else {
                    setFilters((f) => ({ ...f, transmission: f.transmission.filter((t) => t !== trans) }));
                  }
                }}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{trans}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Filters Button - Always visible when filters active */}
      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="w-full gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );

  // Sort dropdown with required options
  const SortDropdown = () => (
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
      <SelectTrigger className="w-[160px] bg-card border-border/60">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="lowest">Lowest Price</SelectItem>
        <SelectItem value="highest">Highest Price</SelectItem>
        <SelectItem value="best">Best Deal</SelectItem>
      </SelectContent>
    </Select>
  );

  // Mobile filter trigger
  const MobileFilterTrigger = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowFilters(true)}
      className="gap-2"
    >
      <SlidersHorizontal className="w-4 h-4" />
      Filters
      {activeFilterCount > 0 && (
        <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={pageTitle} description={pageDescription} />
      <Header />

      <main className="pt-16">
        {/* Global Disclaimer Banner - TOP */}
        <section className="border-b border-border/40 py-3 bg-muted/30">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              {CAR_DISCLAIMERS.partnerBooking}
            </p>
          </div>
        </section>

        {/* Breadcrumbs */}
        <ResultsBreadcrumbs service="cars" />

        {/* Sticky Search Summary */}
        <StickySearchSummary
          service="cars"
          backLink="/rent-car"
          title={
            <>
              Car Rentals in <span className="text-primary">{locationName}</span>
            </>
          }
          badges={[
            { label: `${formatDisplayDate(pickupDate)} – ${formatDisplayDate(dropoffDate)} (${days} day${days !== 1 ? "s" : ""})` },
          ]}
          searchForm={
            <CarEditSearchForm
              onSearch={(params) => setSearchParams(params)}
              onCancel={() => { /* form is always visible — nothing to cancel */ }}
            />
          }
        />

        {/* Partner Trust Strip */}
        <CarPartnerTrustStrip />

        {/* Validation Errors */}
        {!isValid && (
          <section className="py-8">
            <div className="container mx-auto px-4">
              <Alert variant="destructive" className="max-w-2xl mx-auto rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Invalid search parameters:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <Link to="/rent-car" className="text-primary underline mt-2 inline-block">
                    Start a new search →
                  </Link>
                </AlertDescription>
              </Alert>
            </div>
          </section>
        )}

        {/* Results Section */}
        {isValid && (
          <section className="py-8">
            <div className="container mx-auto px-4">
              <RampResultsLayout filters={<FiltersContent />}>
                {/* Results Header - "X cars found" */}
                <RampResultsHeader
                  count={carCards.length}
                  itemName="car"
                  isLoading={isLoading}
                  filterTrigger={<MobileFilterTrigger />}
                  sortElement={<SortDropdown />}
                />

                {/* Indicative Price Notice */}
                {!isLoading && carCards.length > 0 && (
                  <RampIndicativeNotice className="mb-6" />
                )}

                {/* Loading State - Skeleton Cards */}
                {isLoading && <CarResultsSkeleton count={5} />}

                {/* Results Grid */}
                {!isLoading && carCards.length > 0 && (
                  <div className="space-y-4 stagger-results">
                    {carCards.map((car) => (
                      <RampCarCard key={car.id} car={car} onViewDeal={handleViewDeal} />
                    ))}
                  </div>
                )}

                {/* Empty State - No cars match filters */}
                {!isLoading && carCards.length === 0 && results.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)]">
                    <EmptyState
                      icon={SlidersHorizontal}
                      tone="muted"
                      title="No cars match your filters"
                      description="Try adjusting price or category to see more options."
                      action={
                        <Button onClick={resetFilters} variant="outline" className="gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Reset Filters
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* Empty State - No results at all */}
                {!isLoading && results.length === 0 && (
                  <div className="bg-card rounded-2xl border border-border/60 shadow-[var(--shadow-card)] p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Car className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Searching partner inventory...</h3>
                    <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                      Estimated prices shown while we compare live partner availability.
                    </p>
                    <Button
                      onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(getPartners()[0]?.trackingUrl))}
                      className="gap-2"
                    >
                      Search on EconomyBookings
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Global Disclosure - Bottom */}
                {carCards.length > 0 && !isLoading && (
                  <RampGlobalDisclaimer className="mt-8" />
                )}
              </RampResultsLayout>
            </div>
          </section>
        )}

        {/* P2P Cross-Sell */}
        <section className="container mx-auto px-4 py-8 max-w-4xl">
          <P2PResultsCrossSell city={locationName} />
        </section>

        {/* Cross-sell removed */}

        {/* FAQ Section */}
        <ResultsFAQ service="cars" />
      </main>

      {/* Mobile Filters Sheet */}
      <FiltersSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        onApply={() => setShowFilters(false)}
        onReset={resetFilters}
        hasActiveFilters={activeFilterCount > 0}
        service="cars"
      >
        <FiltersContent />
      </FiltersSheet>

      <Footer />
    </div>
  );
}
