/**
 * Checkout Order Summary — premium receipt card for flight checkout
 */
import { Plane, Clock, Users, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DuffelOffer } from "@/hooks/useDuffelFlights";

interface CheckoutOrderSummaryProps {
  offer: DuffelOffer;
  search: any;
  passengers: any[];
  className?: string;
}

export default function CheckoutOrderSummary({ offer, search, passengers, className }: CheckoutOrderSummaryProps) {
  const isRoundTrip = !!search?.returnDate;
  const totalPassengers = (search?.adults || 1) + (search?.children || 0) + (search?.infants || 0);

  return (
    <Card className={cn("overflow-hidden border-border/40 bg-card/80 backdrop-blur-xl", className)}>
      {/* Accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--flights))] via-[hsl(var(--flights))]/70 to-[hsl(var(--flights))]/30" />

      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--flights))]/10 flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
            </div>
            Order Summary
          </h3>
          <Badge variant="outline" className="text-[10px] border-[hsl(var(--flights))]/30 text-[hsl(var(--flights))]">
            {isRoundTrip ? "Round Trip" : "One Way"}
          </Badge>
        </div>

        {/* Flight route */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <div className="text-center min-w-[48px]">
            <p className="text-base font-bold">{offer.departure.code}</p>
            <p className="text-[10px] text-muted-foreground">{offer.departure.time}</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {offer.duration}
            </div>
            <div className="w-full flex items-center gap-1">
              <div className="w-2 h-2 rounded-full border-2 border-[hsl(var(--flights))]" />
              <div className="flex-1 h-px bg-[hsl(var(--flights))]/40 relative">
                {offer.stops > 0 && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--flights))]/60" />
                )}
              </div>
              <ArrowRight className="w-3 h-3 text-[hsl(var(--flights))]" />
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--flights))]" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="text-center min-w-[48px]">
            <p className="text-base font-bold">{offer.arrival.code}</p>
            <p className="text-[10px] text-muted-foreground">{offer.arrival.time}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{search.departureDate}</span>
          </div>
          {isRoundTrip && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{search.returnDate}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plane className="w-3.5 h-3.5" />
            <span>{offer.airline} {offer.flightNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground capitalize">
            <span className="w-3.5 h-3.5 rounded bg-muted flex items-center justify-center text-[9px] font-bold">C</span>
            <span>{search.cabinClass || "Economy"}</span>
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Travelers */}
        <div>
          <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
            Travelers ({totalPassengers})
          </p>
          <div className="space-y-1">
            {passengers.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-medium">{p.given_name} {p.family_name}</span>
                <span className="text-muted-foreground truncate ml-2 max-w-[140px]">{p.email}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
