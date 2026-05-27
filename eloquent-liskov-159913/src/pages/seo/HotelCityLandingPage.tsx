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
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * Hotels-specific City Landing Page
 * SEO-optimized page focused on hotel comparison with real-time rates
 */

function formatCityName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDefaultDates() {
  const checkIn = addDays(new Date(), 1);
  const checkOut = addDays(checkIn, 3);
  return {
    checkIn: format(checkIn, "yyyy-MM-dd"),
    checkOut: format(checkOut, "yyyy-MM-dd"),
  };
}

export default function HotelCityLandingPage() {
  const { city: citySlug = "" } = useParams<{ city: string }>();
  const city = formatCityName(citySlug);
  const cityPhoto = destinationPhotos[citySlug as DestinationCity];
  
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
  const title = `Hotels in ${city} ${dynamicYear} | Compare Best Rates | ZIVO`;
  const description = `Find the best hotel deals in ${city}. Compare prices from Hotelbeds, RateHawk and more. No booking fees. Secure payment with ZIVO.`;
  const canonicalUrl = `https://hizivo.com/hotels/${citySlug}`;

  const breadcrumbItems = [
    { name: "Home", url: "https://hizivo.com" },
    { name: "Hotels", url: "https://hizivo.com/hotels" },
    { name: `Hotels in ${city}`, url: canonicalUrl },
  ];

  const faqItems = [
    {
      question: `What are the best hotels in ${city}?`,
      answer: `ZIVO compares rates from multiple suppliers to find the best hotel deals in ${city}. Filter by star rating, price, location, and amenities to find your perfect stay.`,
    },
    {
      question: `How can I get the cheapest hotel in ${city}?`,
      answer: `Use ZIVO to compare prices across Hotelbeds, RateHawk, and other suppliers. Book in advance, be flexible with dates, and look for our "Best Price" badge to find the cheapest rates.`,
    },
    {
      question: `Can I cancel my hotel booking in ${city}?`,
      answer: `Cancellation policies vary by hotel and rate type. Look for rates with free cancellation for maximum flexibility. Cancellation terms are clearly displayed before booking.`,
    },
    {
      question: `Does ZIVO charge booking fees for hotels in ${city}?`,
      answer: `No, ZIVO does not charge booking fees. The price you see includes all taxes and fees. Final price is confirmed with our travel partners at checkout.`,
    },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {cityPhoto && <meta property="og:image" content={cityPhoto.src} />}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <BreadcrumbSchema items={breadcrumbItems} />

      <main className="min-h-screen bg-background">
        {/* Animated Hero Section - Hotels focused */}
        <AnimatedCityHero
          city={city}
          citySlug={citySlug}
          serviceType="hotels"
          subtitle={`Compare hotel prices from multiple suppliers. Find your perfect stay in ${city}.`}
        />

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Quick Search CTA */}
        <section className="py-6 px-4 bg-hotels/5 border-b border-hotels/10">
          <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              {isLoading ? "Loading" : results.length} hotels available in {city}
            </p>
            <Button asChild className="bg-hotels hover:bg-hotels/90">
              <Link to={`/hotels?destination=${citySlug}`}>
                Search All Hotels in {city}
              </Link>
            </Button>
          </div>
        </section>

        {/* Live Rates Grid - More items for hotels page */}
        <LiveRatesGrid
          properties={results}
          isLoading={isLoading}
          citySlug={citySlug}
          maxItems={9}
        />

        {/* Why Book with ZIVO */}
        <section className="py-12 px-4 sm:px-6 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Why Book Hotels with ZIVO?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
              <div className="p-4">
                <div className="text-3xl font-bold text-hotels mb-2">2+</div>
                <div className="font-medium">Supplier Comparison</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare prices from Hotelbeds, RateHawk, and more
                </p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-hotels mb-2">$0</div>
                <div className="font-medium">Booking Fees</div>
                <p className="text-sm text-muted-foreground mt-1">
                  No hidden charges or service fees
                </p>
              </div>
              <div className="p-4">
                <div className="text-3xl font-bold text-hotels mb-2">24/7</div>
                <div className="font-medium">Customer Support</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Help available whenever you need it
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Destinations */}
        <section className="py-12 px-4 sm:px-6">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold mb-8">Explore More Hotels</h2>
            <PopularDestinationsGrid service="hotels" limit={8} />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 px-4 sm:px-6 bg-muted/30">
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
