/**
 * SEO CITY FLIGHTS PAGE
 * 
 * Dynamic landing page for destinations like /flights/to-paris
 * COMPLIANCE: No mock/hardcoded prices. Only shows booking tips and search CTA.
 * All price data comes from live API on results page.
 */
import { useParams, Link } from "react-router-dom";
import { Plane, MapPin, Calendar, TrendingDown, Bell, Info, Sparkles, CheckCircle, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import FlightSearchSchema from "@/components/seo/FlightSearchSchema";
import { BreadcrumbSchema } from "@/components/seo";
import TravelFAQ from "@/components/shared/TravelFAQ";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import PartnerLogosStrip from "@/components/shared/PartnerLogosStrip";
import { FlightSearchFormPro } from "@/components/search";
import { FLIGHT_SEO_H1, FLIGHT_SEO_INTRO, FLIGHT_SEO_DISCLAIMERS } from "@/config/flightSEOContent";
import { cn } from "@/lib/utils";

// Popular origin cities for this destination (no prices!)
const POPULAR_ORIGINS = [
  { city: "New York", code: "JFK" },
  { city: "Los Angeles", code: "LAX" },
  { city: "Chicago", code: "ORD" },
  { city: "Miami", code: "MIA" },
  { city: "San Francisco", code: "SFO" },
  { city: "Boston", code: "BOS" },
];

// Booking tips (no prices - general guidance only)
const BOOKING_TIPS = [
  { 
    icon: TrendingDown, 
    title: "Book Early", 
    desc: "21-60 days ahead for best rates",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  },
  { 
    icon: Calendar, 
    title: "Flexible Dates", 
    desc: "Tue, Wed, Sat often cheaper",
    color: "text-sky-500 bg-sky-500/10 border-sky-500/20"
  },
  { 
    icon: Clock, 
    title: "Off-Peak Hours", 
    desc: "Early AM or late PM departures",
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20"
  },
];

// Trust badges
const TRUST_BADGES = [
  { icon: ShieldCheck, text: "Secure booking" },
  { icon: CheckCircle, text: "No hidden fees" },
  { icon: Plane, text: "500+ airlines" },
];

export default function FlightToCity() {
  const { citySlug } = useParams<{ citySlug: string }>();

  // Convert slug to city name (e.g., "new-york" -> "New York")
  const cityName = citySlug
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "City";

  const h1Title = FLIGHT_SEO_H1.cityTo(cityName);
  const introText = FLIGHT_SEO_INTRO.cityIntro(cityName);
  
  const pageTitle = `${h1Title} - Compare Prices | ZIVO`;
  const pageDescription = `Find cheap flights to ${cityName}. Compare prices from 500+ airlines and book securely on ZIVO. No booking fees.`;

  const searchUrl = `/flights?to=${encodeURIComponent(citySlug || "")}`;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta */}
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={`https://hizivo.com/flights/to-${citySlug}`}
        ogImage="/og-flights.jpg"
        appLink={`zivo://flights/to/${citySlug}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "TravelAction",
          "agent": { "@type": "Organization", "name": "ZIVO", "url": "https://hizivo.com" },
          "toLocation": {
            "@type": "City",
            "name": cityName,
            "url": `https://hizivo.com/flights/to-${citySlug}`,
          },
          "actionStatus": "https://schema.org/PotentialActionStatus",
          "target": `https://hizivo.com${searchUrl}`,
        }}
      />
      <FlightSearchSchema destination={cityName} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Flights", url: "/flights" },
          { name: `Flights to ${cityName}`, url: `/flights/to-${citySlug}` },
        ]}
      />
      
      <Header />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden via-background bg-secondary">
          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link to="/flights" className="hover:text-foreground">Flights</Link>
              <span>/</span>
              <span className="text-foreground">To {cityName}</span>
            </nav>
            
            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-sm font-medium mb-6">
                <MapPin className="w-4 h-4 text-foreground" />
                <span className="text-muted-foreground">Popular Destination</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {h1Title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                {introText}
              </p>

              <Link to={searchUrl}>
                <Button size="lg" className="h-14 px-8 text-primary-foreground shadow-lg bg-foreground">
                  <Plane className="h-5 w-5 mr-2" />
                  Search Flights to {cityName}
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-6">
              {TRUST_BADGES.map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <badge.icon className="w-4 h-4 text-foreground" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Partner Logos */}
        <PartnerLogosStrip service="flights" />

        {/* Search Form Section */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-xl font-bold mb-6 text-center">
              Search Flights to {cityName}
            </h2>
            <FlightSearchFormPro 
              className="max-w-4xl mx-auto"
              initialTo={cityName}
            />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Prices provided by trusted travel partners. {FLIGHT_SEO_DISCLAIMERS.priceNote}
            </p>
          </div>
        </section>

        {/* Popular Origins - NO PRICES */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-xl font-bold mb-6 text-center">
              Popular Routes to {cityName}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {POPULAR_ORIGINS.map((origin) => {
                const originSlug = origin.city.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Link
                    key={origin.code}
                    to={`/flights/${originSlug}-to-${citySlug}`}
                    className="group"
                  >
                    <Card className="border hover:border-border transition-all group-hover:shadow-lg">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                            <Plane className="h-5 w-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{origin.city}</p>
                            <p className="text-xs text-muted-foreground">{origin.code} → {cityName}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Click a route to compare prices from all available airlines
            </p>
          </div>
        </section>

        {/* Booking Tips (No prices - general guidance only) */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-secondary text-foreground border-border">
                <Sparkles className="w-3 h-3 mr-1" />
                Smart Booking Tips
              </Badge>
              <h2 className="font-display text-2xl font-bold mb-2">
                When to Book Flights to {cityName}
              </h2>
              <p className="text-muted-foreground">
                General guidance based on industry trends — actual prices vary
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {BOOKING_TIPS.map((tip) => (
                <Card key={tip.title} className={cn("border", tip.color.split(" ").slice(1).join(" "))}>
                  <CardContent className="p-4 text-center">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3", tip.color.split(" ").slice(0, 2).join(" "))}>
                      <tip.icon className={cn("w-5 h-5", tip.color.split(" ")[0])} />
                    </div>
                    <h3 className="font-semibold mb-1">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Price Alert CTA */}
        <section className="py-12 bg-secondary">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto border-border bg-card/50">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                  <Bell className="w-8 h-8 text-foreground" />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="font-bold text-lg mb-1">Track Price Drops</h3>
                  <p className="text-sm text-muted-foreground">
                    Set a price alert and get notified when fares drop for flights to {cityName}
                  </p>
                </div>
                <Link to={searchUrl}>
                  <Button className="bg-foreground hover:bg-foreground">
                    Set Alert
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ with Schema */}
        <TravelFAQ serviceType="flights" className="bg-muted/20" />

        {/* Compliance Disclaimer */}
        <section className="py-6 bg-secondary border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 text-foreground" />
              <span>{FLIGHT_SEO_DISCLAIMERS.otaClarification}</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">
              Ready to Book Your Flight to {cityName}?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Compare real-time prices from trusted travel partners and book securely on ZIVO.
            </p>
            <Link to={searchUrl}>
              <Button size="lg" className="h-14 px-8 text-primary-foreground shadow-lg bg-foreground">
                <Plane className="h-5 w-5 mr-2" />
                Search Flights Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
