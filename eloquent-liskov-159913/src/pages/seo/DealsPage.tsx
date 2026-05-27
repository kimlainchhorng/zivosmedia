/**
 * SEO DEALS PAGE
 * 
 * Landing page for /deals showing travel deals across flights, hotels, cars
 * COMPLIANCE: No fake prices. Only shows CTA to search with disclaimer.
 * All price data comes from live API on results pages.
 */
import { Link } from "react-router-dom";
import { Plane, Hotel, Car, Sparkles, TrendingDown, Bell, Info, Clock, MapPin, ArrowRight, Shield, CheckCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TravelFAQ from "@/components/shared/TravelFAQ";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import PartnerLogosStrip from "@/components/shared/PartnerLogosStrip";
import { InternalLinkGrid } from "@/components/seo";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { 
  getActiveSeasonalDeals, 
  SEASONAL_DEALS,
  US_DOMESTIC_ROUTES,
  DESTINATION_CITIES,
  getFlightRouteUrl,
} from "@/config/programmaticSEO";

// Get top routes from programmatic config
const TOP_FLIGHT_ROUTES = US_DOMESTIC_ROUTES.filter(r => r.priority === 1).slice(0, 4);
const TOP_HOTEL_CITIES = DESTINATION_CITIES.filter(c => c.services.includes('hotels') && c.priority === 1).slice(0, 4);
const TOP_CAR_CITIES = DESTINATION_CITIES.filter(c => c.services.includes('cars') && c.priority === 1).slice(0, 4);

// Tips for finding deals
const DEAL_TIPS = [
  { 
    icon: Clock, 
    title: "Book in Advance", 
    desc: "21-60 days ahead typically offers better prices"
  },
  { 
    icon: TrendingDown, 
    title: "Flexible Dates", 
    desc: "Shifting travel by a few days can save significantly"
  },
  { 
    icon: Bell, 
    title: "Set Price Alerts", 
    desc: "Get notified when prices drop for your routes"
  },
  { 
    icon: MapPin, 
    title: "Nearby Airports", 
    desc: "Check alternate airports for more options"
  },
];

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Today's Best Travel Deals - Flights, Hotels & Cars | ZIVO"
        description="Find the best travel deals on flights, hotels, and car rentals. Compare prices from 500+ travel partners and book with confidence. No booking fees on ZIVO."
        canonical="https://hizivo.com/deals"
      />
      <OrganizationSchema />
      
      <Header />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-primary/10 via-background">
          <div className="container mx-auto px-4 relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <span className="text-foreground">Deals</span>
            </nav>
            
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Updated in real-time</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Today's Best <span className="text-primary">Travel Deals</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Compare prices from 500+ trusted travel partners. Search flights, hotels, 
                and car rentals to find the best deals for your trip.
              </p>

              {/* Quick Search Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/flights">
                  <Button size="lg" className="h-12 gap-2 bg-foreground hover:bg-foreground">
                    <Plane className="h-5 w-5" />
                    Search Flights
                  </Button>
                </Link>
                <Link to="/hotels">
                  <Button size="lg" variant="outline" className="h-12 gap-2 border-hotels text-hotels hover:bg-hotels/10">
                    <Hotel className="h-5 w-5" />
                    Search Hotels
                  </Button>
                </Link>
                <Link to="/rent-car">
                  <Button size="lg" variant="outline" className="h-12 gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10">
                    <Car className="h-5 w-5" />
                    Search Cars
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Disclaimer Banner */}
        <div className="bg-muted/30 border-y border-border/50 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 text-primary" />
              <span>Deals are provided by travel partners and may change. Final price confirmed at checkout.</span>
            </div>
          </div>
        </div>

        {/* Seasonal Deals */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Seasonal Deals</h2>
                <p className="text-muted-foreground">Limited time travel offers</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {SEASONAL_DEALS.map((deal) => (
                <Link key={deal.slug} to={`/deals/${deal.slug}`} className="group">
                  <Card className="border hover:border-amber-500/50 transition-all group-hover:shadow-lg h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Deal
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                      <p className="font-semibold mb-1">{deal.title}</p>
                      <p className="text-sm text-muted-foreground">{deal.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Deal Categories */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            {/* Flights Section */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Plane className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Flight Deals</h2>
                  <p className="text-muted-foreground">Compare prices from 500+ airlines</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOP_FLIGHT_ROUTES.map((route) => {
                  const fromName = route.from.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  const toName = route.to.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <Link 
                      key={`${route.from}-${route.to}`}
                      to={getFlightRouteUrl(route)}
                      className="group"
                    >
                      <Card className="border hover:border-border transition-all group-hover:shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-foreground border-border">Flight</Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                          <p className="font-semibold">{fromName} → {toName}</p>
                          <p className="text-sm text-muted-foreground">Compare prices</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              
              <div className="mt-4 text-center">
                <Link to="/flights">
                  <Button variant="outline" className="gap-2">
                    Search All Flights
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hotels Section */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Hotel className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Hotel Deals</h2>
                  <p className="text-muted-foreground">Search hotels from top booking sites</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOP_HOTEL_CITIES.map((city) => (
                  <Link 
                    key={city.slug}
                    to={`/hotels/${city.slug}`}
                    className="group"
                  >
                    <Card className="border hover:border-amber-500/50 transition-all group-hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30">Hotels</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                        </div>
                        <p className="font-semibold">Hotels in {city.name}</p>
                        <p className="text-sm text-muted-foreground">Compare prices</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <Link to="/hotels">
                  <Button variant="outline" className="gap-2">
                    Search All Hotels
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Car Rentals Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Car Rental Deals</h2>
                  <p className="text-muted-foreground">Compare car rentals at top airports</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOP_CAR_CITIES.map((city) => (
                  <Link 
                    key={city.slug}
                    to={`/rent-car/${city.slug}`}
                    className="group"
                  >
                    <Card className="border hover:border-emerald-500/50 transition-all group-hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Cars</Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <p className="font-semibold">Cars in {city.name}</p>
                        <p className="text-sm text-muted-foreground">Compare prices</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <Link to="/rent-car">
                  <Button variant="outline" className="gap-2">
                    Search All Cars
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Partner Logos */}
        <PartnerLogosStrip service="flights" />

        {/* Deal Finding Tips */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Pro Tips
              </Badge>
              <h2 className="font-display text-2xl font-bold mb-2">
                How to Find the Best Deals
              </h2>
              <p className="text-muted-foreground">
                Use these strategies to maximize your savings
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {DEAL_TIPS.map((tip) => (
                <Card key={tip.title}>
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <tip.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why ZIVO */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-10">
              Why Search Deals on ZIVO?
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TrendingDown, title: "Compare Prices", desc: "See rates from 500+ partners side-by-side" },
                { icon: Shield, title: "Secure Booking", desc: "Book directly with trusted travel partners" },
                { icon: CheckCircle, title: "No ZIVO Fees", desc: "We never charge booking fees" },
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
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
        <InternalLinkGrid currentService="home" />

        {/* FAQ */}
        <TravelFAQ serviceType="flights" className="bg-muted/20" />

        {/* SEO Content Block */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4 text-center">
                Find Travel Deals with ZIVO
              </h2>
              <p className="text-muted-foreground text-center">
                ZIVO helps you find the best travel deals by comparing prices from 500+ trusted 
                travel partners including airlines, hotels, and car rental companies. Search 
                real-time availability and book securely through our partner network.
              </p>
              <p className="text-xs text-muted-foreground text-center mt-4">
                ZIVO is a travel search platform. Bookings are completed and serviced by our licensed travel partners. 
                ZIVO may earn a commission when you book through partner links.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
