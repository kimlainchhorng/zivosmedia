/**
 * SEO Destination Hotels Page
 * Dynamic landing page for hotel destinations like /hotels/new-york
 * Optimized for organic search with proper meta tags and structured data
 */
import { useParams, Link } from "react-router-dom";
import { Hotel, MapPin, Star, Shield, CheckCircle, ArrowRight, Clock, Users, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TravelFAQ from "@/components/shared/TravelFAQ";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import PartnerLogosStrip from "@/components/shared/PartnerLogosStrip";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { destinationPhotos } from "@/config/photos";
import { cn } from "@/lib/utils";

// City data for SEO content
const cityData: Record<string, {
  name: string;
  country: string;
  description: string;
  highlights: string[];
  avgPrice: number;
  rating: number;
  hotelCount: number;
}> = {
  "new-york": {
    name: "New York",
    country: "USA",
    description: "The city that never sleeps offers world-class hotels from Times Square penthouses to boutique Brooklyn stays. Find the perfect accommodation for your NYC adventure.",
    highlights: ["Times Square", "Central Park", "Brooklyn", "Manhattan"],
    avgPrice: 189,
    rating: 4.5,
    hotelCount: 2450,
  },
  "paris": {
    name: "Paris",
    country: "France",
    description: "Experience Parisian elegance with hotels near the Eiffel Tower, Champs-Élysées, and Le Marais. From luxury palaces to charming boutiques.",
    highlights: ["Eiffel Tower", "Champs-Élysées", "Le Marais", "Montmartre"],
    avgPrice: 165,
    rating: 4.6,
    hotelCount: 1890,
  },
  "london": {
    name: "London",
    country: "UK",
    description: "Stay in the heart of London with hotels near Big Ben, the West End, and trendy Shoreditch. Classic British hospitality awaits.",
    highlights: ["Westminster", "Covent Garden", "Shoreditch", "Kensington"],
    avgPrice: 175,
    rating: 4.5,
    hotelCount: 1980,
  },
  "tokyo": {
    name: "Tokyo",
    country: "Japan",
    description: "Discover Tokyo's unique blend of tradition and innovation with hotels in Shibuya, Shinjuku, and peaceful Asakusa.",
    highlights: ["Shibuya", "Shinjuku", "Asakusa", "Ginza"],
    avgPrice: 142,
    rating: 4.7,
    hotelCount: 2100,
  },
  "dubai": {
    name: "Dubai",
    country: "UAE",
    description: "Luxury meets innovation in Dubai's world-renowned hotels. From Burj Khalifa views to Palm Jumeirah resorts.",
    highlights: ["Downtown", "Palm Jumeirah", "Marina", "Old Dubai"],
    avgPrice: 225,
    rating: 4.6,
    hotelCount: 1250,
  },
  "barcelona": {
    name: "Barcelona",
    country: "Spain",
    description: "Sun-soaked Barcelona offers beachfront hotels, Gothic Quarter gems, and Gaudí-inspired design stays.",
    highlights: ["La Rambla", "Gothic Quarter", "Barceloneta", "Eixample"],
    avgPrice: 135,
    rating: 4.5,
    hotelCount: 1120,
  },
  "miami": {
    name: "Miami",
    country: "USA",
    description: "Art Deco glamour meets beach vibes in Miami's diverse hotel scene. South Beach, Brickell, and beyond.",
    highlights: ["South Beach", "Brickell", "Wynwood", "Coral Gables"],
    avgPrice: 168,
    rating: 4.4,
    hotelCount: 890,
  },
  "sydney": {
    name: "Sydney",
    country: "Australia",
    description: "Harbour views and beach escapes define Sydney's hotel offerings. Stay near the Opera House or Bondi Beach.",
    highlights: ["Circular Quay", "Bondi", "Darling Harbour", "The Rocks"],
    avgPrice: 168,
    rating: 4.5,
    hotelCount: 890,
  },
};

export default function DestinationHotelsPage() {
  const { city } = useParams<{ city: string }>();
  const citySlug = city?.toLowerCase().replace(/\s+/g, "-") || "";
  const cityInfo = cityData[citySlug];
  
  // Fallback for unknown cities
  const displayName = cityInfo?.name || city?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Destination";
  const countryName = cityInfo?.country || "";
  
  const pageTitle = `Hotels in ${displayName}${countryName ? `, ${countryName}` : ""} - Compare Prices | ZIVO`;
  const pageDescription = cityInfo?.description || `Find the best hotel deals in ${displayName}. Compare prices from Booking.com, Expedia, Hotels.com and more. No booking fees on ZIVO.`;
  
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Hotels", url: "/hotels" },
    { name: displayName, url: `/hotels/${citySlug}` },
  ];
  
  // Get destination photo
  const photoKey = citySlug as keyof typeof destinationPhotos;
  const photo = destinationPhotos[photoKey];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        canonical={`https://hizivo.com/hotels/${citySlug}`}
      />
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {photo ? (
              <img
                src={photo.src}
                alt={photo.alt}
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-hotels/20 to-amber-500/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-10">
              {/* Breadcrumb */}
              <nav className="flex items-center justify-center gap-2 text-sm text-primary-foreground/70 mb-6">
                <Link to="/" className="hover:text-primary-foreground">Home</Link>
                <span>/</span>
                <Link to="/hotels" className="hover:text-primary-foreground">Hotels</Link>
                <span>/</span>
                <span className="text-primary-foreground">{displayName}</span>
              </nav>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
                <Hotel className="w-4 h-4 text-amber-400" />
                <span className="text-primary-foreground/80">
                  {cityInfo?.hotelCount?.toLocaleString() || "1,000+"} hotels available
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Hotels in <span className="text-amber-400">{displayName}</span>
                {countryName && <span className="text-primary-foreground/80 text-2xl sm:text-3xl block mt-2">{countryName}</span>}
              </h1>
              
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                {pageDescription}
              </p>

              {/* Stats */}
              {cityInfo && (
                <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span><strong>{cityInfo.rating}</strong> avg. rating</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>From <strong>${cityInfo.avgPrice}</strong>/night</span>
                  </div>
                </div>
              )}
            </div>

            {/* Search Form - simple version for SEO pages */}
            <div className="max-w-4xl mx-auto">
              <Link to={`/hotels?destination=${encodeURIComponent(displayName)}`}>
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-14 px-8 rounded-xl bg-hotels hover:bg-hotels/90 text-primary-foreground font-semibold gap-2"
                >
                  <Hotel className="w-5 h-5" />
                  Search Hotels in {displayName}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
            
            {/* Disclaimer */}
            <p className="text-center text-xs text-primary-foreground/50 mt-4">
              Prices shown are indicative. Final price confirmed on partner checkout.
            </p>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />
        
        {/* Partner Logos */}
        <PartnerLogosStrip service="hotels" />

        {/* Neighborhoods / Areas */}
        {cityInfo?.highlights && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-8">
                <MapPin className="w-5 h-5 text-hotels" />
                <h2 className="font-display text-2xl font-bold">Popular Areas in {displayName}</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {cityInfo.highlights.map((area) => (
                  <Card 
                    key={area}
                    className="group cursor-pointer hover:border-hotels/50 transition-all"
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-hotels/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-hotels" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-hotels transition-colors">{area}</p>
                        <p className="text-sm text-muted-foreground">Hotels available</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why Book Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-10">
              Why Book Hotels in {displayName} with ZIVO?
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TrendingUp, title: "Compare Prices", desc: "See rates from 500+ partners side-by-side" },
                { icon: Shield, title: "Secure Booking", desc: "Book directly with trusted hotel partners" },
                { icon: CheckCircle, title: "No ZIVO Fees", desc: "We never charge booking fees" },
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-hotels/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-hotels" />
                    </div>
                    <h3 className="font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-sell */}
        <InternalLinkGrid currentService="hotels" />

        {/* FAQ */}
        <TravelFAQ serviceType="hotels" className="bg-muted/20" />

        {/* SEO Content Block */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-center">
                Your Guide to Hotels in {displayName}
              </h2>
              <p className="text-muted-foreground text-center">
                ZIVO helps you find the best hotel deals in {displayName} by comparing prices from 
                500+ trusted travel partners including Booking.com, Expedia, Hotels.com, and more. 
                Search real-time availability, read reviews, and book securely through our partner network.
              </p>
              <p className="text-xs text-muted-foreground text-center mt-4">
                ZIVO is a travel search platform. Hotel bookings are completed and serviced by our licensed travel partners.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
