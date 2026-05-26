/**
 * SEASONAL DEAL PAGE
 * 
 * Dynamic landing page for seasonal deals like /deals/summer-flights
 * COMPLIANCE: No hardcoded prices. General guidance only.
 */

import { useParams, Link } from "react-router-dom";
import { Calendar, Plane, Hotel, Car, TrendingDown, Sparkles, Info, CheckCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TravelFAQ from "@/components/shared/TravelFAQ";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import { FlightSearchFormPro } from "@/components/search";
import { SEASONAL_DEALS, DESTINATION_CITIES, type SeasonalDeal } from "@/config/programmaticSEO";
import { cn } from "@/lib/utils";

const SERVICE_ICONS = {
  flights: Plane,
  hotels: Hotel,
  cars: Car,
};

const SERVICE_COLORS = {
  flights: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  hotels: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  cars: "text-violet-500 bg-violet-500/10 border-violet-500/20",
};

export default function SeasonalDealPage() {
  const { slug } = useParams<{ slug: string }>();
  
  // Find the deal
  const deal = SEASONAL_DEALS.find(d => d.slug === slug);
  
  if (!deal) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Deal Not Found</h1>
            <p className="text-muted-foreground mb-6">This deal page doesn't exist.</p>
            <Link to="/deals">
              <Button>View All Deals</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  const pageTitle = `${deal.title} | Compare Prices | ZIVO`;
  const pageDescription = `${deal.description} Compare real-time prices from trusted travel partners on ZIVO.`;
  
  // Get related destinations
  const relatedCities = DESTINATION_CITIES.filter(c => 
    deal.services.some(s => c.services.includes(s))
  ).slice(0, 8);
  
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        canonical={`https://hizivo.com/deals/${slug}`}
      />
      
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5">
          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link to="/deals" className="hover:text-foreground">Deals</Link>
              <span>/</span>
              <span className="text-foreground">{deal.title}</span>
            </nav>
            
            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">Limited Time Deals</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                {deal.title}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                {deal.description}
              </p>
              
              {/* Service badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                {deal.services.map(service => {
                  const Icon = SERVICE_ICONS[service];
                  return (
                    <Badge 
                      key={service}
                      variant="outline"
                      className={cn("py-2 px-4", SERVICE_COLORS[service])}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {service.charAt(0).toUpperCase() + service.slice(1)}
                    </Badge>
                  );
                })}
              </div>
              
              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Secure booking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-amber-500" />
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                  <span>Best price comparison</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />
        
        {/* Search Section */}
        {deal.services.includes('flights') && (
          <section className="py-12 bg-muted/20">
            <div className="container mx-auto px-4">
              <h2 className="font-display text-xl font-bold mb-6 text-center">
                Search {deal.title}
              </h2>
              <FlightSearchFormPro className="max-w-4xl mx-auto" />
              <p className="text-xs text-muted-foreground text-center mt-4">
                Prices provided by trusted travel partners. Availability may vary.
              </p>
            </div>
          </section>
        )}
        
        {/* Popular Destinations */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Calendar className="w-3 h-3 mr-1" />
                Popular Destinations
              </Badge>
              <h2 className="font-display text-2xl font-bold mb-2">
                Top Picks for {deal.title.split(' ')[0]} Travel
              </h2>
              <p className="text-muted-foreground">
                Explore popular destinations with great availability
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {relatedCities.map(city => (
                <Link 
                  key={city.slug}
                  to={deal.services.includes('flights') 
                    ? `/flights/to-${city.slug}` 
                    : `/hotels/${city.slug}`
                  }
                >
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{city.name}</h3>
                          <p className="text-sm text-muted-foreground">{city.country}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
        
        {/* Booking Tips */}
        <section className="py-12 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-xl font-bold mb-6 text-center">
                Tips for Finding the Best Deals
              </h2>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1">Be Flexible</h3>
                    <p className="text-sm text-muted-foreground">
                      Flexible dates often find better prices
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                      <TrendingDown className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1">Compare Prices</h3>
                    <p className="text-sm text-muted-foreground">
                      Check multiple dates and routes
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1">Book Early</h3>
                    <p className="text-sm text-muted-foreground">
                      Popular routes fill up fast
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
        
        {/* FAQ */}
        <TravelFAQ serviceType="flights" className="bg-muted/20" />
        
        {/* Compliance Disclaimer */}
        <section className="py-6 bg-amber-500/5 border-y border-amber-500/20">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 text-amber-500" />
              <span>
                Deals are provided by travel partners. Prices and availability may change.
              </span>
            </div>
          </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl font-bold mb-3">
              Ready to Find Your Deal?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Compare real-time prices from trusted travel partners and book securely on ZIVO.
            </p>
            <Link to="/flights">
              <Button size="lg" className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-600 text-primary-foreground shadow-lg">
                <Plane className="h-5 w-5 mr-2" />
                Start Searching
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
