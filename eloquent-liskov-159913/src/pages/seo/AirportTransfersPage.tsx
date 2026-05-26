/**
 * SEO Airport Transfers Landing Page
 * Optimized for organic search with proper meta tags and structured data
 */
import { useState } from "react";
import { Car, MapPin, Clock, Shield, CheckCircle, Users, Briefcase, Plane } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import TravelFAQ from "@/components/shared/TravelFAQ";
import { InternalLinkGrid, BreadcrumbSchema } from "@/components/seo";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { cn } from "@/lib/utils";

const popularRoutes = [
  { from: "JFK Airport", to: "Manhattan", city: "New York", price: 65, time: "45-60 min" },
  { from: "Heathrow", to: "Central London", city: "London", price: 75, time: "45-90 min" },
  { from: "CDG Airport", to: "Paris Center", city: "Paris", price: 55, time: "45-60 min" },
  { from: "LAX Airport", to: "Downtown LA", city: "Los Angeles", price: 55, time: "30-45 min" },
  { from: "Dubai Airport", to: "Dubai Marina", city: "Dubai", price: 45, time: "25-35 min" },
  { from: "NRT Airport", to: "Tokyo Center", city: "Tokyo", price: 85, time: "60-90 min" },
];

const vehicleTypes = [
  { name: "Sedan", passengers: 3, luggage: 2, icon: Car },
  { name: "SUV", passengers: 5, luggage: 4, icon: Car },
  { name: "Van", passengers: 7, luggage: 6, icon: Car },
  { name: "Business", passengers: 3, luggage: 2, icon: Briefcase },
];

export default function AirportTransfersPage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (pickup.trim()) params.set("from", pickup.trim());
    if (dropoff.trim()) params.set("to", dropoff.trim());
    navigate(`/cars${params.toString() ? `?${params}` : ""}`);
  };

  const pageTitle = "Airport Transfers - Book Private Car Service | ZIVO";
  const pageDescription = "Book reliable airport transfers worldwide. Compare prices for private cars, shared shuttles, and luxury vehicles. Door-to-door service with meet & greet.";
  
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Airport Transfers", url: "/airport-transfers" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        canonical="https://hizivo.com/airport-transfers"
      />
      <OrganizationSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-primary/10 to-background" />
          <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-teal-500/15 to-transparent rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-sm font-medium mb-6">
                <Car className="w-4 h-4 text-teal-500" />
                <span className="text-muted-foreground">Private Airport Transfers</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Airport Transfers{" "}
                <span className="bg-gradient-to-r from-teal-500 to-primary bg-clip-text text-transparent">
                  Worldwide
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8">
                Book reliable private transfers to and from airports. Door-to-door service, 
                meet & greet, and flight tracking included.
              </p>
              
              {/* Quick Search */}
              <Card className="p-6 bg-card/90 backdrop-blur-sm border-border/50">
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="text-left">
                    <label htmlFor="airport-transfer-pickup" className="text-sm font-medium mb-2 block">Pickup</label>
                    <div className="relative">
                      <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        id="airport-transfer-pickup"
                        type="text"
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        placeholder="Airport or address"
                        className="w-full pl-10 h-12 rounded-xl bg-muted/30 border border-border/50 focus:border-teal-500/50 outline-none px-4"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label htmlFor="airport-transfer-dropoff" className="text-sm font-medium mb-2 block">Drop-off</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        id="airport-transfer-dropoff"
                        type="text"
                        value={dropoff}
                        onChange={(e) => setDropoff(e.target.value)}
                        placeholder="Hotel or destination"
                        className="w-full pl-10 h-12 rounded-xl bg-muted/30 border border-border/50 focus:border-teal-500/50 outline-none px-4"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleSearch} className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-primary text-primary-foreground font-semibold">
                  Search Transfers
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Compare prices from trusted transfer partners
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Vehicle Types */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Choose Your Vehicle
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {vehicleTypes.map((vehicle) => (
                <Card key={vehicle.name} className="text-center hover:border-teal-500/50 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                      <vehicle.icon className="w-6 h-6 text-teal-500" />
                    </div>
                    <h3 className="font-semibold mb-2">{vehicle.name}</h3>
                    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {vehicle.passengers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {vehicle.luggage}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Routes */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Popular Airport Routes
            </h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {popularRoutes.map((route) => (
                <Card key={`${route.from}-${route.to}`} className="hover:border-teal-500/50 transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-3 text-xs">{route.city}</Badge>
                    <div className="flex items-center gap-2 mb-3">
                      <Plane className="w-4 h-4 text-teal-500" />
                      <span className="font-medium">{route.from}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{route.to}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {route.time}
                      </span>
                      <span className="font-bold text-teal-500">From ${route.price}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl font-bold text-center mb-10">
              Why Book with ZIVO?
            </h2>
            
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Shield, title: "Licensed Drivers", desc: "All drivers are vetted and professionally licensed" },
                { icon: Plane, title: "Flight Tracking", desc: "We monitor your flight and adjust pickup time automatically" },
                { icon: CheckCircle, title: "Free Cancellation", desc: "Cancel up to 24 hours before for a full refund" },
              ].map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-teal-500" />
                    </div>
                    <h3 className="font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
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

        {/* SEO Content */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-4">Book Airport Transfers with Confidence</h2>
            <p className="text-muted-foreground">
              ZIVO connects you with reliable airport transfer services worldwide. Compare prices 
              from vetted local operators, book instantly, and enjoy door-to-door service with 
              professional drivers. All transfers include meet & greet service and flight tracking.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Transfer bookings are completed and serviced by licensed local operators.
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
