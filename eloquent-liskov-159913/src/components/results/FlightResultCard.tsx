/**
 * ZIVO Flight Result Card - OTA Model
 * Direct booking on ZIVO - Merchant of Record
 * Exact pricing from Duffel API
 * Uses AirHex CDN for airline logos with fallback chain
 */

import { useState } from "react";
import { Plane, Clock, ArrowRight, Wifi, Utensils, Monitor, Briefcase, Package, Luggage, Zap, AlertTriangle, Star, Info, Bell, Shield, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { FLIGHT_CTA_TEXT, FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";
import PriceAlertModal from "@/components/shared/PriceAlertModal";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { motion } from "framer-motion";

export interface FlightCardData {
  id: string;
  proposalId?: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  stopLocations?: string[];
  price: number;
  currency?: string;
  cabinClass: string;
  amenities?: string[];
  baggageIncluded?: string;
  isRealPrice?: boolean;
  isBestPrice?: boolean;
  isFastest?: boolean;
  isBestValue?: boolean;
  isRefundable?: boolean;
  partnerName?: string;
  priceUpdated?: boolean;
}

interface FlightResultCardProps {
  flight: FlightCardData;
  onViewDeal: (flight: FlightCardData) => void;
  className?: string;
  showPriceAlert?: boolean;
}

export function FlightResultCard({ flight, onViewDeal, className, showPriceAlert = true }: FlightResultCardProps) {
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const { format, getDisplay } = useCurrency();
  const baseCurrency = flight.currency || "USD";
  const { formatted: formattedPrice, wasConverted } = getDisplay(flight.price, baseCurrency);
  
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes("wifi")) return <Wifi className="w-3.5 h-3.5" />;
    if (lower.includes("meal") || lower.includes("food")) return <Utensils className="w-3.5 h-3.5" />;
    if (lower.includes("entertainment") || lower.includes("screen")) return <Monitor className="w-3.5 h-3.5" />;
    if (lower.includes("bag")) return <Luggage className="w-3.5 h-3.5" />;
    return null;
  };

  const getBaggageDisplay = () => {
    const baggage = flight.baggageIncluded?.toLowerCase() || "";
    return {
      personalItem: true,
      carryOn: baggage.includes("carry") || baggage.includes("cabin") || !baggage.includes("no"),
      checkedBag: baggage.includes("check") || baggage.includes("23kg") || baggage.includes("included"),
    };
  };

  const baggageInfo = getBaggageDisplay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 group",
          "hover:shadow-xl hover:shadow-[hsl(var(--flights))/0.08] hover:border-[hsl(var(--flights))/0.3] hover:-translate-y-0.5",
          flight.isBestPrice && "ring-2 ring-[hsl(var(--success))/0.5]",
          flight.isBestValue && !flight.isBestPrice && "ring-2 ring-amber-500/50",
          flight.isFastest && !flight.isBestPrice && !flight.isBestValue && "ring-2 ring-purple-500/50",
          className
        )}
      >
        {/* Top badges row */}
        {(flight.isBestPrice || flight.isFastest || flight.isBestValue || flight.isRealPrice || flight.priceUpdated) && (
          <div className="flex flex-wrap gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
            {flight.priceUpdated && (
              <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] gap-1">
                <AlertTriangle className="w-3 h-3" /> Updated recently
              </Badge>
            )}
            {flight.isBestPrice && !flight.priceUpdated && (
              <Badge className="bg-[hsl(var(--success))] text-primary-foreground text-[10px] gap-1">
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
            {flight.isRealPrice && (
              <Badge className="bg-[hsl(var(--flights))/0.15] text-[hsl(var(--flights))] text-[10px] gap-1">
                <Zap className="w-3 h-3" /> Updated recently
              </Badge>
            )}
          </div>
        )}

        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* LEFT: Airline Section */}
            <div className="p-4 flex items-center gap-3 lg:w-52 border-b lg:border-b-0 lg:border-r border-border/50 bg-muted/5">
              <AirlineLogo
                iataCode={flight.airlineCode}
                airlineName={flight.airline}
                size={48}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate text-sm">{flight.airline}</p>
                <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{flight.cabinClass}</p>
                {flight.isRefundable !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 mt-1.5 text-[10px]",
                    flight.isRefundable ? "text-[hsl(var(--success))]" : "text-muted-foreground"
                  )}>
                    {flight.isRefundable ? (
                      <><Shield className="w-3 h-3" /><span>Refundable</span></>
                    ) : (
                      <><ShieldX className="w-3 h-3" /><span>Non-refundable</span></>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CENTER: Flight Times & Duration */}
            <div className="flex-1 p-4 lg:py-5 lg:px-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-center shrink-0">
                  <p className="text-xl sm:text-2xl font-bold">{flight.departureTime}</p>
                  <p className="text-xs text-muted-foreground font-medium">{flight.departureAirport}</p>
                </div>

                <div className="flex-1 relative px-1 min-w-[70px]">
                  <div className="h-[2px] from-[hsl(var(--flights))/0.3] via-[hsl(var(--flights))] to-[hsl(var(--flights))/0.3] rounded-full bg-secondary" />
                  <Plane className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--flights))] rotate-90" />
                  
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
                          ? "text-[hsl(var(--success))] border-[hsl(var(--success))/0.3] bg-[hsl(var(--success))/0.05]"
                          : "text-amber-500 border-amber-500/30 bg-amber-500/5"
                      )}
                    >
                      {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                </div>

                <div className="text-center shrink-0">
                  <p className="text-xl sm:text-2xl font-bold">{flight.arrivalTime}</p>
                  <p className="text-xs text-muted-foreground font-medium">{flight.arrivalAirport}</p>
                </div>
              </div>

              {flight.stopLocations && flight.stopLocations.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  via {flight.stopLocations.join(", ")}
                </p>
              )}

              {/* Baggage Icons Row */}
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  baggageInfo.personalItem ? "text-[hsl(var(--success))]" : "text-muted-foreground/50 line-through"
                )}>
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Personal</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  baggageInfo.carryOn ? "text-[hsl(var(--success))]" : "text-muted-foreground/50 line-through"
                )}>
                  <Package className="w-3.5 h-3.5" />
                  <span>Carry-on</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  baggageInfo.checkedBag ? "text-[hsl(var(--success))]" : "text-muted-foreground/50 line-through"
                )}>
                  <Luggage className="w-3.5 h-3.5" />
                  <span>Checked</span>
                </div>
              </div>

              {flight.amenities && flight.amenities.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-2 text-muted-foreground">
                  {flight.amenities.slice(0, 4).map((amenity, idx) => {
                    const icon = getAmenityIcon(amenity);
                    if (!icon) return null;
                    return (
                      <div key={idx} className="flex items-center gap-1" title={amenity}>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Price & CTA Section */}
            <div className="p-4 lg:py-5 lg:px-5 lg:w-56 border-t lg:border-t-0 lg:border-l border-border/50 flex flex-row lg:flex-col items-center justify-between lg:justify-center gap-3 bg-gradient-to-br from-muted/30 to-muted/10">
              <div className="text-left lg:text-center">
                <p className="text-[10px] text-[hsl(var(--flights))] font-medium uppercase tracking-wide">
                  From
                </p>
                <div className="flex items-center gap-1 justify-start lg:justify-center">
                  <p className="text-2xl sm:text-3xl font-bold text-[hsl(var(--flights))]">
                    {formattedPrice}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-center">
                        <p className="text-xs">
                          Prices are provided by travel partners and may change until booking is completed on the provider's site.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-[10px] text-muted-foreground">per person</p>
                {wasConverted && (
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                    Converted from {baseCurrency}
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight">
                  Includes taxes & fees
                </p>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDeal(flight);
                }}
                className="gap-2 font-semibold from-[hsl(var(--flights))] hover:from-[hsl(var(--flights))/0.9] hover:shadow-lg shadow-[hsl(var(--flights))/0.2] hover:shadow-[hsl(var(--flights))/0.3] transition-all w-full lg:w-auto text-primary-foreground min-h-[48px] touch-manipulation active:scale-[0.97] rounded-xl bg-foreground"
              >
                <span className="hidden sm:inline">Book with Provider</span>
                <span className="sm:hidden">View Deal</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              
              {showPriceAlert && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPriceAlertModal(true);
                  }}
                  className="gap-1 text-xs text-muted-foreground hover:text-[hsl(var(--flights))] w-full lg:w-auto mt-1 rounded-xl h-8 active:scale-95 transition-all duration-200"
                >
                  <Bell className="w-3 h-3" />
                  Track price
                </Button>
              )}
              
              <p className="text-[9px] text-muted-foreground text-center leading-relaxed max-w-[160px]">
                Continue to Partner
              </p>
            </div>
          </div>

          <div className="px-4 py-2.5 bg-muted/40 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              {FLIGHT_DISCLAIMERS.ticketingShort}
            </p>
          </div>
        </CardContent>

        <PriceAlertModal
          open={showPriceAlertModal}
          onOpenChange={setShowPriceAlertModal}
          service="flights"
          routeInfo={{
            origin: flight.departureAirport,
            destination: flight.arrivalAirport,
            departDate: new Date().toISOString().split('T')[0],
          }}
          currentPrice={flight.price}
          currency={flight.currency}
        />
      </Card>
    </motion.div>
  );
}
