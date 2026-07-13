import { useParams, useNavigate, Link } from "react-router-dom";
import { Hotel, Search, Star, MapPin, ArrowRight, Shield, Clock, CheckCircle, Sparkles, ExternalLink, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import BundleProgressBanner from "@/components/shared/BundleProgressBanner";
import TravelFAQ from "@/components/shared/TravelFAQ";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import HotelExperienceGallery from "@/components/hotel/HotelExperienceGallery";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { HOTEL_DISCLAIMERS, HOTEL_TRUST_BADGES } from "@/config/hotelCompliance";
import { heroPhotos, serviceOverlays, destinationPhotos } from "@/config/photos";

// Use real destination photos
const popularCities = [
  { city: "New York", country: "USA", cityKey: "new-york" as const, hotels: 2450, avgPrice: 189 },
  { city: "Paris", country: "France", cityKey: "paris" as const, hotels: 1890, avgPrice: 165 },
  { city: "London", country: "UK", cityKey: "london" as const, hotels: 1980, avgPrice: 175 },
  { city: "Tokyo", country: "Japan", cityKey: "tokyo" as const, hotels: 2100, avgPrice: 142 },
  { city: "Dubai", country: "UAE", cityKey: "dubai" as const, hotels: 1250, avgPrice: 225 },
  { city: "Barcelona", country: "Spain", cityKey: "barcelona" as const, hotels: 1120, avgPrice: 135 },
  { city: "Miami", country: "USA", cityKey: "miami" as const, hotels: 890, avgPrice: 168 },
  { city: "Sydney", country: "Australia", cityKey: "sydney" as const, hotels: 890, avgPrice: 168 },
];

const trustBadges = [
  { icon: ShieldCheck, text: HOTEL_TRUST_BADGES.secureCheckout },
  { icon: CheckCircle, text: HOTEL_TRUST_BADGES.noHiddenFees },
  { icon: Lock, text: HOTEL_TRUST_BADGES.dataEncrypted },
];

export default function HotelLanding() {
  const { city } = useParams<{ city?: string }>();
  const navigate = useNavigate();
  const [destination, setDestination] = useState(city?.replace(/-/g, " ") || "");

  const formattedCity = city?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  const pageTitle = formattedCity 
    ? `Hotels in ${formattedCity} - Compare Prices | ZIVO`
    : "Compare Hotel Prices from 500+ Partners | ZIVO";
  
  const pageDescription = formattedCity
    ? `Find the best hotel deals in ${formattedCity}. Compare prices from Booking.com, Expedia, Hotels.com and more. No booking fees on ZIVO.`
    : "Compare hotel prices from 500+ trusted travel partners. Find the best rates on hotels worldwide. No booking fees on ZIVO.";

  const heroImage = heroPhotos.hotels;

  const handleSearch = () => {
    if (destination) {
      navigate(`/book-hotel?destination=${encodeURIComponent(destination)}`);
    } else {
      navigate("/book-hotel");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BundleProgressBanner step="hotel" />
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={formattedCity ? `/hotels/in-${city}` : "/hotels"}
        ogImage="/og-hotels.jpg"
        appLink="zivo://hotels"
        structuredData={
          formattedCity
            ? undefined
            : {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Popular hotel destinations on ZIVO",
                "itemListOrder": "https://schema.org/ItemListOrderAscending",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1,  "name": "New York",    "url": "https://hizivo.com/hotels/in-new-york" },
                  { "@type": "ListItem", "position": 2,  "name": "Paris",       "url": "https://hizivo.com/hotels/in-paris" },
                  { "@type": "ListItem", "position": 3,  "name": "London",      "url": "https://hizivo.com/hotels/in-london" },
                  { "@type": "ListItem", "position": 4,  "name": "Tokyo",       "url": "https://hizivo.com/hotels/in-tokyo" },
                  { "@type": "ListItem", "position": 5,  "name": "Dubai",       "url": "https://hizivo.com/hotels/in-dubai" },
                  { "@type": "ListItem", "position": 6,  "name": "Miami",       "url": "https://hizivo.com/hotels/in-miami" },
                  { "@type": "ListItem", "position": 7,  "name": "Las Vegas",   "url": "https://hizivo.com/hotels/in-las-vegas" },
                  { "@type": "ListItem", "position": 8,  "name": "Bangkok",     "url": "https://hizivo.com/hotels/in-bangkok" },
                  { "@type": "ListItem", "position": 9,  "name": "Bali",        "url": "https://hizivo.com/hotels/in-bali" },
                  { "@type": "ListItem", "position": 10, "name": "Cancun",      "url": "https://hizivo.com/hotels/in-cancun" }
                ]
              }
        }
      />
      <BreadcrumbSchema
        items={
          formattedCity
            ? [
                { name: "Home", url: "/" },
                { name: "Hotels", url: "/hotels" },
                { name: formattedCity, url: `/hotels/in-${city}` },
              ]
            : [
                { name: "Home", url: "/" },
                { name: "Hotels", url: "/hotels" },
              ]
        }
      />
      <Header />
      
      <main className="pt-16 animate-in fade-in duration-500">

        {/* Hero Section with Photo Background */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          {/* Background Image - REAL hotel imagery */}
          <div className="absolute inset-0">
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            {/* Gradient Overlay */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", serviceOverlays.hotels)} />
            {/* Additional depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6 text-primary-foreground">
                <Hotel className="w-4 h-4 text-amber-400" />
                <span className="text-primary-foreground/80">Compare hotel prices</span>
              </div>
              
              {/* UPDATED HEADLINE */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                {formattedCity ? (
                  <>Hotels in <span className="text-ig-gradient">{formattedCity}</span></>
                ) : (
                  <>Compare Hotels Worldwide — <span className="text-ig-gradient">Book Securely with Partners</span></>
                )}
              </h1>
              
              {/* UPDATED SUBHEADLINE */}
              <p className="text-lg text-primary-foreground/80 mb-8">
                Search real-time hotel prices and complete booking securely with licensed partners.
              </p>

              {/* Search Form */}
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-hotels" />
                  <Input
                    type="text"
                    placeholder="City, region, or hotel name"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="pl-12 h-14 text-base rounded-xl"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  size="lg" 
                  className="h-14 px-8 rounded-xl bg-hotels hover:bg-hotels/90 text-primary-foreground font-semibold"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search Hotels
                </Button>
              </div>
              
              {/* Helper text under CTA */}
              <p className="text-sm text-primary-foreground/60 mt-4 flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Final booking completed on partner site.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              {trustBadges.map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 text-sm text-primary-foreground/70">
                  <badge.icon className="w-4 h-4 text-amber-400" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
            
            {/* Visible disclaimer near search */}
            <div className="mt-6 max-w-2xl mx-auto">
              <p className="text-center text-xs text-primary-foreground/50">
                ZIVO is not the merchant of record. Hotel bookings are completed with licensed third-party providers.
              </p>
            </div>
          </div>
        </section>

        {/* Popular Cities */}
        <section className="py-16 border-t border-border/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="font-display text-2xl font-bold">Popular Destinations</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {popularCities.map((dest) => {
                const photo = destinationPhotos[dest.cityKey];
                return (
                  <Link
                    key={dest.city}
                    to={`/hotels/in-${dest.city.toLowerCase().replace(/\s+/g, "-")}`}
                    className={cn(
                      "group rounded-2xl border border-border/50 bg-card overflow-hidden",
                      "hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10",
                      "transition-all duration-200 hover:-translate-y-1.5"
                    )}
                  >
                    {/* Destination Photo */}
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={photo?.src || `https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=400&h=400&fit=crop&q=75&fm=webp`}
                        alt={photo?.alt || `Hotels in ${dest.city}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-primary-foreground group-hover:text-amber-300 transition-colors">{dest.city}</h3>
                        <p className="text-xs text-primary-foreground/70">{dest.country}</p>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{dest.hotels.toLocaleString()} hotels</span>
                        <span className="font-bold text-amber-500">From ${dest.avgPrice}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-10">How ZIVO Works</h2>
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "1", title: "Search", desc: "Enter your destination and dates" },
                { step: "2", title: "Compare", desc: "See prices from 500+ partners" },
                { step: "3", title: "Book", desc: "Complete booking on partner site" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hotel Experience Gallery - Immersive Photo Grid */}
        <HotelExperienceGallery />

        <GlobalTrustBar />

        {/* Internal Linking - Cross-sell Flights & Cars */}
        <InternalLinkGrid currentService="hotels" />

        {/* FAQ Section with Schema */}
        <TravelFAQ serviceType="hotels" className="bg-muted/20" />

        {/* Locked Disclaimer Banner */}
        <section className="py-4 bg-amber-500/5 border-y border-amber-500/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{HOTEL_DISCLAIMERS.partnerBooking}</span>
            </div>
          </div>
        </section>

        {/* Affiliate Disclaimer */}
        <section className="py-8 border-t border-border/50">
          <div className="container mx-auto px-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto font-medium">
              {HOTEL_DISCLAIMERS.partnerBooking}
            </p>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
              {HOTEL_DISCLAIMERS.price} ZIVO may earn a commission when you book through partner links.
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
