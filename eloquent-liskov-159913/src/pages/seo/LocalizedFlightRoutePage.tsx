/**
 * LOCALIZED FLIGHT ROUTE PAGE
 * 
 * Country-specific SEO pages for flight routes
 * e.g., /uk/flights/london-to-new-york
 */

import { useParams, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plane, ArrowRight, Calendar, Users, ChevronRight, TrendingDown, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlightSearchFormPro from "@/components/search/FlightSearchFormPro";
import { getCountryFromSlug, INTERNATIONAL_COMPLIANCE } from "@/config/internationalExpansion";
// InternationalCompliance removed
import { cn } from "@/lib/utils";

// Example route data - in production, this would come from the API/CMS
const ROUTE_DATA: Record<string, { origin: string; originCode: string; destination: string; destCode: string; avgPrice: number; flightTime: string }> = {
  "london-to-new-york": { origin: "London", originCode: "LHR", destination: "New York", destCode: "JFK", avgPrice: 450, flightTime: "8h 10m" },
  "london-to-paris": { origin: "London", originCode: "LHR", destination: "Paris", destCode: "CDG", avgPrice: 85, flightTime: "1h 20m" },
  "manchester-to-dubai": { origin: "Manchester", originCode: "MAN", destination: "Dubai", destCode: "DXB", avgPrice: 380, flightTime: "7h 5m" },
  "toronto-to-vancouver": { origin: "Toronto", originCode: "YYZ", destination: "Vancouver", destCode: "YVR", avgPrice: 280, flightTime: "4h 30m" },
  "toronto-to-paris": { origin: "Toronto", originCode: "YYZ", destination: "Paris", destCode: "CDG", avgPrice: 520, flightTime: "7h 45m" },
  "new-york-to-los-angeles": { origin: "New York", originCode: "JFK", destination: "Los Angeles", destCode: "LAX", avgPrice: 180, flightTime: "5h 30m" },
  "miami-to-chicago": { origin: "Miami", originCode: "MIA", destination: "Chicago", destCode: "ORD", avgPrice: 150, flightTime: "3h 15m" },
};

export default function LocalizedFlightRoutePage() {
  const { countrySlug, routeSlug } = useParams<{ countrySlug: string; routeSlug: string }>();
  
  const country = countrySlug ? getCountryFromSlug(countrySlug) : undefined;
  const route = routeSlug ? ROUTE_DATA[routeSlug] : undefined;
  
  // Redirect if country or route not found
  if (!country || !country.isLaunched || !route) {
    return <Navigate to={country ? `/${countrySlug}` : "/"} replace />;
  }
  
  const title = `${route.origin} to ${route.destination} Flights | ZIVO ${country.name}`;
  const description = `Compare ${route.origin} to ${route.destination} flights. From ${country.currency === "GBP" ? "£" : country.currency === "EUR" ? "€" : "$"}${route.avgPrice}. Search airlines and book with trusted partners.`;
  
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://hizivo.com/${countrySlug}/flights/${routeSlug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        
        {/* hreflang for international SEO */}
        <link rel="alternate" hrefLang="en-gb" href={`https://hizivo.com/uk/flights/${routeSlug}`} />
        <link rel="alternate" hrefLang="en-us" href={`https://hizivo.com/us/flights/${routeSlug}`} />
        <link rel="alternate" hrefLang="en-ca" href={`https://hizivo.com/ca/flights/${routeSlug}`} />
        <link rel="alternate" hrefLang="x-default" href={`https://hizivo.com/flights/${routeSlug}`} />
      </Helmet>
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to={`/${countrySlug}`} className="hover:text-foreground transition-colors">
                {country.flag} {country.name}
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/flights" className="hover:text-foreground transition-colors">
                Flights
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground">{route.origin} to {route.destination}</span>
            </nav>
          </div>
          
          {/* Hero */}
          <section className="py-12 via-background to-primary/5 bg-secondary">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-secondary text-foreground border-border">
                  <Plane className="w-3 h-3 mr-1" />
                  Flights
                </Badge>
                <Badge variant="outline">
                  {country.flag} {country.code}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {route.origin} to {route.destination} Flights
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-2xl text-foreground">
                    {country.currency === "GBP" ? "£" : country.currency === "EUR" ? "€" : "$"}{route.avgPrice}*
                  </span>
                  <span className="text-sm">avg. price</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {route.flightTime}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                  Best prices compared
                </span>
              </div>
              
              {/* Search Widget */}
              <div className="max-w-4xl">
                <FlightSearchFormPro />
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                *Prices are estimates and may vary. Final price confirmed at checkout with airline partner.
              </p>
            </div>
          </section>
          
          {/* Route Info */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-secondary">
                        <Plane className="w-5 h-5 text-foreground" />
                      </div>
                      <h3 className="font-semibold">Direct Flights</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Multiple airlines operate this route with direct flight options available
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <Calendar className="w-5 h-5 text-amber-500" />
                      </div>
                      <h3 className="font-semibold">Flexible Dates</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Compare prices across different dates to find the best deals
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <Shield className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold">Trusted Partners</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Book with confidence through verified airline partners
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* CTA */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold mb-4">
                Ready to compare prices?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Search {route.origin} to {route.destination} flights and compare options from multiple airlines and travel partners.
              </p>
              <Button size="lg" asChild>
                <Link to={`/flights?origin=${route.originCode}&destination=${route.destCode}`}>
                  Search Flights
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </section>
          
          {/* Compliance */}
          <section className="py-8 border-t border-border">
            <div className="container mx-auto px-4 space-y-3">
              <p className="text-xs text-muted-foreground">Prices shown in local currency where available.</p>
              <p className="text-xs text-muted-foreground">
                {INTERNATIONAL_COMPLIANCE.globalDisclaimer}
              </p>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
