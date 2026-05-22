/**
 * Flight Multi-Provider Card
 * Shows multiple booking options per flight with provider comparison
 */

import { useState } from "react";
import { Plane, Clock, ArrowRight, Briefcase, Package, Luggage, Zap, Star, Info, ExternalLink, ChevronDown, ChevronUp, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMultiProviderPricing, type ProviderPrice } from "@/hooks/useMultiProviderPricing";
import { FLIGHT_CTA_TEXT, FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";
import type { FlightCardData } from "./FlightResultCard";

interface FlightMultiProviderCardProps {
  flight: FlightCardData;
  onSelectProvider: (flight: FlightCardData, provider: ProviderPrice) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function FlightMultiProviderCard({ 
  flight, 
  onSelectProvider, 
  className,
  defaultExpanded = false 
}: FlightMultiProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { getDisplay } = useCurrency();
  const baseCurrency = flight.currency || "USD";
  
  // Get multi-provider pricing
  const { providers, lowestPrice, savings, savingsPercent } = useMultiProviderPricing(
    flight.price,
    baseCurrency,
    "flights",
    flight.id
  );

  const { formatted: formattedLowestPrice } = getDisplay(lowestPrice, baseCurrency);

  // Parse baggage info
  const getBaggageDisplay = () => {
    const baggage = flight.baggageIncluded?.toLowerCase() || "";
    return {
      personalItem: true,
      carryOn: baggage.includes("carry") || baggage.includes("cabin") || !baggage.includes("no"),
      checkedBag: baggage.includes("check") || baggage.includes("23kg") || baggage.includes("included"),
    };
  };

  const baggageInfo = getBaggageDisplay();
  const visibleProviders = isExpanded ? providers : providers.slice(0, 2);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:shadow-sky-500/10 hover:border-sky-500/30",
        flight.isBestPrice && "ring-2 ring-emerald-500/50",
        className
      )}
    >
      {/* Top badges row */}
      {(flight.isBestPrice || flight.isFastest || flight.isBestValue || savingsPercent > 0) && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
          {savingsPercent > 0 && (
            <Badge className="bg-emerald-500 text-primary-foreground text-[10px] gap-1">
              Save up to {savingsPercent}%
            </Badge>
          )}
          {flight.isBestPrice && (
            <Badge className="bg-emerald-500 text-primary-foreground text-[10px] gap-1">
              <Zap className="w-3 h-3" /> Cheapest Option
            </Badge>
          )}
          {flight.isBestValue && !flight.isBestPrice && (
            <Badge className="bg-amber-500 text-primary-foreground text-[10px] gap-1">
              <Star className="w-3 h-3" /> Best Value
            </Badge>
          )}
          {flight.isFastest && !flight.isBestPrice && !flight.isBestValue && (
            <Badge className="bg-foreground text-primary-foreground text-[10px] gap-1">
              <Clock className="w-3 h-3" /> Fastest Route
            </Badge>
          )}
          <Badge className="bg-secondary text-foreground text-[10px] gap-1">
            <Zap className="w-3 h-3" /> Compare {providers.length} providers
          </Badge>
        </div>
      )}

      <CardContent className="p-0">
        {/* Flight Info Section */}
        <div className="flex flex-col lg:flex-row">
          {/* LEFT: Airline Section */}
          <div className="p-4 flex items-center gap-3 lg:w-48 border-b lg:border-b-0 lg:border-r border-border/50 bg-muted/10">
            <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shrink-0 bg-secondary">
              {flight.airlineLogo ? (
                <img
                  src={flight.airlineLogo}
	                  alt={flight.airline}
	                  className="w-8 h-8 object-contain"
	                  loading="lazy"
	                  decoding="async"
	                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${flight.airlineCode}&background=0ea5e9&color=fff&size=32`;
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-foreground">{flight.airlineCode}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate text-sm">{flight.airline}</p>
              <p className="text-[10px] text-muted-foreground/80">via Travel Partner</p>
              <p className="text-xs text-muted-foreground">{flight.flightNumber} · <span className="capitalize">{flight.cabinClass}</span></p>
            </div>
          </div>

          {/* CENTER: Flight Times & Duration */}
          <div className="flex-1 p-4 lg:py-5 lg:px-6">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Departure */}
              <div className="text-center shrink-0">
                <p className="text-xl sm:text-2xl font-bold">{flight.departureTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{flight.departureAirport}</p>
              </div>

              {/* Duration Line */}
              <div className="flex-1 relative px-1 min-w-[70px]">
                <div className="h-[2px] rounded-full bg-secondary" />
                <Plane className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground rotate-90" />
                
                <div className="absolute inset-x-0 -top-4 flex justify-center">
                  <span className="text-[10px] text-muted-foreground bg-card px-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {flight.duration}
                  </span>
                </div>
                
                <div className="flex justify-center mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] py-0 px-2 h-5",
                      flight.stops === 0
                        ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                        : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                    )}
                  >
                    {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                  </Badge>
                </div>
              </div>

              {/* Arrival */}
              <div className="text-center shrink-0">
                <p className="text-xl sm:text-2xl font-bold">{flight.arrivalTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{flight.arrivalAirport}</p>
              </div>
            </div>

            {/* Layover info */}
            {flight.stopLocations && flight.stopLocations.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                via {flight.stopLocations.join(", ")}
              </p>
            )}

            {/* Baggage Icons Row */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className={cn(
                "flex items-center gap-1 text-xs",
                baggageInfo.personalItem ? "text-emerald-600" : "text-muted-foreground/50 line-through"
              )}>
                <Briefcase className="w-3.5 h-3.5" />
                <span>Personal</span>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs",
                baggageInfo.carryOn ? "text-emerald-600" : "text-muted-foreground/50 line-through"
              )}>
                <Package className="w-3.5 h-3.5" />
                <span>Carry-on</span>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs",
                baggageInfo.checkedBag ? "text-emerald-600" : "text-muted-foreground/50 line-through"
              )}>
                <Luggage className="w-3.5 h-3.5" />
                <span>Checked</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Best Price Summary */}
          <div className="p-4 lg:py-5 lg:px-5 lg:w-48 border-t lg:border-t-0 lg:border-l border-border/50 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-2 bg-gradient-to-br from-muted/30 to-muted/10">
            <div className="text-left lg:text-center">
              <p className="text-[10px] text-foreground font-medium uppercase tracking-wide">From</p>
              <p className="text-2xl font-bold text-foreground">{formattedLowestPrice}</p>
              <p className="text-[10px] text-muted-foreground">per person</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>Hide options <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Compare {providers.length} options <ChevronDown className="w-3 h-3" /></>
              )}
            </Button>
          </div>
        </div>

        {/* Multi-Provider Comparison Section */}
        <div className="border-t border-border/50 bg-muted/20">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Compare Providers:
            </p>
            <div className="space-y-2">
              {visibleProviders.map((provider) => {
                const { formatted: providerPrice } = getDisplay(provider.price, baseCurrency);
                
                return (
                  <div 
                    key={provider.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      provider.isBestDeal 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-card border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {provider.isOfficialPrice ? (
                        <BadgeCheck className="w-4 h-4 text-foreground" />
                      ) : (
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {provider.name}
                          {provider.isOfficialPrice && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4">Official</Badge>
                          )}
                          {provider.isBestDeal && (
                            <Badge className="bg-emerald-500 text-primary-foreground text-[9px] py-0 h-4">Best deal</Badge>
                          )}
                        </p>
                        {provider.discount && (
                          <p className="text-[10px] text-emerald-600">Save {provider.discount}%</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "text-lg font-bold",
                        provider.isBestDeal ? "text-emerald-600" : "text-foreground"
                      )}>
                        {providerPrice}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => onSelectProvider(flight, provider)}
                        className={cn(
                          "gap-1 font-medium min-h-[36px] touch-manipulation",
                          provider.isOfficialPrice 
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-primary-foreground"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        )}
                      >
                        Book with Provider
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more button */}
            {providers.length > 2 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="w-full mt-2 text-xs text-muted-foreground"
              >
                Show {providers.length - 2} more options
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="px-4 py-2.5 bg-muted/40 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Prices may change until booking is completed with the provider. {FLIGHT_DISCLAIMERS.ticketingShort}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FlightMultiProviderCard;
