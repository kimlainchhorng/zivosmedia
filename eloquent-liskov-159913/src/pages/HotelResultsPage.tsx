/**
 * Hotel Results Page - Unified Design
 * Uses shared results components for consistent UX
 * Integrates affiliate deep links with proper consent + tracking
 */

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Hotel, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
// DriverCrossSell removed
import { differenceInDays, format, parseISO } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import HotelFiltersComponent from "@/components/hotels/HotelFilters";
import type { HotelFilters } from "@/components/hotels/HotelFilters";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  StickySearchSummary,
  FiltersSheet,
  FiltersTrigger,
  SortSelect,
  hotelSortOptions,
  ResultsContainer,
  ResultsHeader,
  ResultsSkeletonList,
  EmptyResults,
  HotelResultCard,
  type HotelCardData,
  IndicativePriceAlert,
  RedirectNotice,
  AffiliateDisclaimer,
  ResultsBreadcrumbs,
  ResultsFAQ,
  HotelEditSearchForm,
} from "@/components/results";
import { useRealHotelSearch, buildBookingUrl } from "@/hooks/useRealHotelSearch";
import { getCityBySlug } from "@/data/cities";
import { trackAffiliateClick } from "@/lib/affiliateTracking";
import PartnerConsentModal from "@/components/checkout/PartnerConsentModal";
// SponsoredResultCard removed
import { buildOutRedirectUrl, buildBookingDeepLink } from "@/lib/partnerDeepLinks";
import { HOTEL_DISCLAIMERS } from "@/config/hotelCompliance";

// Parse and validate URL parameters
interface ParsedSearchParams {
  citySlug: string;
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  isValid: boolean;
  errors: string[];
}

function parseSearchParams(searchParams: URLSearchParams): ParsedSearchParams {
  const errors: string[] = [];

  const citySlug = searchParams.get("city") || "";
  const city = getCityBySlug(citySlug);
  const cityName = city?.name || citySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (!citySlug) errors.push("Destination is required");

  const checkIn = searchParams.get("checkin") || "";
  const checkOut = searchParams.get("checkout") || "";

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(checkIn)) errors.push("Invalid check-in date format");
  if (!dateRegex.test(checkOut)) errors.push("Invalid check-out date format");

  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate) errors.push("Check-out must be after check-in");
  }

  const adults = parseInt(searchParams.get("adults") || "1", 10);
  if (isNaN(adults) || adults < 1 || adults > 10) errors.push("Adults must be between 1 and 10");

  const rooms = parseInt(searchParams.get("rooms") || "1", 10);
  if (isNaN(rooms) || rooms < 1 || rooms > 5) errors.push("Rooms must be between 1 and 5");

  return {
    citySlug,
    cityName,
    checkIn,
    checkOut,
    adults: isNaN(adults) ? 1 : Math.min(10, Math.max(1, adults)),
    rooms: isNaN(rooms) ? 1 : Math.min(5, Math.max(1, rooms)),
    isValid: errors.length === 0,
    errors,
  };
}

const defaultFilters: HotelFilters = {
  priceRange: [0, 1000],
  starRating: [],
  guestRating: null,
  amenities: [],
  propertyType: [],
  distance: null,
  payAtHotelOnly: false,
  freeCancellation: false,
};

export default function HotelResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<HotelFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("price");
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelCardData | null>(null);

  const { isLoading, results, search, applyFilters, isRealPrice } = useRealHotelSearch();

  const parsed = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const { citySlug, cityName, checkIn, checkOut, adults, rooms, isValid, errors } = parsed;

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    try {
      return Math.max(1, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
    } catch {
      return 0;
    }
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (isValid && citySlug && checkIn && checkOut) {
      search({ citySlug, cityName, checkIn, checkOut, adults, rooms }, filters);
    }
  }, [citySlug, cityName, checkIn, checkOut, adults, rooms, isValid]);

  const handleFilterChange = (newFilters: HotelFilters) => {
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case "rating":
        return sorted.sort((a, b) => b.guestRating - a.guestRating);
      case "stars":
        return sorted.sort((a, b) => b.starRating - a.starRating);
      case "distance":
        return sorted.sort((a, b) => (a.distanceFromCenter || 99) - (b.distanceFromCenter || 99));
      case "price":
      default:
        return sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
    }
  }, [results, sortBy]);

  // Convert to unified card format
  const hotelCards: HotelCardData[] = sortedResults.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    area: hotel.area,
    imageUrl: hotel.imageUrl,
    starRating: hotel.starRating,
    guestRating: hotel.guestRating,
    reviewCount: hotel.reviewCount,
    pricePerNight: hotel.pricePerNight,
    totalPrice: hotel.pricePerNight * nights,
    nights,
    amenities: hotel.amenities,
    freeCancellation: hotel.freeCancellation,
    distanceFromCenter: hotel.distanceFromCenter,
  }));

  const handleViewDeal = (hotel: HotelCardData) => {
    // Store selected hotel and show consent modal
    setSelectedHotel(hotel);
    setShowConsentModal(true);
  };

  const handleConsentConfirm = () => {
    if (!selectedHotel) return;
    
    // Build the deep link with tracking
    const deepLinkUrl = buildBookingDeepLink({
      destination: cityName,
      checkIn,
      checkOut,
      adults,
      rooms,
      hotelId: selectedHotel.id,
      hotelName: selectedHotel.name,
    });

    // Build /out redirect URL for tracking
    const outParams = new URLSearchParams({
      city: citySlug,
      cityName: cityName,
      checkin: checkIn,
      checkout: checkOut,
      adults: String(adults),
      rooms: String(rooms),
      hotelId: selectedHotel.id,
      hotelName: selectedHotel.name,
      price: String(selectedHotel.pricePerNight),
      partner: "booking",
      product: "hotels",
      source: "result_card",
    });

    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    const creator = searchParams.get("creator");

    if (utmSource) outParams.set("utm_source", utmSource);
    if (utmCampaign) outParams.set("utm_campaign", utmCampaign);
    if (creator) outParams.set("creator", creator);

    outParams.set("url", deepLinkUrl);

    trackAffiliateClick({
      flightId: selectedHotel.id,
      airline: "Booking.com",
      airlineCode: "HOTEL",
      origin: "ZIVO",
      destination: cityName,
      price: selectedHotel.pricePerNight,
      passengers: adults,
      cabinClass: "standard",
      affiliatePartner: "booking",
      referralUrl: `/out?${outParams.toString()}`,
      source: "hotel_result_card",
      ctaType: "result_card",
      serviceType: "hotels",
    });
  };

  const handleViewAllOnPartner = () => {
    const bookingUrl = buildBookingUrl({ citySlug, cityName, checkIn, checkOut, adults, rooms });
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(bookingUrl));
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  const activeFilterCount =
    filters.starRating.length +
    filters.amenities.length +
    (filters.guestRating ? 1 : 0) +
    (filters.distance ? 1 : 0);

  const pageTitle = cityName
    ? `Hotels in ${cityName} | From $${hotelCards[0]?.pricePerNight || 50}/night | ZIVO`
    : "Hotel Search Results | ZIVO";

  const pageDescription = cityName
    ? `Compare ${results.length}+ hotels in ${cityName}. ${checkIn && checkOut ? `${nights} nights, ${formatDisplayDate(checkIn)} - ${formatDisplayDate(checkOut)}.` : ""} Book securely on partner sites.`
    : "Search and compare hotel prices across booking sites.";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={pageTitle} description={pageDescription} />
      <Header />

      <main className="pt-16">
        {/* Hotel Disclaimer Banner - LOCKED TEXT */}
        <section className="border-b border-amber-500/20 py-2.5 bg-amber-500/5">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              {HOTEL_DISCLAIMERS.partnerBooking}
            </p>
          </div>
        </section>

        {/* Breadcrumbs */}
        <ResultsBreadcrumbs service="hotels" />

        {/* Sticky Search Summary with City, Dates, Rooms/Guests, Modify */}
        <StickySearchSummary
          service="hotels"
          backLink="/hotels"
          title={
            <>
              Hotels in <span className="text-amber-500">{cityName}</span>
            </>
          }
          badges={[
            { label: `${formatDisplayDate(checkIn)} – ${formatDisplayDate(checkOut)} (${nights} night${nights !== 1 ? "s" : ""})` },
            { label: `${adults} guest${adults !== 1 ? "s" : ""}, ${rooms} room${rooms !== 1 ? "s" : ""}` },
          ]}
          searchForm={
            <HotelEditSearchForm
              onSearch={(params) => setSearchParams(params)}
              onCancel={() => { /* form is always visible — nothing to cancel */ }}
            />
          }
        />
        
        {/* Trust copy above results */}
        <section className="py-3 border-b border-border/30 bg-muted/20">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground">
              Compare hotel deals from licensed travel partners.
            </p>
          </div>
        </section>

        {/* Validation Errors */}
        {!isValid && (
          <section className="py-8">
            <div className="container mx-auto px-4">
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Invalid search parameters:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <Link to="/hotels" className="text-amber-500 underline mt-2 inline-block">
                    Start a new search →
                  </Link>
                </AlertDescription>
              </Alert>
            </div>
          </section>
        )}

        {/* Results Section */}
        {isValid && (
          <section className="py-6">
            <div className="container mx-auto px-4">
              <ResultsContainer
                filters={
                  <HotelFiltersComponent filters={filters} onFilterChange={handleFilterChange} />
                }
              >
                {/* Results Header */}
                <ResultsHeader
                  count={hotelCards.length}
                  itemName="hotel"
                  isLoading={isLoading}
                  indicativePrice={!isRealPrice}
                  filterTrigger={
                    <FiltersTrigger onClick={() => setShowFilters(true)} activeCount={activeFilterCount} />
                  }
                  sortElement={
                    <div className="flex items-center gap-2">
                      <SortSelect value={sortBy} onValueChange={setSortBy} options={hotelSortOptions} />
                      <Button
                        onClick={handleViewAllOnPartner}
                        className="hidden sm:flex bg-amber-500 hover:bg-amber-600 text-primary-foreground gap-2"
                      >
                        View on Booking.com
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  }
                />

                {/* Indicative Price Notice */}
                {!isRealPrice && !isLoading && hotelCards.length > 0 && (
                  <IndicativePriceAlert service="hotels" className="mb-4" />
                )}

                {/* Loading State */}
                {isLoading && <ResultsSkeletonList count={5} variant="hotel" />}

                {/* Results */}
                {!isLoading && hotelCards.length > 0 && (
                  <div className="space-y-4 stagger-results">
                    {hotelCards.map((hotel, index) => (
                      <React.Fragment key={hotel.id}>
                        <HotelResultCard hotel={hotel} onViewDeal={handleViewDeal} />
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {!isLoading && hotelCards.length === 0 && isValid && (
                  <EmptyResults
                    service="hotels"
                    partnerCta={{ label: "Search on Booking.com", onClick: handleViewAllOnPartner }}
                  />
                )}

                {/* Redirect Notice */}
                {hotelCards.length > 0 && !isLoading && <RedirectNotice service="hotels" className="mt-6" />}
                
                {/* Indicative prices disclaimer below results */}
                {hotelCards.length > 0 && !isLoading && (
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Indicative prices shown. Final price confirmed on partner site.
                  </p>
                )}
              </ResultsContainer>
            </div>
          </section>
        )}

        {/* Support Routing Section */}
        <section className="py-6 bg-muted/20 border-y border-border/30">
          <div className="container mx-auto px-4 max-w-2xl text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              For changes, cancellations, or refunds, contact the booking partner listed in your confirmation email.
            </p>
            <p className="text-sm text-muted-foreground">
              For website issues, contact <a href="mailto:support@hizivo.com" className="text-amber-500 hover:underline">support@hizivo.com</a>.
            </p>
          </div>
        </section>

        {/* Cross-sell removed */}

        {/* FAQ Section */}
        <ResultsFAQ service="hotels" />

        {/* Affiliate Disclaimer */}
        <AffiliateDisclaimer />
      </main>

      {/* Mobile Filters Sheet */}
      <FiltersSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        onApply={() => {}}
        onReset={() => setFilters(defaultFilters)}
        hasActiveFilters={activeFilterCount > 0}
        service="hotels"
      >
        <HotelFiltersComponent filters={filters} onFilterChange={handleFilterChange} />
      </FiltersSheet>

      {/* Partner Consent Modal */}
      <PartnerConsentModal
        open={showConsentModal}
        onOpenChange={setShowConsentModal}
        partnerName="Booking.com"
        partnerId="booking"
        product="hotels"
        destinationUrl={selectedHotel ? buildBookingDeepLink({
          destination: cityName,
          checkIn,
          checkOut,
          adults,
          rooms,
          hotelId: selectedHotel.id,
          hotelName: selectedHotel.name,
        }) : "https://www.booking.com"}
        searchParams={{
          citySlug,
          cityName,
          checkIn,
          checkOut,
          adults,
          rooms,
          hotelId: selectedHotel?.id,
          hotelName: selectedHotel?.name,
          pricePerNight: selectedHotel?.pricePerNight,
        }}
        onConfirm={handleConsentConfirm}
      />

      <Footer />
    </div>
  );
}
