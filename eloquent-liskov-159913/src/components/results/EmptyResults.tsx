/**
 * Empty Results State - OTA Version for Flights, Affiliate for Hotels/Cars
 * Flights: Simple "no results" message + "Why ZIVO" value proposition (ZIVO is MoR)
 * Hotels/Cars: Indicative pricing with partner CTA
 */

import { Plane, Hotel, Car, ExternalLink, RefreshCw, FilterX, ArrowRight, ShieldCheck, Check, DollarSign, Star, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SandboxTestHelper from "@/components/flight/SandboxTestHelper";
import { isSandboxMode } from "@/config/duffelConfig";

interface IndicativePrice {
  label: string;
  price: number;
  badge?: string;
  badgeColor?: string;
}

interface EmptyResultsProps {
  service: "flights" | "hotels" | "cars";
  message?: string;
  suggestion?: string;
  partnerCta?: {
    label: string;
    onClick: () => void;
  };
  onRetry?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  // Mock indicative prices (hotels/cars only - NOT for flights)
  indicativePrices?: IndicativePrice[];
  origin?: string;
  destination?: string;
  // Admin status for sandbox UI (flights only)
  isAdmin?: boolean;
}

const serviceConfig = {
  flights: {
    icon: Plane,
    title: "No results found for your search",
    titleFiltered: "No flights match your filters",
    message: "Try different dates or nearby airports.",
    messageFiltered: "Try adjusting your filters to see more results.",
    suggestions: [
      "Try flexible dates",
      "Check nearby airports",
      "Adjust filters",
    ],
    suggestionsFiltered: [
      "Remove some filters",
      "Increase your price range",
      "Allow 1+ stops instead of nonstop only",
    ],
    color: "text-sky-500",
    bg: "bg-sky-500",
    bgLight: "bg-sky-500/10",
    defaultPrices: null,
  },
  hotels: {
    icon: Hotel,
    title: "No results found for your search",
    titleFiltered: "No hotels match your filters",
    message: "Try different dates or expand your search area.",
    messageFiltered: "Try adjusting your filters to see more results.",
    suggestions: [
      "Try flexible dates",
      "Expand your search area",
      "Adjust star rating",
    ],
    suggestionsFiltered: [
      "Remove some filters",
      "Increase price range",
      "Lower star rating requirement",
    ],
    color: "text-amber-500",
    bg: "bg-amber-500",
    bgLight: "bg-amber-500/10",
    defaultPrices: [
      { label: "Budget", price: 89, badge: "Good Value Today", badgeIcon: DollarSign, badgeColor: "bg-emerald-500" },
      { label: "Comfort", price: 149, badge: "Frequently Booked", badgeIcon: Star, badgeColor: "bg-amber-500" },
      { label: "Luxury", price: 279, badge: "Popular Choice", badgeIcon: Sparkles, badgeColor: "bg-purple-500" },
    ],
  },
  cars: {
    icon: Car,
    title: "No results found for your search",
    titleFiltered: "No cars match your filters",
    message: "Try different dates or check nearby locations.",
    messageFiltered: "Try adjusting your filters to see more results.",
    suggestions: [
      "Try flexible dates",
      "Check nearby locations",
      "Try different car categories",
    ],
    suggestionsFiltered: [
      "Remove some filters",
      "Increase price range",
      "Try different car categories",
    ],
    color: "text-violet-500",
    bg: "bg-violet-500",
    bgLight: "bg-violet-500/10",
    defaultPrices: [
      { label: "Economy", price: 35, badge: "Good Value Today", badgeIcon: DollarSign, badgeColor: "bg-emerald-500" },
      { label: "Midsize", price: 52, badge: "Frequently Booked", badgeIcon: Star, badgeColor: "bg-amber-500" },
      { label: "SUV", price: 78, badge: "Popular Choice", badgeIcon: Truck, badgeColor: "bg-violet-500" },
    ],
  },
};

export function EmptyResults({
  service,
  message,
  suggestion,
  partnerCta,
  onRetry,
  onClearFilters,
  hasActiveFilters = false,
  className,
  indicativePrices,
  origin,
  destination,
  isAdmin = false,
}: EmptyResultsProps) {
  const config = serviceConfig[service];
  const Icon = hasActiveFilters ? FilterX : config.icon;
  const title = hasActiveFilters ? config.titleFiltered : config.title;
  const defaultMessage = hasActiveFilters ? config.messageFiltered : config.message;
  const suggestions = hasActiveFilters ? config.suggestionsFiltered : config.suggestions;
  
  // Show sandbox helper only for admins in sandbox mode (flights only)
  const showSandboxHelper = service === "flights" && isSandboxMode() && isAdmin;
  
  // For flights: NO mock prices (OTA mode)
  // For hotels/cars: Use indicative prices
  const prices = service === "flights" ? null : (indicativePrices || config.defaultPrices);

  // If filters are active, show filter-focused empty state (no mock prices)
  if (hasActiveFilters) {
    return (
      <div className={cn("text-center py-16 px-6 bg-muted/20 rounded-2xl border border-border/50", className)}>
        <div
          className={cn(
            "w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center",
            config.bgLight
          )}
        >
          <FilterX className={cn("w-10 h-10", config.color)} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {message || defaultMessage}
        </p>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3">Try the following:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {(suggestion ? [suggestion] : suggestions).map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onClearFilters && (
            <Button
              onClick={onClearFilters}
              className={cn("gap-2 text-primary-foreground font-semibold rounded-xl min-h-[44px] touch-manipulation active:scale-[0.97] transition-all duration-200 shadow-lg", config.bg)}
            >
              <FilterX className="w-4 h-4" />
              Clear All Filters
            </Button>
          )}
          
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2 rounded-xl min-h-[44px] touch-manipulation active:scale-[0.97] transition-all duration-200">
              <RefreshCw className="w-4 h-4" />
              Retry Search
            </Button>
          )}
        </div>
      </div>
    );
  }

  // FLIGHTS: Simple OTA empty state (no mock prices)
  if (service === "flights") {
    return (
      <div className={cn("text-center py-16 px-6 bg-muted/20 rounded-2xl border border-border/50", className)}>
        {/* Sandbox Helper - Only for admins in test mode (never in production) */}
        {showSandboxHelper && (
          <SandboxTestHelper className="mb-6 text-left" isAdmin={isAdmin} />
        )}

        <div
          className={cn(
            "w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center",
            config.bgLight
          )}
        >
          <Icon className={cn("w-10 h-10", config.color)} />
        </div>
        
        {origin && destination && (
          <p className="text-sm text-muted-foreground mb-1">
            {origin} → {destination}
          </p>
        )}
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {message || defaultMessage}
        </p>

        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3">Try the following:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {suggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2 rounded-xl min-h-[44px] touch-manipulation active:scale-[0.97] transition-all duration-200">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>

        {/* Why Book With ZIVO - Value Proposition */}
        <div className="mt-8 pt-6 border-t border-border/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Why book flights with ZIVO?
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2.5 text-left max-w-md mx-auto">
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Book and pay directly on ZIVO</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Final prices shown before payment</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Tickets issued by licensed airline partners</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Secure checkout powered by Stripe</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Dedicated customer support</span>
            </li>
          </ul>
        </div>

        {/* OTA disclaimer for flights */}
        <p className="text-[10px] text-muted-foreground max-w-lg mx-auto leading-relaxed mt-6">
          ZIVO sells flight tickets as a sub-agent of licensed ticketing providers.
        </p>
      </div>
    );
  }

  // HOTELS/CARS: Show indicative prices with partner CTA
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with route info */}
      <div className="text-center">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center",
            config.bgLight
          )}
        >
          <Icon className={cn("w-8 h-8", config.color)} />
        </div>
        
        {origin && destination && (
          <p className="text-sm text-muted-foreground mb-1">
            {origin} → {destination}
          </p>
        )}
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Live availability confirmed at checkout.
        </p>
      </div>

      {/* Indicative Price Cards - HOTELS/CARS ONLY */}
      {prices && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {prices.map((item, idx) => (
            <Card 
              key={idx}
              className={cn(
                "overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer rounded-2xl active:scale-[0.98] touch-manipulation",
                idx === 1 && "ring-2 ring-amber-500/50 shadow-lg"
              )}
              onClick={partnerCta?.onClick}
            >
              <CardContent className="p-4 text-center">
                {item.badge && (
                  <Badge className={cn("text-primary-foreground text-[10px] mb-3", item.badgeColor)}>
                    {item.badge}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <div className="mb-2">
                  <span className="text-[10px] text-amber-500 font-medium">Estimated</span>
                  <p className={cn("text-2xl font-bold", config.color)}>
                    ${item.price}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {service === "hotels" ? "per night*" : "per day*"}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">
                  Indicative price. Final price confirmed on partner checkout.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <div className="text-center space-y-4">
        {partnerCta && (
          <Button
            onClick={partnerCta.onClick}
            size="lg"
            className={cn("gap-2 text-primary-foreground font-semibold px-8 rounded-xl min-h-[48px] touch-manipulation active:scale-[0.97] transition-all duration-200 shadow-lg hover:shadow-xl", config.bg)}
          >
            {partnerCta.label || "Continue to secure booking"}
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}

        {onRetry && (
          <div>
            <Button variant="outline" onClick={onRetry} className="gap-2 rounded-xl min-h-[44px] touch-manipulation active:scale-[0.97] transition-all duration-200">
              <RefreshCw className="w-4 h-4" />
              Refresh Results
            </Button>
          </div>
        )}

        {/* Legal disclaimer for hotels/cars */}
        <p className="text-[10px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Payment and booking fulfillment are handled by licensed travel partners.
        </p>
      </div>
    </div>
  );
}
