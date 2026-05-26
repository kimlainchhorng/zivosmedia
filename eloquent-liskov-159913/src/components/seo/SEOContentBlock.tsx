import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * SEO Content Block Component
 * Provides H1, intro paragraph, and contextual content for search engine indexing
 */

interface SEOContentBlockProps {
  serviceType: 'flights' | 'hotels' | 'cars';
  destination?: string;
  origin?: string;
  className?: string;
  showSearchCTA?: boolean;
  onSearchClick?: () => void;
}

const SERVICE_CONFIG = {
  flights: {
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    ctaGradient: 'from-sky-500 to-blue-600',
    partners: ['500+ airlines', 'major travel sites', 'trusted partners'],
  },
  hotels: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    ctaGradient: 'from-amber-500 to-orange-600',
    partners: ['Booking.com', 'Hotels.com', 'Expedia', 'Agoda'],
  },
  cars: {
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    ctaGradient: 'from-violet-500 to-purple-600',
    partners: ['Rentalcars.com', 'Kayak', 'Expedia', 'local providers'],
  },
};

function generateContent(serviceType: 'flights' | 'hotels' | 'cars', destination?: string, origin?: string) {
  const hasRoute = origin && destination;
  const hasDestination = !!destination;
  const hasOrigin = !!origin;
  
  switch (serviceType) {
    case 'flights':
      if (hasRoute) {
        return {
          h1: `Flights from ${origin} to ${destination}`,
          intro: `Search flight options from ${origin} to ${destination} across 500+ airlines. Find the best prices and book securely on ZIVO. No booking fees.`,
          details: `Whether you're planning a business trip or vacation, ZIVO helps you find real-time prices for ${origin} to ${destination} flights. We search major airlines to show you all available options in one place.`,
        };
      }
      if (hasDestination) {
        return {
          h1: `Flights to ${destination}`,
          intro: `Search flights to ${destination} from any city worldwide. Browse prices across 500+ airlines and find the best deals for your trip.`,
          details: `Planning a trip to ${destination}? ZIVO searches multiple airlines to help you find competitive prices. Browse departure times, airlines, and prices—all in one search.`,
        };
      }
      if (hasOrigin) {
        return {
          h1: `Flights from ${origin}`,
          intro: `Find flights departing from ${origin} to destinations worldwide. Browse 500+ airlines and book securely on ZIVO.`,
          details: `Flying from ${origin}? Search all available routes and compare prices across airlines. ZIVO helps you find the best options for your next trip.`,
        };
      }
      return {
        h1: `Search Flights Worldwide`,
        intro: `Search real-time flight prices from global airlines. Book securely on ZIVO with instant e-tickets.`,
        details: `ZIVO sells flight tickets as a sub-agent of licensed ticketing providers. We help travelers find competitive airfares by connecting directly to airline ticketing systems. Book and pay securely on ZIVO — tickets are issued instantly after payment.`,
      };

    case 'hotels':
      if (hasDestination) {
        return {
          h1: `Hotels in ${destination}`,
          intro: `Compare hotel prices in ${destination} from leading booking sites. Find the best deals on hotels, resorts, and vacation rentals.`,
          details: `Looking for accommodation in ${destination}? ZIVO compares prices from Booking.com, Hotels.com, Expedia, and more. See ratings, reviews, and photos—then book on your preferred site.`,
        };
      }
      return {
        h1: `Search & Compare Hotels Worldwide`,
        intro: `Compare hotel prices from leading booking platforms. Find the best deals on hotels, resorts, and vacation rentals worldwide.`,
        details: `ZIVO helps you find the best hotel rates by comparing prices across multiple booking sites. We show you options from trusted partners so you can choose where to book.`,
      };

    case 'cars':
      if (hasDestination) {
        return {
          h1: `Car Rentals in ${destination}`,
          intro: `Compare car rental prices in ${destination} from top providers. Find economy, SUV, luxury, and more at airports and city locations.`,
          details: `Renting a car in ${destination}? ZIVO compares rates from Rentalcars.com, Kayak, Expedia, and local providers. Compare prices, vehicle types, and policies before you book.`,
        };
      }
      return {
        h1: `Search & Compare Car Rentals Worldwide`,
        intro: `Compare car rental prices from top providers worldwide. Find the best deals on economy, SUV, luxury, and more.`,
        details: `ZIVO helps you find the best car rental rates by comparing prices from multiple providers. Search by location, dates, and vehicle type to find your perfect rental.`,
      };
  }
}

export default function SEOContentBlock({
  serviceType,
  destination,
  origin,
  className,
  showSearchCTA = false,
  onSearchClick,
}: SEOContentBlockProps) {
  const config = SERVICE_CONFIG[serviceType];
  const content = generateContent(serviceType, destination, origin);
  
  return (
    <div className={cn("py-8 px-4", className)}>
      <div className="max-w-4xl mx-auto">
        {/* H1 Title - Critical for SEO */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4 text-center">
          {content.h1}
        </h1>
        
        {/* Intro Paragraph - SEO optimized content */}
        <p className="text-base sm:text-lg text-muted-foreground text-center mb-6 max-w-2xl mx-auto leading-relaxed">
          {content.intro}
        </p>
        
        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <Badge variant="outline" className={cn("gap-1", config.borderColor)}>
            <Search className={cn("w-3 h-3", config.color)} />
            {serviceType === 'flights' ? 'Search & Book' : 'Search Flights'}
          </Badge>
          <Badge variant="outline" className="border-emerald-500/20">
            <span className="text-emerald-500">✓</span> No Booking Fees
          </Badge>
          <Badge variant="outline" className="border-border/50">
            <ArrowRight className="w-3 h-3 mr-1" />
            Secure ZIVO Checkout
          </Badge>
        </div>
        
        {/* Search CTA */}
        {showSearchCTA && onSearchClick && (
          <div className="text-center mb-8">
            <Button
              onClick={onSearchClick}
              size="lg"
              className={cn(
                "bg-gradient-to-r hover:opacity-90 shadow-lg gap-2",
                config.ctaGradient
              )}
            >
              <Search className="w-4 h-4" />
              Start Searching
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Detailed Content - Additional SEO text */}
        <div className={cn(
          "p-6 rounded-2xl border text-center",
          config.bgColor,
          config.borderColor
        )}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content.details}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Partners include: {config.partners.join(' • ')}</span>
          </div>
        </div>
        
        {/* Disclosure */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          ZIVO sells flight tickets as a sub-agent of licensed ticketing providers. 
          Tickets are issued by authorized partners under airline rules.
        </p>
      </div>
    </div>
  );
}
