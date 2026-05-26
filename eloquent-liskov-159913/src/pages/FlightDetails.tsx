/**
 * Flight Review Page — /flights/details/:id
 * Shows selected offer details before continuing to passenger info
 * 2026 Spatial UI
 */

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plane, Clock, Luggage, RefreshCw, AlertTriangle, Shield, ChevronDown, ChevronUp, Briefcase, Share2 } from "lucide-react";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type DuffelOffer, type DuffelSegment } from "@/hooks/useDuffelFlights";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { cn } from "@/lib/utils";

const FlightDetails = () => {
  const navigate = useNavigate();
  const [showSegments, setShowSegments] = useState(false);

  const offerRaw = sessionStorage.getItem("zivo_selected_offer");
  const searchRaw = sessionStorage.getItem("zivo_search_params");
  const offer: DuffelOffer | null = offerRaw ? JSON.parse(offerRaw) : null;
  const search = searchRaw ? JSON.parse(searchRaw) : null;

  useEffect(() => {
    if (!offer) navigate("/flights", { replace: true });
  }, [offer, navigate]);

  if (!offer || !search) return null;

  const totalPassengers = (search.adults || 1) + (search.children || 0) + (search.infants || 0);
  const totalPrice = Math.round(offer.price * totalPassengers);
  const segments = offer.segments || [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead title={`${offer.departure.code} → ${offer.arrival.code} – ZIVO Flights`} description="Review your selected flight." />

      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[hsl(var(--flights))]/6 blur-3xl" />
        <div className="absolute bottom-20 -left-32 w-64 h-64 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <Header />

      <main className="pt-20 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-5"
          >
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Review Flight</h1>
              <p className="text-sm text-muted-foreground">Confirm details before continuing</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Share to chat"
              onClick={() => openShareToChat({
                kind: "flight",
                title: `${offer.departure.code} → ${offer.arrival.code}`,
                subtitle: `${search.departureDate}${search.returnDate ? ` — ${search.returnDate}` : ""} · ${offer.airline}`,
                meta: `From $${totalPrice}`,
                deepLink: "/flights",
                image: null,
              })}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Main flight card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="mb-4 bg-card/80 backdrop-blur-xl border-border/40 overflow-hidden">
              {/* Airline banner */}
              <div className="p-4 pb-3 flex items-center gap-3 border-b border-border/30">
                <AirlineLogo
                  iataCode={offer.carriers?.[0]?.code || offer.airlineCode}
                  airlineName={offer.airline}
                  size={44}
                  className="border border-border/20 bg-muted/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{offer.airline}</p>
                  <p className="text-xs text-muted-foreground">{offer.flightNumber}</p>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] border-border/30 bg-muted/30">
                  {offer.cabinClass}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Route visual */}
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-bold tabular-nums">{offer.departure.time}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--flights))]">{offer.departure.code}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{offer.departure.city}</p>
                  </div>

                  <div className="flex flex-col items-center flex-1">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {offer.duration}
                    </span>
                    <div className="w-full h-px bg-border/60 relative my-2">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[hsl(var(--flights))] border-2 border-card" />
                      {offer.stops > 0 && Array.from({ length: Math.min(offer.stops, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/40"
                          style={{ left: `${((i + 1) / (offer.stops + 1)) * 100}%` }}
                        />
                      ))}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[hsl(var(--flights))] border-2 border-card" />
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      offer.stops === 0 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
                      {offer.stopCities?.length > 0 && ` via ${offer.stopCities.join(", ")}`}
                    </span>
                  </div>

                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-bold tabular-nums">{offer.arrival.time}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--flights))]">{offer.arrival.code}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{offer.arrival.city}</p>
                  </div>
                </div>

                {/* Date & passengers */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] border-border/30 bg-muted/20">
                    {search.departureDate}{search.returnDate ? ` — ${search.returnDate}` : ""}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-border/30 bg-muted/20">
                    {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""}
                  </Badge>
                  {offer.baggageIncluded && (
                    <Badge variant="outline" className="text-[10px] border-border/30 bg-muted/20 gap-1">
                      <Luggage className="w-2.5 h-2.5" />
                      {offer.baggageIncluded}
                    </Badge>
                  )}
                  {offer.isRefundable && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
                      Refundable
                    </Badge>
                  )}
                </div>

                {/* Segments detail toggle */}
                {segments.length > 0 && (
                  <>
                    <button type="button"
                      onClick={() => setShowSegments(!showSegments)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--flights))] hover:underline transition-colors"
                    >
                      {showSegments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {showSegments ? "Hide" : "Show"} {segments.length} segment{segments.length > 1 ? "s" : ""}
                    </button>

                    {showSegments && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3 overflow-hidden"
                      >
                        {segments.map((seg: DuffelSegment, i: number) => (
                          <div key={seg.id || i} className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold">{seg.origin?.code} → {seg.destination?.code}</span>
                              <span className="text-xs text-muted-foreground">{seg.duration}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {seg.operatingCarrier || seg.marketingCarrier} · {seg.flightNumber}
                              {seg.aircraft && ` · ${seg.aircraft}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {seg.origin?.name}{seg.origin?.terminal ? ` T${seg.origin.terminal}` : ""} → {seg.destination?.name}{seg.destination?.terminal ? ` T${seg.destination.terminal}` : ""}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Fare summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-4 bg-card/80 backdrop-blur-xl border-border/40">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Fare Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base fare × {totalPassengers}</span>
                    <span className="tabular-nums">${Math.round(offer.price * 0.7 * totalPassengers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & fees</span>
                    <span className="tabular-nums">${Math.round(offer.price * 0.3 * totalPassengers)}</span>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-lg text-[hsl(var(--flights))] tabular-nums">${totalPrice} {offer.currency || "USD"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conditions notice */}
          {offer.conditions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4 p-3.5 rounded-xl bg-muted/30 border border-border/30 space-y-2"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fare Conditions</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  Changes before departure: {offer.conditions.changeable ? "Allowed" : "Not allowed"}
                  {offer.conditions.changeable && offer.conditions.changePenalty != null && offer.conditions.changePenalty > 0 && (
                    <span className="text-muted-foreground/70 ml-1">(fee: {offer.conditions.penaltyCurrency} {offer.conditions.changePenalty})</span>
                  )}
                </p>
                <p className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 shrink-0" />
                  Refund before departure: {offer.conditions.refundable ? "Allowed" : "Not allowed"}
                  {offer.conditions.refundable && offer.conditions.refundPenalty != null && offer.conditions.refundPenalty > 0 && (
                    <span className="text-muted-foreground/70 ml-1">(fee: {offer.conditions.penaltyCurrency} {offer.conditions.refundPenalty})</span>
                  )}
                </p>
                {offer.baggageDetails && (
                  <>
                    <p className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      Carry-on bag: {offer.baggageDetails.carryOnIncluded ? "Included" : "Not included"}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      Checked bags: {offer.baggageDetails.checkedBagsIncluded ? `${offer.baggageDetails.checkedBagQuantity} included` : "Not included"}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Live booking notice */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20"
          >
            <div className="flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-amber-700 dark:text-amber-500">Live booking.</span>{" "}
                Proceeding will create a real airline reservation. Cancellation policies apply per airline rules.
              </p>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <Button
              size="lg"
              onClick={() => navigate("/flights/traveler-info")}
              className="w-full h-12 text-base font-semibold gap-2 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 shadow-lg shadow-[hsl(var(--flights))]/20 active:scale-[0.98] transition-all"
            >
              Continue to Passenger Details
            </Button>
            <Button
              variant="outline"
              className="w-full border-border/40"
              onClick={() => navigate(-1)}
            >
              Back to Results
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FlightDetails;
