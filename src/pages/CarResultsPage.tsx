/**
 * Car Rental Results Page - Production Ready
 * Premium, enterprise-grade travel booking UI
 * Always-visible pricing with clean card-based layout
 * Legally compliant with partner disclosures
 */

import { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Car,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
// DriverCrossSell removed
import P2PResultsCrossSell from "@/components/car/P2PResultsCrossSell";
import { differenceInDays, format, parseISO } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import AdSenseUnit from "@/components/ads/AdSenseUnit";
import { AD_SLOTS } from "@/config/adSlots";
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
  EditSearchModal,
  CarPartnerTrustStrip,
  CarResultsSkeleton,
  useEditSearchModal,
  type RampCarCardData,
} from "@/components/results";
import { useRealCarSearch, type CarResult } from "@/hooks/useRealCarSearch";
import { getAirportByCode } from "@/components/car/AirportAutocomplete";
import { trackAffiliateClick } from "@/lib/affiliateTracking";
import { buildOutRedirectUrl } from "@/lib/partnerDeepLinks";
import { CAR_DISCLAIMERS } from "@/config/carCompliance";
import type { AffiliatePartner } from "@/config/affiliateLinks";
import TravelPageFrame from "@/components/travel/TravelPageFrame";
import AppLayout from "@/components/app/AppLayout";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";

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
  const pickupLabel = airport
    ? `${airport.city} (${airport.code})`
    : pickupCode;

  if (!pickupCode || pickupCode.length !== 3)
    errors.push("Invalid pickup location code");

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<CarFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("lowest");
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost();
  const {
    open: showEditSearch,
    setOpen: setShowEditSearch,
    isUpdating: isUpdatingSearch,
    handleUpdate: handleEditSearch,
  } = useEditSearchModal("cars");

  const { isLoading, results, search, getPartners } = useRealCarSearch();
  const activePartners = useMemo(() => getPartners(), [getPartners]);

  const parsed = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const {
    pickupCode,
    pickupLabel,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    driverAge,
    isValid,
    errors,
  } = parsed;

  const days = useMemo(() => {
    if (!pickupDate || !dropoffDate) return 0;
    try {
      return Math.max(
        1,
        differenceInDays(parseISO(dropoffDate), parseISO(pickupDate)),
      );
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
  }, [
    pickupCode,
    pickupLabel,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    driverAge,
    isValid,
    search,
  ]);

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let filtered = results.filter((car) => car.pricePerDay <= filters.maxPrice);

    if (filters.categories.length > 0) {
      filtered = filtered.filter((car) =>
        filters.categories.some((cat) =>
          car.category.toLowerCase().includes(cat.toLowerCase()),
        ),
      );
    }

    if (filters.transmission.length > 0) {
      filtered = filtered.filter((car) =>
        filters.transmission.includes(car.transmission),
      );
    }

    // Sort based on selected option
    switch (sortBy) {
      case "highest":
        return filtered.sort((a, b) => b.pricePerDay - a.pricePerDay);
      case "best":
        // Best deal = combines price + features (has free cancellation, unlimited mileage)
        return filtered.sort((a, b) => {
          const aScore = a.pricePerDay - a.features.length * 5;
          const bScore = b.pricePerDay - b.features.length * 5;
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
      const aScore = a.pricePerDay - a.features.length * 5;
      const bScore = b.pricePerDay - b.features.length * 5;
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
    freeCancellation: car.features.some((f) =>
      f.toLowerCase().includes("cancel"),
    ),
    theftProtection: car.features.some(
      (f) =>
        f.toLowerCase().includes("theft") ||
        f.toLowerCase().includes("protection"),
    ),
    isBestDeal: car.id === bestDealId,
  }));

  const handleViewDeal = (car: RampCarCardData) => {
    const primaryPartner = activePartners[0];
    if (!primaryPartner) return;

    const outboundUrl = buildOutRedirectUrl(
      primaryPartner.id,
      primaryPartner.name,
      "cars",
      "car-result-card",
      primaryPartner.trackingUrl,
      {
        pickup: pickupCode,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        dropoff_date: dropoffDate,
        dropoff_time: dropoffTime,
        age: String(driverAge),
        carId: car.id,
        category: car.category,
        price: String(car.pricePerDay),
      },
    );

    trackAffiliateClick({
      flightId: car.id,
      airline: car.company,
      airlineCode: "CAR",
      origin: pickupCode,
      destination: pickupCode,
      price: car.pricePerDay,
      passengers: 1,
      cabinClass: "standard",
      affiliatePartner: primaryPartner.id,
      referralUrl: outboundUrl,
      source: "car_result_card",
      ctaType: "result_card",
      serviceType: "car_rental",
    });

    navigate(outboundUrl);
  };

  const handleOpenPartner = (partner: AffiliatePartner) => {
    const extraParams: Record<string, string> = {
      pickup: pickupCode,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      dropoff_date: dropoffDate,
      dropoff_time: dropoffTime,
      age: String(driverAge),
    };

    for (const key of ["utm_source", "utm_campaign", "creator"] as const) {
      const value = searchParams.get(key);
      if (value) extraParams[key] = value;
    }

    const outboundUrl = buildOutRedirectUrl(
      partner.id,
      partner.name,
      "cars",
      "car-results-provider-handoff",
      partner.trackingUrl,
      extraParams,
    );

    navigate(outboundUrl);
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

  const activeFilterCount =
    filters.categories.length +
    filters.transmission.length +
    (filters.maxPrice < 500 ? 1 : 0);

  const resetFilters = () => setFilters(defaultFilters);

  const handleBack = () => {
    const historyIndex =
      typeof window !== "undefined" ? window.history.state?.idx : null;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/car-rental", { replace: true });
  };

  const pageTitle = locationName
    ? `Car Rentals in ${locationName} | Check Live Provider Availability | ZIVO`
    : "Car Rental Provider Search | ZIVO";

  const pageDescription = locationName
    ? `Check current car rental availability in ${locationName} on ZIVO's configured rental partners. Vehicle availability, rental terms, and final price are confirmed on the partner site.`
    : "Choose a configured rental partner to check current vehicle availability, terms, and final price.";

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
        <Label className="text-sm font-semibold text-foreground mb-4 block">
          Car Category
        </Label>
        <div className="space-y-3">
          {["Economy", "Compact", "Midsize", "SUV", "Luxury"].map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={filters.categories.includes(cat)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters((f) => ({
                      ...f,
                      categories: [...f.categories, cat],
                    }));
                  } else {
                    setFilters((f) => ({
                      ...f,
                      categories: f.categories.filter((c) => c !== cat),
                    }));
                  }
                }}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <Label className="text-sm font-semibold text-foreground mb-4 block">
          Transmission
        </Label>
        <div className="space-y-3">
          {["Automatic", "Manual"].map((trans) => (
            <label
              key={trans}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={filters.transmission.includes(trans)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters((f) => ({
                      ...f,
                      transmission: [...f.transmission, trans],
                    }));
                  } else {
                    setFilters((f) => ({
                      ...f,
                      transmission: f.transmission.filter((t) => t !== trans),
                    }));
                  }
                }}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {trans}
              </span>
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
        <span className="bg-ig-gradient text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {activeFilterCount}
        </span>
      )}
    </Button>
  );

  const PartnerHandoffPanel = ({ appShell }: { appShell: boolean }) => (
    <div
      data-car-provider-handoff
      className={`overflow-hidden rounded-[24px] border shadow-sm ${
        appShell
          ? "border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-card"
          : "border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-card to-card"
      }`}
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              appShell
                ? "bg-violet-500/15 text-violet-600"
                : "bg-sky-500/15 text-sky-600"
            }`}
          >
            <Car className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Live provider check
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Check live rental availability
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              ZIVO does not receive live car inventory or prices on this screen.
              Choose a rental partner. ZIVO shows a confirmation screen before
              you open the partner site to see current vehicles, exact terms,
              and the final price.
            </p>
          </div>
        </div>

        <div
          data-car-search-details
          role="group"
          aria-label="Rental search details"
          className="mt-5 flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground/85"
        >
          <span className="inline-flex items-center gap-2">
            <MapPin
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Pickup location: </span>
            {locationName}
          </span>
          <span className="inline-flex items-center gap-2">
            <CalendarDays
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Rental dates: </span>
            {formatDisplayDate(pickupDate)} – {formatDisplayDate(dropoffDate)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            Pickup {pickupTime} · Return {dropoffTime}
          </span>
          <span className="inline-flex items-center gap-2">
            <UserRound
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            Driver age {driverAge}
          </span>
        </div>

        {activePartners.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {activePartners.map((partner) => (
              <Button
                key={partner.id}
                type="button"
                variant="outline"
                onClick={() => handleOpenPartner(partner)}
                aria-label={`Continue to ZIVO confirmation before opening ${partner.name}`}
                className="h-auto min-h-12 justify-between gap-3 whitespace-normal rounded-xl bg-background/85 px-4 py-3 text-left leading-tight active:scale-[0.98]"
              >
                <span>Continue with {partner.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Button>
            ))}
          </div>
        ) : (
          <Alert className="mt-5 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Rental partner links are unavailable right now. Please try again
              later.
            </AlertDescription>
          </Alert>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Next, ZIVO shows a confirmation screen. The partner then confirms
          availability, rental terms, and final price before booking. ZIVO may
          earn a commission at no extra cost to you.
        </p>
      </div>
    </div>
  );

  const renderResultsPanel = (appShell: boolean) => {
    if (isLoading) return <CarResultsSkeleton count={5} />;
    if (results.length === 0) {
      return <PartnerHandoffPanel appShell={appShell} />;
    }

    return (
      <>
        {/* Results Header - "X cars found" */}
        <RampResultsHeader
          count={carCards.length}
          itemName="car"
          isLoading={isLoading}
          filterTrigger={<MobileFilterTrigger />}
          sortElement={<SortDropdown />}
        />

        {/* Indicative Price Notice */}
        {!isLoading &&
          carCards.length > 0 &&
          (appShell ? (
            <div
              data-car-results-price-notice
              className="mb-5 rounded-2xl border border-violet-500/15 bg-violet-500/5 px-4 py-3"
            >
              <p className="text-sm leading-relaxed text-foreground/85">
                <span className="font-semibold text-foreground">
                  Compare indicative prices.
                </span>{" "}
                <span>
                  Final availability and price are confirmed on the
                  provider&apos;s
                </span>{" "}
                secure booking page.
              </p>
            </div>
          ) : (
            <RampIndicativeNotice className="mb-6" />
          ))}

        {/* Results Grid */}
        {!isLoading && carCards.length > 0 && (
          <div className="space-y-4 stagger-results">
            {carCards.map((car, index) => (
              <Fragment key={car.id}>
                <RampCarCard
                  car={car}
                  onViewDeal={handleViewDeal}
                  className={
                    appShell
                      ? "[&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal [&_button]:py-2 [&_button]:leading-tight"
                      : undefined
                  }
                />
                {/* In-feed ad after the 3rd result — renders nothing until AD_SLOTS.searchResults + publisher id are set */}
                {index === 2 && <AdSenseUnit slot={AD_SLOTS.searchResults} />}
              </Fragment>
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
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filters
                </Button>
              }
            />
          </div>
        )}

        {/* Global Disclosure - Bottom */}
        {carCards.length > 0 && !isLoading && (
          <RampGlobalDisclaimer className="mt-8" />
        )}
      </>
    );
  };

  if (!isTravelHost) {
    return (
      <>
        <SEOHead title={pageTitle} description={pageDescription} />

        <div data-car-results-app-shell className="lg:[&>div>header]:hidden">
          <AppLayout
            title="Rental Cars"
            showBack
            onBack={handleBack}
            className="bg-muted/20 lg:!pt-[88px]"
          >
            <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-6">
              <section
                aria-labelledby="car-results-title"
                className="rounded-[24px] border border-border/60 bg-gradient-to-br from-violet-500/10 via-card to-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationName}
                    </div>
                    <h1
                      id="car-results-title"
                      className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                    >
                      Rental cars in {locationName}
                    </h1>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>
                        {formatDisplayDate(pickupDate)} –{" "}
                        {formatDisplayDate(dropoffDate)} · {days} day
                        {days !== 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditSearch(true)}
                    aria-label="Modify rental search"
                    className="min-h-11 min-w-11 shrink-0 gap-2 rounded-xl bg-background/80 px-3 active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Modify</span>
                  </Button>
                </div>

                <div className="mt-4 flex items-start gap-2 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <p>{CAR_DISCLAIMERS.partnerBooking}</p>
                </div>
              </section>

              {!isValid && (
                <section className="py-6">
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">
                        Invalid search parameters:
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                      <Link
                        to="/car-rental"
                        className="text-primary underline mt-2 inline-block"
                      >
                        Start a new search →
                      </Link>
                    </AlertDescription>
                  </Alert>
                </section>
              )}

              {isValid && (
                <section aria-label="Rental car results" className="mt-5">
                  <div className="flex gap-8">
                    {!isLoading && results.length > 0 && (
                      <aside className="hidden w-72 shrink-0 lg:block">
                        <div className="sticky top-28 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                          <FiltersContent />
                        </div>
                      </aside>
                    )}
                    <div className="min-w-0 flex-1">
                      {renderResultsPanel(true)}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </AppLayout>
        </div>

        <EditSearchModal
          service="cars"
          open={showEditSearch}
          onOpenChange={setShowEditSearch}
        >
          <CarEditSearchForm
            onSearch={handleEditSearch}
            onCancel={() => setShowEditSearch(false)}
            isUpdating={isUpdatingSearch}
          />
        </EditSearchModal>

        {results.length > 0 && (
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
        )}
      </>
    );
  }

  return (
    <TravelPageFrame>
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
                Car Rentals in{" "}
                <span className="text-primary">{locationName}</span>
              </>
            }
            badges={[
              {
                label: `${formatDisplayDate(pickupDate)} – ${formatDisplayDate(dropoffDate)} (${days} day${days !== 1 ? "s" : ""})`,
              },
            ]}
            searchForm={
              <CarEditSearchForm
                onSearch={(params) => setSearchParams(params)}
                onCancel={() => {
                  /* form is always visible — nothing to cancel */
                }}
              />
            }
          />

          {/* Partner Trust Strip */}
          {!isLoading && results.length > 0 && <CarPartnerTrustStrip />}

          {/* Validation Errors */}
          {!isValid && (
            <section className="py-8">
              <div className="container mx-auto px-4">
                <Alert
                  variant="destructive"
                  className="max-w-2xl mx-auto rounded-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Invalid search parameters:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                    <Link
                      to="/rent-car"
                      className="text-primary underline mt-2 inline-block"
                    >
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
                {!isLoading && results.length > 0 ? (
                  <RampResultsLayout filters={<FiltersContent />}>
                    {renderResultsPanel(false)}
                  </RampResultsLayout>
                ) : (
                  <div className="mx-auto max-w-4xl">
                    {renderResultsPanel(false)}
                  </div>
                )}
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
        {results.length > 0 && (
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
        )}

        <Footer />
      </div>
    </TravelPageFrame>
  );
}
