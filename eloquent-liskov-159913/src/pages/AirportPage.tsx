/**
 * Airport Landing Page
 * SEO-optimized page for individual airports
 * /airports/{iata} - e.g., /airports/jfk
 */

import { useParams, Navigate } from 'react-router-dom';
import { Plane, MapPin, Globe, Building2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { FlightSearchFormPro } from '@/components/search';
import FlightBreadcrumbs from '@/components/seo/FlightBreadcrumbs';
import FlightSearchSchema from '@/components/seo/FlightSearchSchema';
import PopularRoutesFromAirport from '@/components/seo/PopularRoutesFromAirport';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GlobalTrustBar from '@/components/shared/GlobalTrustBar';
import { FLIGHT_SEO_DISCLAIMERS, FLIGHT_SEO_INTRO } from '@/config/flightSEOContent';
import { airports, type Airport } from '@/data/airports';

// Create a lookup map with iata as key
const airportsData = airports.map(a => ({
  ...a,
  iata: a.code,
  name: a.name,
}));

const AirportPage = () => {
  const { iata } = useParams<{ iata: string }>();
  
  // Normalize IATA code to uppercase
  const code = iata?.toUpperCase() || '';
  
  // Find airport data
  const airport = airportsData.find(a => a.iata === code);
  
  // Redirect to flights page if airport not found
  if (!airport) {
    return <Navigate to="/flights" replace />;
  }

  const title = `${airport.name} (${airport.iata}) – Flights | ZIVO`;
  const description = FLIGHT_SEO_INTRO.airportIntro(airport.name, airport.city);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={title}
        description={description}
        canonical={`/airports/${code.toLowerCase()}`}
      />
      <FlightSearchSchema origin={code} />
      <Header />

      <main className="pt-16">
        {/* Breadcrumbs */}
        <FlightBreadcrumbs
          airportCode={code}
          airportName={airport.name}
          currentPage="search"
        />

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-8">
              {/* Airport Badge */}
              <Badge variant="outline" className="mb-4 text-lg px-4 py-1">
                {airport.iata}
              </Badge>
              
              {/* H1 */}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Flights from {airport.name}
              </h1>
              
              {/* Location Info */}
              <div className="flex items-center justify-center gap-4 text-muted-foreground mb-6">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {airport.city}, {airport.country}
                </span>
                {airport.region && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    {airport.region}
                  </span>
                )}
              </div>

              {/* Intro Text */}
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {description}
              </p>
            </div>

            {/* Search Form */}
            <div className="max-w-4xl mx-auto">
              <FlightSearchFormPro
                initialFrom={code}
                navigateOnSearch={true}
              />
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <GlobalTrustBar variant="compact" />

        {/* Airport Info Card */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2">
                      About {airport.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {airport.name} ({airport.iata}) serves {airport.city}, {airport.country}. 
                      Search flights departing from {airport.iata} and book securely on ZIVO. 
                      Tickets are issued instantly by licensed airline ticketing partners.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Popular Routes from This Airport */}
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <PopularRoutesFromAirport
              airportCode={code}
              airportCity={airport.city}
              limit={6}
            />
          </div>
        </section>

        {/* SEO Content Block */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-xl font-bold mb-4">
              Book Flights from {airport.city} on ZIVO
            </h2>
            <p className="text-muted-foreground mb-4">
              ZIVO helps travelers find the best flight deals from {airport.name}. 
              Search real-time prices, view final fares, and book securely. 
              Tickets are issued instantly after payment by our licensed ticketing partners.
            </p>
            <p className="text-xs text-muted-foreground">
              {FLIGHT_SEO_DISCLAIMERS.priceNote}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AirportPage;
