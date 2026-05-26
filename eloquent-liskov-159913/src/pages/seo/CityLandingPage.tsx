import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatedCityHero, BreadcrumbSchema, DestinationFAQ, AffiliateDisclaimer, PopularDestinationsGrid } from "@/components/seo";
import LiveRatesGrid from "@/components/seo/LiveRatesGrid";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import { destinationPhotos } from "@/config/photos";
import type { DestinationCity } from "@/config/photos";
import { addDays, format } from "date-fns";
import { useMultiProviderHotelSearch } from "@/hooks/useMultiProviderHotelSearch";
import { useEffect, useMemo } from "react";

/**
 * Unified City Landing Page Template
 * SEO-optimized page for city destinations with real-time supplier data
 */

// Format city slug to display name
function formatCityName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Get default search dates (tomorrow + 3 nights)
function getDefaultDates() {
  const checkIn = addDays(new Date(), 1);
  const checkOut = addDays(checkIn, 3);
  return {
    checkIn: format(checkIn, "yyyy-MM-dd"),
    checkOut: format(checkOut, "yyyy-MM-dd"),
  };
}

export default function CityLandingPage() {
  const { citySlug = "" } = useParams<{ citySlug: string }>();
  const city = formatCityName(citySlug);
  const cityPhoto = destinationPhotos[citySlug as DestinationCity];
  
  // Get default dates for search
  const { checkIn, checkOut } = useMemo(() => getDefaultDates(), []);
  
  // Multi-provider search hook
  const { results, isLoading, search } = useMultiProviderHotelSearch();
  
  // Trigger search on mount
  useEffect(() => {
    if (citySlug) {
      search({
        citySlug,
        cityName: city,
        checkIn,
        checkOut,
        adults: 2,
        rooms: 1,
      });
    }
  }, [citySlug, city, checkIn, checkOut, search]);

  const dynamicYear = new Date().getFullYear() + 1;

  // SEO metadata
  const title = `${city} Travel Guide ${dynamicYear} | Flights & Hotels | ZIVO`;
  const description = `Book the best flights and hotels in ${city}. Compare prices from 500+ airlines and top hotel suppliers. Secure booking with ZIVO.`;
  const canonicalUrl = `https://hizivo.com/city/${citySlug}`;

  // Breadcrumb items
  const breadcrumbItems = [
    { name: "Home", url: "https://hizivo.com" },
    { name: "Destinations", url: "https://hizivo.com/hotels" },
    { name: city, url: canonicalUrl },
  ];

  // FAQ items for structured data
  const faqItems = [
    {
      question: `What is the best time to visit ${city}?`,
      answer: `The best time to visit ${city} depends on your preferences. Check our travel guides for seasonal recommendations and the best deals.`,
    },
    {
      question: `How do I find cheap flights to ${city}?`,
      answer: `Use ZIVO to compare prices from 500+ airlines. Book in advance and be flexible with dates for the best deals on flights to ${city}.`,
    },
    {
      question: `What are the best hotels in ${city}?`,
      answer: `ZIVO compares hotels from multiple suppliers including Hotelbeds and RateHawk to find you the best rates. Filter by star rating, price, and amenities.`,
    },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {cityPhoto && <meta property="og:image" content={cityPhoto.src} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      {/* Structured Data */}
      <BreadcrumbSchema items={breadcrumbItems} />

      <main className="min-h-screen bg-background">
        {/* Animated Hero Section */}
        <AnimatedCityHero
          city={city}
          citySlug={citySlug}
          serviceType="combined"
        />

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Live Rates Grid */}
        <LiveRatesGrid
          properties={results}
          isLoading={isLoading}
          citySlug={citySlug}
          maxItems={6}
        />

        {/* Popular Destinations */}
        <section className="py-12 px-4 sm:px-6 bg-muted/30">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold mb-8">Explore More Destinations</h2>
            <PopularDestinationsGrid service="hotels" limit={8} />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-3xl">
            <DestinationFAQ
              faqs={faqItems}
              serviceType="hotels"
            />
          </div>
        </section>

        {/* Affiliate Disclaimer */}
        <AffiliateDisclaimer serviceType="hotels" />
      </main>
    </>
  );
}
