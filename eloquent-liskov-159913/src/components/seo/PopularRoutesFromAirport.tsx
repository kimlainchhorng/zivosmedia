import { Link } from 'react-router-dom';
import { Plane, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generateRouteUrl, parseCitySlug } from '@/utils/seoUtils';

/**
 * Displays popular flight routes from a specific airport
 * Used on airport landing pages for SEO internal linking
 */

interface PopularRoutesFromAirportProps {
  airportCode: string;
  airportCity: string;
  limit?: number;
}

// Popular domestic and international routes from major hubs
const popularRoutesByAirport: Record<string, Array<{ destination: string; destCode: string; type: 'domestic' | 'international' }>> = {
  'JFK': [
    { destination: 'Los Angeles', destCode: 'LAX', type: 'domestic' },
    { destination: 'London', destCode: 'LHR', type: 'international' },
    { destination: 'Paris', destCode: 'CDG', type: 'international' },
    { destination: 'Miami', destCode: 'MIA', type: 'domestic' },
    { destination: 'San Francisco', destCode: 'SFO', type: 'domestic' },
    { destination: 'Tokyo', destCode: 'NRT', type: 'international' },
    { destination: 'Dubai', destCode: 'DXB', type: 'international' },
    { destination: 'Cancún', destCode: 'CUN', type: 'international' },
  ],
  'LAX': [
    { destination: 'New York', destCode: 'JFK', type: 'domestic' },
    { destination: 'London', destCode: 'LHR', type: 'international' },
    { destination: 'Tokyo', destCode: 'NRT', type: 'international' },
    { destination: 'San Francisco', destCode: 'SFO', type: 'domestic' },
    { destination: 'Las Vegas', destCode: 'LAS', type: 'domestic' },
    { destination: 'Honolulu', destCode: 'HNL', type: 'domestic' },
    { destination: 'Sydney', destCode: 'SYD', type: 'international' },
    { destination: 'Paris', destCode: 'CDG', type: 'international' },
  ],
  'ORD': [
    { destination: 'New York', destCode: 'JFK', type: 'domestic' },
    { destination: 'Los Angeles', destCode: 'LAX', type: 'domestic' },
    { destination: 'London', destCode: 'LHR', type: 'international' },
    { destination: 'Miami', destCode: 'MIA', type: 'domestic' },
    { destination: 'Paris', destCode: 'CDG', type: 'international' },
    { destination: 'Frankfurt', destCode: 'FRA', type: 'international' },
  ],
  'MIA': [
    { destination: 'New York', destCode: 'JFK', type: 'domestic' },
    { destination: 'Los Angeles', destCode: 'LAX', type: 'domestic' },
    { destination: 'Cancún', destCode: 'CUN', type: 'international' },
    { destination: 'London', destCode: 'LHR', type: 'international' },
    { destination: 'São Paulo', destCode: 'GRU', type: 'international' },
    { destination: 'Madrid', destCode: 'MAD', type: 'international' },
  ],
  'SFO': [
    { destination: 'New York', destCode: 'JFK', type: 'domestic' },
    { destination: 'Los Angeles', destCode: 'LAX', type: 'domestic' },
    { destination: 'Tokyo', destCode: 'NRT', type: 'international' },
    { destination: 'London', destCode: 'LHR', type: 'international' },
    { destination: 'Honolulu', destCode: 'HNL', type: 'domestic' },
    { destination: 'Singapore', destCode: 'SIN', type: 'international' },
  ],
  'LHR': [
    { destination: 'New York', destCode: 'JFK', type: 'international' },
    { destination: 'Los Angeles', destCode: 'LAX', type: 'international' },
    { destination: 'Dubai', destCode: 'DXB', type: 'international' },
    { destination: 'Paris', destCode: 'CDG', type: 'international' },
    { destination: 'Tokyo', destCode: 'NRT', type: 'international' },
    { destination: 'Singapore', destCode: 'SIN', type: 'international' },
  ],
};

// Default popular routes for airports not in the list
const defaultRoutes = [
  { destination: 'New York', destCode: 'JFK', type: 'domestic' as const },
  { destination: 'Los Angeles', destCode: 'LAX', type: 'domestic' as const },
  { destination: 'London', destCode: 'LHR', type: 'international' as const },
  { destination: 'Paris', destCode: 'CDG', type: 'international' as const },
  { destination: 'Tokyo', destCode: 'NRT', type: 'international' as const },
  { destination: 'Miami', destCode: 'MIA', type: 'domestic' as const },
];

export default function PopularRoutesFromAirport({
  airportCode,
  airportCity,
  limit = 6,
}: PopularRoutesFromAirportProps) {
  const code = airportCode.toUpperCase();
  const routes = (popularRoutesByAirport[code] || defaultRoutes)
    .filter(r => r.destCode !== code) // Don't show routes to same airport
    .slice(0, limit);

  return (
    <section className="py-8">
      <h2 className="text-xl font-bold mb-4">
        Popular Flights from {airportCity}
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map((route) => (
          <Link
            key={route.destCode}
            to={generateRouteUrl(airportCity, route.destination)}
          >
            <Card className="hover:border-primary/50 transition-colors group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-primary -rotate-45" />
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {route.destination}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {code} → {route.destCode}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Prices vary by date. Search for current availability.
      </p>
    </section>
  );
}
