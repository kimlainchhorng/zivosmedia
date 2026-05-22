/**
 * FlightTicketCard - Boarding pass style ticket display
 * Used on the confirmation page to show booking details
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plane, Clock, Users, Calendar, QrCode, Ticket } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface FlightTicketCardProps {
  bookingReference: string;
  pnr?: string;
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  stops?: number;
  cabinClass?: string;
  passengers?: number;
  totalAmount?: number;
  currency?: string;
  ticketNumbers?: string[];
  ticketingStatus?: string;
  className?: string;
}

export default function FlightTicketCard({
  bookingReference,
  pnr,
  airline,
  airlineCode,
  flightNumber,
  origin,
  destination,
  departureDate,
  returnDate,
  departureTime,
  arrivalTime,
  duration,
  stops,
  cabinClass = "Economy",
  passengers = 1,
  totalAmount,
  currency = "USD",
  ticketNumbers,
  ticketingStatus,
  className,
}: FlightTicketCardProps) {
  const isIssued = ticketingStatus === "issued";

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), "EEE, MMM d, yyyy");
    } catch {
      return d;
    }
  };

  const formatShortDate = (d: string) => {
    try {
      return format(parseISO(d), "dd MMM");
    } catch {
      return d;
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden border-0 shadow-xl relative",
      className
    )}>
      {/* Top accent */}
      <div className="h-1.5 bg-secondary" />

      {/* Ticket Body */}
      <div className="flex flex-col md:flex-row">
        {/* Main section */}
        <div className="flex-1 p-6 space-y-5">
          {/* Airline + status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {airlineCode && (
                <img
                  src={`https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${airlineCode}.svg`}
	                  alt={airline || "Airline"}
	                  className="w-10 h-10 object-contain bg-white rounded-lg p-1 border"
	                  loading="lazy"
	                  decoding="async"
	                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
	                />
              )}
              <div>
                <p className="font-semibold text-foreground">{airline || "Airline"}</p>
                {flightNumber && (
                  <p className="text-xs text-muted-foreground">{flightNumber}</p>
                )}
              </div>
            </div>
            <Badge className={cn(
              "text-xs",
              isIssued
                ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-600 border-amber-500/30"
            )}>
              <Ticket className="w-3 h-3 mr-1" />
              {isIssued ? "E-Ticket Issued" : "Processing"}
            </Badge>
          </div>

          {/* Route */}
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono text-foreground">{origin}</p>
              {departureTime && (
                <p className="text-sm font-medium text-primary mt-1">{departureTime}</p>
              )}
              <p className="text-xs text-muted-foreground">{formatShortDate(departureDate)}</p>
            </div>

            <div className="flex-1 px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                {duration || "—"}
              </div>
              <div className="relative flex items-center">
                <div className="h-px flex-1 bg-border" />
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center mx-2">
                  <Plane className="w-4 h-4 text-foreground -rotate-45" />
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stops === 0 ? "Direct" : stops === undefined ? "" : `${stops} stop${stops > 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold font-mono text-foreground">{destination}</p>
              {arrivalTime && (
                <p className="text-sm font-medium text-primary mt-1">{arrivalTime}</p>
              )}
              {returnDate ? (
                <p className="text-xs text-muted-foreground">{formatShortDate(returnDate)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">One way</p>
              )}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed border-border">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                {formatDate(departureDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Passengers</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                {passengers} adult{passengers > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cabin</p>
              <p className="text-sm font-medium capitalize">{cabinClass}</p>
            </div>
          </div>

          {/* Ticket numbers */}
          {isIssued && ticketNumbers && ticketNumbers.length > 0 && (
            <div className="pt-3 border-t border-dashed border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">E-Ticket Number(s)</p>
              <div className="space-y-1">
                {ticketNumbers.map((num, i) => (
                  <p key={i} className="text-sm font-mono font-medium text-foreground">
                    {num}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tear-off stub */}
        <div className="relative md:w-48 border-t md:border-t-0 md:border-l border-dashed border-border bg-muted/20">
          {/* Circle cutouts */}
          <div className="hidden md:block absolute -left-3 top-0 w-6 h-6 rounded-full bg-background" />
          <div className="hidden md:block absolute -left-3 bottom-0 w-6 h-6 rounded-full bg-background" />
          
          <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Booking Ref</p>
              <p className="text-xl font-bold font-mono tracking-widest text-foreground">
                {pnr || bookingReference}
              </p>
            </div>

            {totalAmount !== undefined && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-primary">
                  ${totalAmount.toFixed(2)} <span className="text-xs text-muted-foreground">{currency}</span>
                </p>
              </div>
            )}

            <div className="w-16 h-16 rounded-lg bg-foreground/5 border border-border flex items-center justify-center">
              <QrCode className="w-10 h-10 text-muted-foreground/50" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
