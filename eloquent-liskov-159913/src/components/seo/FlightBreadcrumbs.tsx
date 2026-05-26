import { ChevronRight, Home, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import BreadcrumbSchema from './BreadcrumbSchema';
import { generateRouteUrl, parseCitySlug } from '@/utils/seoUtils';

/**
 * Flight page breadcrumbs with JSON-LD schema
 * Provides visual breadcrumb navigation and structured data
 */

interface FlightBreadcrumbsProps {
  origin?: string;
  destination?: string;
  currentPage?: 'search' | 'results' | 'details' | 'checkout' | 'confirmation';
  airportCode?: string;
  airportName?: string;
  cityName?: string;
}

export default function FlightBreadcrumbs({
  origin,
  destination,
  currentPage = 'search',
  airportCode,
  airportName,
  cityName,
}: FlightBreadcrumbsProps) {
  // Build breadcrumb items
  const items = [
    { name: 'Home', url: '/' },
    { name: 'Flights', url: '/flights' },
  ];

  // Add airport page breadcrumb
  if (airportCode && airportName) {
    items.push({
      name: `${airportName} (${airportCode.toUpperCase()})`,
      url: `/airports/${airportCode.toLowerCase()}`,
    });
  }

  // Add city page breadcrumb
  if (cityName && !airportCode) {
    items.push({
      name: `Flights to ${cityName}`,
      url: `/flights/cities/${cityName.toLowerCase().replace(/\s+/g, '-')}`,
    });
  }

  // Add route breadcrumb
  if (origin && destination) {
    const originDisplay = parseCitySlug(origin);
    const destDisplay = parseCitySlug(destination);
    items.push({
      name: `${originDisplay} to ${destDisplay}`,
      url: generateRouteUrl(origin, destination),
    });
  }

  // Add current page breadcrumb
  if (currentPage === 'results') {
    items.push({ name: 'Results', url: '/flights/results' });
  } else if (currentPage === 'details') {
    items.push({ name: 'Flight Details', url: '#' });
  } else if (currentPage === 'checkout') {
    items.push({ name: 'Checkout', url: '#' });
  } else if (currentPage === 'confirmation') {
    items.push({ name: 'Confirmation', url: '#' });
  }

  return (
    <>
      {/* JSON-LD Schema */}
      <BreadcrumbSchema items={items} />

      {/* Visual Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="bg-muted/30 border-b border-border/50"
      >
        <div className="container mx-auto px-4">
          <ol className="flex items-center gap-1.5 py-2.5 text-xs overflow-x-auto whitespace-nowrap">
            {items.map((item, index) => (
              <li key={item.url} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                )}
                {index === 0 ? (
                  <Link
                    to={item.url}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Home className="w-3 h-3" />
                    <span className="sr-only">{item.name}</span>
                  </Link>
                ) : index === items.length - 1 ? (
                  <span className="text-foreground font-medium flex items-center gap-1">
                    {index === 1 && <Plane className="w-3 h-3 text-primary" />}
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.url}
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {index === 1 && <Plane className="w-3 h-3 text-primary" />}
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
