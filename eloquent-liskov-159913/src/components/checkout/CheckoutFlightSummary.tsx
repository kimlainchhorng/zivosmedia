/**
 * Compact flight summary card for checkout page
 */
import { Plane, Clock, Luggage } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { DuffelOffer } from "@/hooks/useDuffelFlights";

interface CheckoutFlightSummaryProps {
  offer: DuffelOffer;
  search: any;
  className?: string;
}

export default function CheckoutFlightSummary({ offer, search, className }: CheckoutFlightSummaryProps) {
  const isRoundTrip = !!search?.returnDate;

  return (
    <Card className={cn("border-[hsl(var(--flights))]/20 bg-card/80 backdrop-blur-xl overflow-hidden", className)}>
      <div className="h-1 bg-gradient-to-r from-[hsl(var(--flights))] to-[hsl(var(--flights))]/50" />
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--flights))]/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-[hsl(var(--flights))]" />
            </div>
            <div>
              <p className="text-sm font-bold">{offer.airline}</p>
              <p className="text-[11px] text-muted-foreground">{offer.flightNumber}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] border-[hsl(var(--flights))]/30 text-[hsl(var(--flights))]">
            {isRoundTrip ? "Round Trip" : "One Way"}
          </Badge>
        </div>

        <Separator className="bg-border/40" />

        {/* Outbound */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-lg font-bold">{offer.departure.time}</p>
            <p className="text-xs font-semibold text-muted-foreground">{offer.departure.code}</p>
          </div>
          <div className="flex-1 px-3">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {offer.duration}
              </div>
              <div className="w-full h-px bg-border relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--flights))]" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--flights))]" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{offer.arrival.time}</p>
            <p className="text-xs font-semibold text-muted-foreground">{offer.arrival.code}</p>
          </div>
        </div>

        {/* Date & cabin */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{search.departureDate}{isRoundTrip ? ` — ${search.returnDate}` : ""}</span>
          <span className="capitalize">{search.cabinClass || "Economy"}</span>
        </div>

        {/* Baggage badge if available */}
        {(offer as any).baggage && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Luggage className="w-3.5 h-3.5" />
            <span>{(offer as any).baggage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
