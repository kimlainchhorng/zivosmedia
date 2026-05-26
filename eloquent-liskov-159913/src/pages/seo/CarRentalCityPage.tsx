/**
 * SEO Car Rental City Page
 * Dynamic landing page for destinations like /rent-car/miami
 * COMPLIANCE: No mock prices - all prices come from live API on results page
 */
import { useParams, Link } from "react-router-dom";
import { CarFront, MapPin, Star, Shield, CheckCircle, ArrowRight, Clock, Users, TrendingUp, Sparkles, ShieldCheck, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TravelFAQ from "@/components/shared/TravelFAQ";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import PartnerLogosStrip from "@/components/shared/PartnerLogosStrip";
import VehicleTypeGallery from "@/components/shared/VehicleTypeGallery";
import { CarSearchFormPro } from "@/components/search";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import { CAR_DISCLAIMERS } from "@/config/carCompliance";
import { cn } from "@/lib/utils";

// City data for SEO content (no prices)
const cityData: Record<string, {
  name: string;
  state?: string;
  country: string;
  description: string;
  highlights: string[];
  rentalCompanies: number;
}> = {
  "miami": {
    name: "Miami",
    state: "Florida",
    country: "USA",
    description: "Explore South Beach, the Everglades, and the Florida Keys with a rental car from Miami. Compare prices from top providers at MIA Airport and downtown locations.",
    highlights: ["Miami Airport (MIA)", "South Beach", "Downtown Miami", "Coral Gables"],
    rentalCompanies: 25,
  },
  "los-angeles": {
    name: "Los Angeles",
    state: "California",
    country: "USA",
    description: "Navigate LA's sprawling landscape with a rental car. Compare prices from LAX, Hollywood, and Santa Monica locations.",
    highlights: ["LAX Airport", "Hollywood", "Santa Monica", "Beverly Hills"],
    rentalCompanies: 30,
  },
  "new-york": {
    name: "New York",
    state: "New York",
    country: "USA",
    description: "Explore beyond Manhattan with a rental car from NYC. Compare rates from JFK, LaGuardia, Newark, and Manhattan locations.",
    highlights: ["JFK Airport", "LaGuardia", "Manhattan", "Newark"],
    rentalCompanies: 28,
  },
  "london": {
    name: "London",
    country: "UK",
    description: "Discover the English countryside and beyond with a rental car from London. Compare prices from Heathrow, Gatwick, and city center locations.",
    highlights: ["Heathrow Airport", "Gatwick Airport", "Central London", "Stansted"],
    rentalCompanies: 22,
  },
  "paris": {
    name: "Paris",
    country: "France",
    description: "Road trip through France with a rental car from Paris. Compare rates from CDG, Orly, and central Paris pickup locations.",
    highlights: ["Charles de Gaulle (CDG)", "Orly Airport", "Gare du Nord", "Central Paris"],
    rentalCompanies: 20,
  },
  "dubai": {
    name: "Dubai",
    country: "UAE",
    description: "Explore the Emirates with a luxury or economy rental car from Dubai. Compare prices from DXB Airport and downtown locations.",
    highlights: ["Dubai Airport (DXB)", "Downtown Dubai", "Dubai Marina", "Palm Jumeirah"],
    rentalCompanies: 18,
  },
  "tokyo": {
    name: "Tokyo",
    country: "Japan",
    description: "Discover Japan beyond Tokyo with a rental car. Compare prices from Narita, Haneda, and central Tokyo locations.",
    highlights: ["Narita Airport (NRT)", "Haneda Airport", "Shinjuku", "Shibuya"],
    rentalCompanies: 15,
  },
  "sydney": {
    name: "Sydney",
    country: "Australia",
    description: "Road trip along Australia's stunning coast with a rental car from Sydney. Compare prices from Sydney Airport and CBD locations.",
    highlights: ["Sydney Airport", "CBD", "Bondi", "North Sydney"],
    rentalCompanies: 20,
  },
};

// Trust badges
const TRUST_BADGES = [
  { icon: ShieldCheck, text: "Secure booking" },
  { icon: CheckCircle, text: "No hidden fees" },
  { icon: Lock, text: "Data encrypted" },
];

export default function CarRentalCityPage() {
  const { city } = useParams<{ city: string }>();
  const citySlug = city?.toLowerCase().replace(/\s+/g, "-") || "";
  const cityInfo = cityData[citySlug];
  
  // Fallback for unknown cities
  const displayName = cityInfo?.name || city?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Destination";
  const stateName = cityInfo?.state || "";
  const countryName = cityInfo?.country || "";
  
  const locationLabel = stateName 
    ? `${displayName}, ${stateName}` 
    : countryName 
      ? `${displayName}, ${countryName}` 
      : displayName;
  
  const pageTitle = `Car Rental in ${locationLabel} - Compare Prices | ZIVO`;
  const pageDescription = cityInfo?.description || `Find the best car rental deals in ${displayName}. Compare prices from Hertz, Enterprise, Avis, Budget and more. No booking fees on ZIVO.`;
  
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Car Rental", url: "/rent-car" },
    { name: displayName, url: `/rent-car/${citySlug}` },
  ];

  const searchUrl = `/rent-car?pickup=${encodeURIComponent(displayName)}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        canonical={`https://hizivo.com/rent-car/${citySlug}`}
      />
      <BreadcrumbSchema items={breadcrumbs} />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden via-background bg-secondary">
          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link to="/rent-car" className="hover:text-foreground">Car Rental</Link>
              <span>/</span>
              <span className="text-foreground">{displayName}</span>
            </nav>
            
            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border text-sm font-medium mb-6">
                <CarFront className="w-4 h-4 text-foreground" />
                <span className="text-muted-foreground">
                  {cityInfo?.rentalCompanies || "20+"}+ rental companies
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Car Rental in <span className="text-foreground">{displayName}</span>
                {(stateName || countryName) && (
                  <span className="text-muted-foreground text-2xl sm:text-3xl block mt-2">
                    {stateName || countryName}
                  </span>
                )}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                {pageDescription}
              </p>

              <Link to={searchUrl}>
                <Button size="lg" className="h-14 px-8 text-primary-foreground shadow-lg bg-foreground">
                  <CarFront className="h-5 w-5 mr-2" />
                  Search Cars in {displayName}
                  <ArrowRight className="h-5 w-5 ml-2" />
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
        <PartnerLogosStrip service="cars" />

        {/* Search Form */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-xl font-bold mb-6 text-center">
              Search Car Rentals in {displayName}
            </h2>
            <CarSearchFormPro className="max-w-4xl mx-auto" />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Prices provided by trusted rental partners. Final price confirmed on partner checkout.
            </p>
          </div>
        </section>

        {/* Pickup Locations */}
        {cityInfo?.highlights && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-8">
                <MapPin className="w-5 h-5 text-foreground" />
                <h2 className="font-display text-2xl font-bold">Pickup Locations in {displayName}</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {cityInfo.highlights.map((location) => (
                  <Card 
                    key={location}
                    className="group cursor-pointer hover:border-border transition-all"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-foreground transition-colors">{location}</p>
                        <p className="text-sm text-muted-foreground">Cars available</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Car Types */}
        <VehicleTypeGallery 
          service="cars" 
          title={`Car Types Available in ${displayName}`}
          subtitle="Find the perfect vehicle for your trip"
          className="bg-muted/20"
        />

        {/* Why Book Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-10">
              Why Book Car Rental in {displayName} with ZIVO?
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TrendingUp, title: "Compare Prices", desc: "See rates from 25+ rental companies side-by-side" },
                { icon: Shield, title: "Secure Booking", desc: "Book directly with trusted rental partners" },
                { icon: CheckCircle, title: "No ZIVO Fees", desc: "We never charge booking fees" },
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Related Locations */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-xl font-bold mb-6 text-center">
              More Car Rental Destinations
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {["Miami", "Los Angeles", "New York", "London", "Paris", "Dubai", "Tokyo", "Sydney"].map((loc) => {
                if (loc.toLowerCase() === displayName.toLowerCase()) return null;
                const slug = loc.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Link 
                    key={loc}
                    to={`/rent-car/${slug}`}
                    className="px-4 py-2 rounded-full bg-muted/50 hover:bg-muted border border-border/50 text-sm font-medium transition-colors"
                  >
                    {loc}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cross-sell */}
        <InternalLinkGrid currentService="cars" />

        {/* FAQ */}
        <TravelFAQ serviceType="cars" className="bg-muted/20" />

        {/* Compliance Disclaimer */}
        <section className="py-6 bg-secondary border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 text-foreground" />
              <span>{CAR_DISCLAIMERS.partnerBooking}</span>
            </div>
          </div>
        </section>

        {/* SEO Content Block */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              Your Guide to Car Rental in {displayName}
            </h2>
            <p className="text-muted-foreground">
              ZIVO helps you find the best car rental deals in {displayName} by comparing prices from 
              25+ trusted rental companies including Hertz, Enterprise, Avis, Budget, and local providers. 
              Search real-time availability and book securely through our partner network.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              ZIVO is a travel search platform. Car rentals are booked and serviced by our licensed rental partners.
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
