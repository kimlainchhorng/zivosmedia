/**
 * Unified Results Components
 * Shared layout system for Flights, Hotels, and Car Rental results
 */

// Layout components
export { StickySearchSummary } from "./StickySearchSummary";
export { FiltersSheet, FiltersTrigger } from "./FiltersSheet";
export { SortSelect, flightSortOptions, hotelSortOptions, carSortOptions } from "./SortSelect";
export { ActiveFiltersChips, type FilterChip } from "./ActiveFiltersChips";
export { ResultsContainer, ResultsHeader } from "./ResultsContainer";
export { ResultCardSkeleton, ResultsSkeletonList } from "./ResultCardSkeleton";
export { EmptyResults } from "./EmptyResults";
export { RedirectNotice, IndicativePriceAlert, AffiliateDisclaimer } from "./AffiliateNotice";

// Results page header
export { default as ResultsPageHeader, HowZivoWorks, FilterNote } from "./ResultsPageHeader";

// ApiPendingNotice removed - OTA mode only (no affiliate comparison hub)

// Filter components
export { DesktopFiltersSidebar } from "./DesktopFiltersSidebar";
export { FlightFiltersContent } from "./FlightFiltersContent";
export { HotelFiltersContent } from "./HotelFiltersContent";
export { CarFiltersContent } from "./CarFiltersContent";

// Edit Search components
export { EditSearchModal, EditSearchTrigger, useEditSearchModal } from "./EditSearchModal";
export { FlightEditSearchForm, HotelEditSearchForm, CarEditSearchForm } from "./EditSearchForms";

// SEO components
export { ResultsBreadcrumbs } from "./ResultsBreadcrumbs";
export { ResultsFAQ } from "./ResultsFAQ";

// Result cards
export { FlightResultCard, type FlightCardData } from "./FlightResultCard";
export { HotelResultCard, type HotelCardData } from "./HotelResultCard";
export { CarResultCard, type CarCardData } from "./CarResultCard";

// Multi-provider comparison cards
export { FlightMultiProviderCard } from "./FlightMultiProviderCard";
export { HotelMultiProviderCard } from "./HotelMultiProviderCard";

// Ramp-style components
export { RampCarCard, type RampCarCardData } from "./RampCarCard";
export { RampResultsLayout, RampResultsHeader, RampGlobalDisclaimer, RampIndicativeNotice } from "./RampResultsLayout";
export { CarPartnerTrustStrip } from "./CarPartnerTrustStrip";
export { CarResultsSkeleton } from "./CarResultsSkeleton";

// ApiPendingNotice removed - OTA mode uses Duffel directly
