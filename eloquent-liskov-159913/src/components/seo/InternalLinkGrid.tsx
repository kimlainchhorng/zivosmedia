import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plane, Hotel, Car, MapPin, Globe, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Internal Link Grid Component
 * Provides cross-linking between travel verticals for SEO and user discovery
 */

interface InternalLinkGridProps {
  currentService?: 'flights' | 'hotels' | 'cars' | 'home';
  className?: string;
}

// Popular destinations for each service
const LINK_DATA = {
  flights: {
    icon: Plane,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderHover: 'hover:border-sky-500/50',
    destinations: [
      { name: 'New York', slug: 'new-york', type: 'to' },
      { name: 'Los Angeles', slug: 'los-angeles', type: 'to' },
      { name: 'London', slug: 'london', type: 'to' },
      { name: 'Paris', slug: 'paris', type: 'to' },
      { name: 'Tokyo', slug: 'tokyo', type: 'to' },
      { name: 'Dubai', slug: 'dubai', type: 'to' },
    ],
  },
  hotels: {
    icon: Hotel,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/50',
    destinations: [
      { name: 'New York', slug: 'new-york' },
      { name: 'Paris', slug: 'paris' },
      { name: 'London', slug: 'london' },
      { name: 'Tokyo', slug: 'tokyo' },
      { name: 'Barcelona', slug: 'barcelona' },
      { name: 'Miami', slug: 'miami' },
    ],
  },
  cars: {
    icon: Car,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/50',
    destinations: [
      { name: 'Los Angeles', slug: 'los-angeles' },
      { name: 'Miami', slug: 'miami' },
      { name: 'Las Vegas', slug: 'las-vegas' },
      { name: 'Orlando', slug: 'orlando' },
      { name: 'San Francisco', slug: 'san-francisco' },
      { name: 'Denver', slug: 'denver' },
    ],
  },
};

function ServiceSection({ 
  service, 
  showHeader = true 
}: { 
  service: 'flights' | 'hotels' | 'cars'; 
  showHeader?: boolean;
}) {
  const data = LINK_DATA[service];
  const Icon = data.icon;
  
  const getLink = (dest: typeof data.destinations[0]) => {
    if (service === 'flights') {
      return `/flights/to-${dest.slug}`;
    }
    if (service === 'hotels') {
      return `/hotels/${dest.slug}`;
    }
    return `/rent-car/${dest.slug}`;
  };
  
  return (
    <div>
      {showHeader && (
        <Link 
          to={service === 'flights' ? '/flights' : service === 'hotels' ? '/hotels' : '/rent-car'}
          className="flex items-center gap-2 mb-3 group"
        >
          <div className={cn("p-2 rounded-xl", data.bgColor)}>
            <Icon className={cn("w-4 h-4", data.color)} />
          </div>
          <h3 className="font-semibold capitalize group-hover:text-primary transition-colors">
            {service === 'cars' ? 'Car Rentals' : service}
          </h3>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
      <div className="flex flex-wrap gap-2">
        {data.destinations.map((dest) => (
          <Link
            key={dest.slug}
            to={getLink(dest)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border border-border/50 bg-card/50",
              "hover:bg-primary/5 hover:border-primary/30 transition-all",
              "flex items-center gap-1.5"
            )}
          >
            <MapPin className="w-3 h-3 text-muted-foreground" />
            {dest.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function InternalLinkGrid({ currentService, className }: InternalLinkGridProps) {
  const services = ['flights', 'hotels', 'cars'] as const;
  const otherServices = services.filter(s => s !== currentService);
  
  return (
    <section className={cn("py-12 px-4 bg-muted/20", className)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
            <Compass className="w-3 h-3 mr-1" />
            Explore More
          </Badge>
          <h2 className="text-xl sm:text-2xl font-display font-bold mb-2">
            Popular Travel Destinations
          </h2>
          <p className="text-muted-foreground text-sm">
            Search and compare travel options to top destinations worldwide
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {(currentService ? otherServices : services).map((service) => (
            <ServiceSection key={service} service={service} />
          ))}
        </div>
        
        {/* Cross-Sell Cards */}
        {currentService && (
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {otherServices.map((service) => {
              const data = LINK_DATA[service];
              const Icon = data.icon;
              const link = service === 'flights' ? '/flights' : service === 'hotels' ? '/hotels' : '/rent-car';
              
              return (
                <Link key={service} to={link}>
                  <Card className={cn(
                    "border-border/50 transition-all duration-200",
                    data.borderHover,
                    "hover:shadow-lg hover:-translate-y-1.5"
                  )}>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl", data.bgColor)}>
                        <Icon className={cn("w-6 h-6", data.color)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold capitalize">
                          {service === 'cars' ? 'Car Rentals' : service}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Compare {service === 'cars' ? 'rental' : ''} prices from trusted partners
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
