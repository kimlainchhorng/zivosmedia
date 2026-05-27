/**
 * Flight Confirmation Page — /flights/confirmation/:bookingId
 * Premium post-booking experience with itinerary, share, cross-sell
 */

import { useParams, Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useFlightNotifications } from "@/hooks/useFlightNotifications";
import {
  CheckCircle, Clock, AlertCircle, Plane, Loader2, Ticket,
  Calendar, Users, CreditCard, Mail, MessageCircle,
  Share2, Download, Hotel, Car, ArrowRight, Copy, Check
} from "lucide-react";
import DownloadItinerary from "@/components/flight/DownloadItinerary";
import { motion } from "framer-motion";
import { useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CheckoutStepIndicator from "@/components/checkout/CheckoutStepIndicator";
import CheckoutTrustFooter from "@/components/checkout/CheckoutTrustFooter";
import { useFlightBooking, getTicketingStatusInfo } from "@/hooks/useFlightBooking";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CrossServiceCTAs from "@/components/shared/CrossServiceCTAs";
import { downloadICS } from "@/lib/buildICS";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";

const CONFIRM_STEPS = [
  { label: "Search", completed: true, active: false },
  { label: "Travelers", completed: true, active: false },
  { label: "Payment", completed: true, active: false },
  { label: "Confirmed", completed: true, active: true },
];

const PROCESSING_STEPS = [
  { label: "Search", completed: true, active: false },
  { label: "Travelers", completed: true, active: false },
  { label: "Payment", completed: true, active: false },
  { label: "Ticketing", completed: false, active: true },
];

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

const FlightConfirmation = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { data: booking, isLoading, error } = useFlightBooking(bookingId || null);
  const { toast } = useToast();
  const { notify: notifyFlight } = useFlightNotifications();
  const [copied, setCopied] = useState(false);
  const emailSentRef = useRef(false);
  const notifiedRef = useRef(false);

  const statusInfo = booking ? getTicketingStatusInfo(booking.ticketing_status) : null;
  const isIssued = booking?.ticketing_status === "issued";
  const isFailed = booking?.ticketing_status === "failed";
  const isProcessing = booking?.ticketing_status === "pending" || booking?.ticketing_status === "processing";

  // Send booking confirmation email when ticket is issued
  useEffect(() => {
    if (!isIssued || !booking || emailSentRef.current) return;
    emailSentRef.current = true;

    const leadPassenger = Array.isArray(booking.flight_passengers) && booking.flight_passengers.length > 0
      ? booking.flight_passengers[0] : null;
    const recipientEmail = leadPassenger?.email;
    if (!recipientEmail) return;

    supabase.functions.invoke("send-transactional-email", {
      body: {
        to: recipientEmail,
        template: "booking-confirmation",
        data: {
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          origin: booking.origin,
          destination: booking.destination,
          departure_date: booking.departure_date,
          return_date: booking.return_date,
          cabin_class: booking.cabin_class,
          passengers: String(booking.passengers || 1),
          airline: (booking as any).airline || "",
          flight_number: (booking as any).flight_number || "",
          total_price: String(Number(booking.total_amount) * Number(booking.passengers || 1)),
          currency: booking.currency || "USD",
          ticket_numbers: booking.ticket_numbers,
          pnr: booking.pnr,
        },
      },
    }).catch(() => { /* silent — email is best-effort */ });
  }, [isIssued, booking]);

  // Send push notification based on ticketing status
  useEffect(() => {
    if (!booking || notifiedRef.current) return;
    if (isIssued) {
      notifiedRef.current = true;
      notifyFlight("booking_confirmed", {
        bookingId: booking.id,
        body: `Your flight ${booking.origin} → ${booking.destination} is confirmed! Ref: ${booking.booking_reference}`,
      });
    } else if (isFailed) {
      notifiedRef.current = true;
      notifyFlight("booking_failed", {
        bookingId: booking.id,
        body: "Ticketing failed. Please contact support or try rebooking.",
      });
    }
  }, [isIssued, isFailed, booking, notifyFlight]);

  const handleCopyRef = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    toast({ title: "Copied!", description: "Booking reference copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!booking) return;
    openShareToChat({
      kind: "flight",
      title: `${booking.origin} → ${booking.destination}`,
      subtitle: booking.departure_date || undefined,
      meta: `Ref: ${booking.booking_reference}`,
      deepLink: `/flights/confirmation/${(booking as { id?: string; booking_id?: string }).booking_id ?? booking.id}`,
      image: null,
      badge: "ZIVO",
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead title="Booking Confirmation – ZIVO Flights" description="Your flight booking confirmation." />

      {/* Decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[hsl(var(--flights))]/6 blur-3xl" />
        <div className="absolute bottom-20 -left-32 w-64 h-64 rounded-full bg-primary/4 blur-3xl" />
        {isIssued && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
        )}
      </div>

      <Header />

      <main className="pt-20 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-lg">
          {/* Loading */}
          {isLoading && (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-7 h-7 animate-spin text-[hsl(var(--flights))]" />
              </div>
              <p className="text-muted-foreground">Loading your booking...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <p className="font-medium mb-2">Could not load booking</p>
              <p className="text-sm text-muted-foreground mb-4">The booking may not exist or you may not have access.</p>
              <Button variant="outline" asChild><Link to="/flights">Back to Flights</Link></Button>
            </div>
          )}

          {booking && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Step indicator */}
              <CheckoutStepIndicator
                steps={isProcessing ? PROCESSING_STEPS : CONFIRM_STEPS}
                className="mb-6"
              />

              {/* Status hero */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, damping: 12 }}
                  className={cn(
                    "w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                    isIssued && "bg-emerald-500/10",
                    isFailed && "bg-destructive/10",
                    isProcessing && "bg-[hsl(var(--flights))]/10",
                  )}
                >
                  {isIssued ? (
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  ) : isFailed ? (
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  ) : (
                    <Loader2 className="w-8 h-8 text-[hsl(var(--flights))] animate-spin" />
                  )}
                </motion.div>
                <h1 className="text-2xl font-bold mb-1">
                  {isIssued ? "Booking Confirmed!" : isFailed ? "Booking Issue" : statusInfo?.label}
                </h1>
                <p className="text-sm text-muted-foreground">{statusInfo?.description}</p>
              </div>

              {/* FAILED: Support contact */}
              {isFailed && (
                <Card className="mb-4 border-destructive/20 bg-destructive/5">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-destructive">Ticketing Failed</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          There was an issue creating your airline ticket. Your payment may be held temporarily.
                          Our team is reviewing this automatically.
                        </p>
                      </div>
                    </div>
                    <Separator className="mb-4 bg-destructive/10" />
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Contact Support</p>
                    <div className="space-y-2.5">
                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors">
                        <Mail className="w-4 h-4 text-muted-foreground" /> support@hizovo.com
                      </button>
                      <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-3 text-sm hover:text-[hsl(var(--flights))] transition-colors">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" /> Help Center
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">
                      Reference: <span className="font-mono font-medium">{booking.booking_reference}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* SUCCESS: Green confirmation */}
              {isIssued && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                >
                  <div className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">E-ticket issued</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confirmation sent to your email. Present your booking reference at check-in.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Itinerary card */}
              <Card className="bg-card/80 backdrop-blur-xl border-border/40 mb-4 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[hsl(var(--flights))] to-[hsl(var(--flights))]/50" />
                <CardContent className="p-5 space-y-4">
                  {/* Booking ref with copy */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Booking Reference</span>
                    <button type="button"
                      onClick={handleCopyRef}
                      className="flex items-center gap-1.5 font-mono font-bold text-base tracking-wider hover:text-[hsl(var(--flights))] transition-colors"
                    >
                      {booking.booking_reference}
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>

                  {booking.pnr && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">PNR</span>
                      <span className="font-mono font-bold tracking-wider">{booking.pnr}</span>
                    </div>
                  )}

                  <Separator className="bg-border/30" />

                  {/* Route visual */}
                  <div className="py-4 px-3 bg-muted/20 rounded-xl border border-border/20">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{booking.origin}</p>
                      </div>
                      <div className="flex-1 px-4 flex flex-col items-center gap-1">
                        <Plane className="w-5 h-5 text-[hsl(var(--flights))] -rotate-12" />
                        <div className="w-full h-px bg-[hsl(var(--flights))]/30" />
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{booking.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{booking.departure_date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{String(booking.passengers)} traveler{Number(booking.passengers) > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="capitalize">{String(booking.cabin_class || "economy").replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <Badge variant="outline" className={cn(
                        "text-[10px] px-1.5 py-0",
                        booking.payment_status === "paid" && "border-emerald-500/30 text-emerald-600",
                      )}>
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-border/30" />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Paid</span>
                    <span className="text-2xl font-bold text-[hsl(var(--flights))] tabular-nums">
                      {formatCurrency(
                        Number(booking.total_amount) * Number(booking.passengers || 1),
                        String(booking.currency || "USD")
                      )}
                    </span>
                  </div>

                  {/* Passengers */}
                  {booking.flight_passengers && Array.isArray(booking.flight_passengers) && booking.flight_passengers.length > 0 && (
                    <>
                      <Separator className="bg-border/30" />
                      <div>
                        <p className="text-sm font-medium mb-2">Travelers</p>
                        <div className="space-y-1">
                          {booking.flight_passengers.map((fp: any) => (
                            <p key={fp.id} className="text-sm text-muted-foreground">
                              {fp.given_name} {fp.family_name}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Ticket numbers */}
              {booking.ticket_numbers && Array.isArray(booking.ticket_numbers) && booking.ticket_numbers.length > 0 && (
                <Card className="mb-4 bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-500" />
                      E-Ticket Numbers
                    </p>
                    {(booking.ticket_numbers as string[]).map((t: string, i: number) => (
                      <p key={i} className="font-mono text-sm text-muted-foreground">{t}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center p-4 rounded-xl bg-[hsl(var(--flights))]/5 border border-[hsl(var(--flights))]/20 mb-4"
                >
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[hsl(var(--flights))]" />
                  <p className="text-sm font-medium">Your ticket is being processed</p>
                  <p className="text-xs text-muted-foreground">This page updates automatically</p>
                </motion.div>
              )}

              {/* Quick actions: Share, Copy & Download */}
              {isIssued && (
                <div className="flex gap-2 mb-4">
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex-1 rounded-xl border-border/40 gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <DownloadItinerary
                    booking={{
                      booking_reference: booking.booking_reference,
                      pnr: booking.pnr,
                      origin: booking.origin,
                      destination: booking.destination,
                      departure_date: booking.departure_date,
                      return_date: booking.return_date,
                      cabin_class: booking.cabin_class as string,
                      passengers: Number(booking.passengers || 1),
                      total_amount: Number(booking.total_amount),
                      currency: String(booking.currency || "USD"),
                      ticket_numbers: booking.ticket_numbers as string[] | null,
                      payment_status: booking.payment_status,
                      flight_passengers: Array.isArray(booking.flight_passengers) ? booking.flight_passengers.map((fp: any) => ({
                        given_name: fp.given_name,
                        family_name: fp.family_name,
                        email: fp.email,
                      })) : [],
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleCopyRef}
                    className="rounded-xl border-border/40 gap-2 px-3"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              {/* Cross-sell: Hotels & Cars */}
              {isIssued && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mb-6"
                >
                  <p className="text-sm font-semibold mb-3">Complete your trip</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to={`/hotels?destination=${booking.destination}`}>
                      <Card className="bg-[hsl(var(--hotels))]/5 border-[hsl(var(--hotels))]/20 hover:border-[hsl(var(--hotels))]/40 transition-all cursor-pointer group">
                        <CardContent className="p-4 text-center">
                          <Hotel className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--hotels))]" />
                          <p className="text-sm font-semibold">Find Hotels</p>
                          <p className="text-[11px] text-muted-foreground">in {booking.destination}</p>
                          <ArrowRight className="w-3.5 h-3.5 mx-auto mt-2 text-muted-foreground group-hover:text-[hsl(var(--hotels))] transition-colors" />
                        </CardContent>
                      </Card>
                    </Link>
                    <Link to={`/cars?destination=${booking.destination}`}>
                      <Card className="bg-[hsl(var(--cars))]/5 border-[hsl(var(--cars))]/20 hover:border-[hsl(var(--cars))]/40 transition-all cursor-pointer group">
                        <CardContent className="p-4 text-center">
                          <Car className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--cars))]" />
                          <p className="text-sm font-semibold">Rent a Car</p>
                          <p className="text-[11px] text-muted-foreground">in {booking.destination}</p>
                          <ArrowRight className="w-3.5 h-3.5 mx-auto mt-2 text-muted-foreground group-hover:text-[hsl(var(--cars))] transition-colors" />
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Unified cross-service follow-ups (ride to airport + hotel) */}
              {isIssued && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="mb-6"
                >
                  <CrossServiceCTAs
                    variant="after-flight"
                    title="Round out your trip"
                    context={{
                      destinationCity: booking.destination,
                      airportCode: booking.origin,
                      departureDate: booking.departure_date,
                      arrivalDate: booking.departure_date,
                    }}
                  />
                </motion.div>
              )}

              {/* Primary actions */}
              <div className="flex flex-col gap-3 mb-8">
                {isIssued && booking?.departure_date && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadICS(
                        {
                          title: `Flight ${booking.origin} → ${booking.destination}`,
                          description: `Booking ref ${booking.booking_reference} · Booked via ZIVO`,
                          start: `${booking.departure_date}T08:00:00`,
                          end: `${booking.departure_date}T11:00:00`,
                          location: booking.origin,
                          url: typeof window !== "undefined" ? window.location.href : undefined,
                          uid: `flight-${booking.id}@zivo.app`,
                        },
                        `zivo-flight-${booking.booking_reference}`,
                      )
                    }
                    className="w-full h-12 rounded-xl border-border/40 gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" /> Add to calendar
                  </Button>
                )}
                <Button asChild className="w-full h-12 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 rounded-xl font-bold active:scale-[0.98] transition-all">
                  <Link to="/flights/bookings">My Bookings</Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-12 rounded-xl border-border/40">
                  <Link to="/flights">Search More Flights</Link>
                </Button>
              </div>

              {/* Trust footer */}
              <CheckoutTrustFooter />
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FlightConfirmation;
