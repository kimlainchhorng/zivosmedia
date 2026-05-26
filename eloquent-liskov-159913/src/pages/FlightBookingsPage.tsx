/**
 * Flight Booking History Page — /flights/bookings
 * Premium booking management with filters, status tabs, cancellation, and detail modal
 */

import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Plane, ArrowLeft, Clock, CheckCircle, AlertCircle, XCircle,
  Loader2, ChevronRight, Calendar, Users, Mail, MessageCircle,
  Ticket, CreditCard, Search, Filter, Copy, Check, Share2,
  RefreshCw, ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useFlightBookings, useFlightBooking, useRequestFlightRefund, canRequestRefund, getTicketingStatusInfo } from "@/hooks/useFlightBooking";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import PullToRefresh from "@/components/shared/PullToRefresh";

type FilterTab = "all" | "upcoming" | "issued" | "processing" | "cancelled";

const FILTER_TABS: { key: FilterTab; label: string; icon: typeof Plane }[] = [
  { key: "all", label: "All", icon: Plane },
  { key: "upcoming", label: "Upcoming", icon: Calendar },
  { key: "issued", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Clock },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

const statusIcons: Record<string, typeof CheckCircle> = {
  issued: CheckCircle,
  failed: AlertCircle,
  cancelled: XCircle,
  voided: XCircle,
  pending: Clock,
  processing: Loader2,
};

const statusColors: Record<string, string> = {
  issued: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5",
  failed: "text-destructive border-destructive/30 bg-destructive/5",
  cancelled: "text-muted-foreground border-border bg-muted/30",
  voided: "text-muted-foreground border-border bg-muted/30",
  pending: "text-amber-600 border-amber-500/30 bg-amber-500/5",
  processing: "text-[hsl(var(--flights))] border-[hsl(var(--flights))]/30 bg-[hsl(var(--flights))]/5",
};

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

export default function FlightBookingsPage() {
  const { data: bookings, isLoading, error, refetch } = useFlightBookings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handlePullRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    let filtered = [...bookings];

    // Filter by tab
    if (activeTab === "upcoming") {
      filtered = filtered.filter((b: any) => {
        const dep = new Date(b.departure_date);
        return dep >= new Date() && b.ticketing_status === "issued";
      });
    } else if (activeTab === "issued") {
      filtered = filtered.filter((b: any) => b.ticketing_status === "issued");
    } else if (activeTab === "processing") {
      filtered = filtered.filter((b: any) => ["pending", "processing"].includes(b.ticketing_status));
    } else if (activeTab === "cancelled") {
      filtered = filtered.filter((b: any) => ["cancelled", "voided", "failed"].includes(b.ticketing_status));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((b: any) =>
        b.booking_reference?.toLowerCase().includes(q) ||
        b.origin?.toLowerCase().includes(q) ||
        b.destination?.toLowerCase().includes(q) ||
        b.pnr?.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [bookings, activeTab, searchQuery, sortNewest]);

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead title="My Flight Bookings – ZIVO" description="View and manage your flight bookings." />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[hsl(var(--flights))]/6 blur-3xl" />
      </div>

      <Header />

      <main className="pt-20 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 mb-4"
          >
            <div className="flex items-center gap-3">
              <Button aria-label="Back to flights" variant="ghost" size="icon" asChild className="shrink-0 rounded-xl">
                <Link to="/flights"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">My Bookings</h1>
                <p className="text-xs text-muted-foreground">
                  {bookings && bookings.length > 0 ? `${bookings.length} booking${bookings.length > 1 ? "s" : ""}` : "Flight history"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button aria-label="Refresh" variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button asChild variant="outline" size="sm" className="border-border/40 rounded-xl">
                <Link to="/flights">New Search</Link>
              </Button>
            </div>
          </motion.div>

          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ref, route, PNR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-card/80 border-border/40 h-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortNewest(!sortNewest)}
              className="rounded-xl border-border/40 shrink-0"
              title={sortNewest ? "Newest first" : "Oldest first"}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Filter tabs — horizontal scroll */}
          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {FILTER_TABS.map(({ key, label, icon: Icon }) => (
              <button type="button"
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                  activeTab === key
                    ? "bg-[hsl(var(--flights))] text-white shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
                {key !== "all" && bookings && (
                  <span className="text-[10px] opacity-70">
                    ({key === "upcoming"
                      ? bookings.filter((b: any) => new Date(b.departure_date) >= new Date() && b.ticketing_status === "issued").length
                      : key === "issued"
                      ? bookings.filter((b: any) => b.ticketing_status === "issued").length
                      : key === "processing"
                      ? bookings.filter((b: any) => ["pending", "processing"].includes(b.ticketing_status)).length
                      : bookings.filter((b: any) => ["cancelled", "voided", "failed"].includes(b.ticketing_status)).length
                    })
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-card/60 border-border/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1.5" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <Card className="border-destructive/20">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
                <p className="font-medium mb-2">Could not load bookings</p>
                <p className="text-sm text-muted-foreground mb-4">Please try again later.</p>
                <Button variant="outline" onClick={() => refetch()}>Retry</Button>
              </CardContent>
            </Card>
          )}

          {/* Empty */}
          {!isLoading && !error && bookings && filteredBookings.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/40 bg-card/80 backdrop-blur-xl">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center mx-auto mb-4">
                    {activeTab === "all" ? (
                      <Plane className="w-7 h-7 text-[hsl(var(--flights))]" />
                    ) : (
                      <Filter className="w-7 h-7 text-[hsl(var(--flights))]" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold mb-1.5">
                    {activeTab === "all" && !searchQuery ? "No Bookings Yet" : "No results"}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                    {activeTab === "all" && !searchQuery
                      ? "Book your first flight to see it here."
                      : `No bookings match "${searchQuery || activeTab}" filter.`}
                  </p>
                  {activeTab === "all" && !searchQuery ? (
                    <Button asChild className="bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 rounded-xl">
                      <Link to="/flights">Search Flights</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => { setActiveTab("all"); setSearchQuery(""); }} className="rounded-xl">
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bookings list */}
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredBookings.map((booking: any, idx: number) => {
                const status = getTicketingStatusInfo(booking.ticketing_status || "pending");
                const StatusIcon = statusIcons[booking.ticketing_status] || Clock;
                const colorClass = statusColors[booking.ticketing_status] || statusColors.pending;
                const airlineCode = booking.airline_code || "";
                const isUpcoming = new Date(booking.departure_date) >= new Date();

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Card
                      className="bg-card/80 backdrop-blur-sm border-border/40 hover:border-[hsl(var(--flights))]/30 hover:shadow-lg hover:shadow-[hsl(var(--flights))]/5 transition-all duration-200 cursor-pointer group active:scale-[0.99] overflow-hidden"
                      onClick={() => setSelectedId(booking.id)}
                    >
                      {/* Top accent for upcoming */}
                      {isUpcoming && booking.ticketing_status === "issued" && (
                        <div className="h-0.5 bg-gradient-to-r from-[hsl(var(--flights))] to-[hsl(var(--flights))]/40" />
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <AirlineLogo
                              iataCode={airlineCode || "XX"}
                              airlineName={airlineCode}
                              size={40}
                              className="border border-border/20 bg-muted/40 shrink-0"
                            />
                            <div>
                              <span className="font-semibold text-sm block">
                                {booking.origin} → {booking.destination}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {booking.departure_date}
                                {isUpcoming && booking.ticketing_status === "issued" && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-[hsl(var(--flights))]/30 text-[hsl(var(--flights))] ml-1">
                                    Upcoming
                                  </Badge>
                                )}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", colorClass)}>
                            <StatusIcon className={cn("w-3 h-3", booking.ticketing_status === "processing" && "animate-spin")} />
                            {status.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {String(booking.passengers)} pax
                            </span>
                            <span className="font-mono">{booking.booking_reference}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[hsl(var(--flights))] tabular-nums">
                              {formatCurrency(Number(booking.total_amount), String(booking.currency || "USD"))}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--flights))] transition-colors" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      </main>

      <BookingDetailsModal bookingId={selectedId} onClose={() => setSelectedId(null)} />
      <Footer />
    </PullToRefresh>
  );
}

/* ─── Detail Modal ─── */
function BookingDetailsModal({ bookingId, onClose }: { bookingId: string | null; onClose: () => void }) {
  const { data: booking, isLoading } = useFlightBooking(bookingId);
  const refundMutation = useRequestFlightRefund();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);

  if (!bookingId) return null;

  const statusInfo = booking ? getTicketingStatusInfo(booking.ticketing_status) : null;
  const StatusIcon = booking ? (statusIcons[booking.ticketing_status] || Clock) : Clock;
  const colorClass = booking ? (statusColors[booking.ticketing_status] || statusColors.pending) : "";
  const refundEligible = booking ? canRequestRefund(booking as any) : false;

  const handleCopy = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefund = () => {
    if (!booking) return;
    refundMutation.mutate(
      { bookingId: booking.id, reason: "Customer requested cancellation" },
      { onSuccess: () => { setShowRefundConfirm(false); onClose(); } }
    );
  };

  return (
    <>
      <Dialog open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/40 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-[hsl(var(--flights))]" />
              Booking Details
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[hsl(var(--flights))]" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {booking && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn("text-xs gap-1", colorClass)}>
                  <StatusIcon className={cn("w-3 h-3", booking.ticketing_status === "processing" && "animate-spin")} />
                  {statusInfo?.label}
                </Badge>
              </div>

              {/* Route */}
              <div className="text-center py-4 bg-muted/20 rounded-xl border border-border/20">
                <div className="flex items-center justify-center gap-3">
                  <p className="text-2xl font-bold">{booking.origin}</p>
                  <Plane className="w-5 h-5 text-[hsl(var(--flights))] -rotate-12" />
                  <p className="text-2xl font-bold">{booking.destination}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{booking.departure_date}</p>
              </div>

              <Separator className="bg-border/30" />

              {/* Info rows */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Ref</span>
                  <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 font-mono font-bold hover:text-[hsl(var(--flights))] transition-colors">
                    {booking.booking_reference}
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
                {booking.pnr && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PNR</span>
                    <span className="font-mono font-bold">{booking.pnr}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Passengers</span>
                  <span>{String(booking.passengers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Cabin</span>
                  <span className="capitalize">{String(booking.cabin_class || "economy").replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payment</span>
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1.5 py-0",
                    booking.payment_status === "paid" && "border-emerald-500/30 text-emerald-600"
                  )}>
                    {booking.payment_status}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-[hsl(var(--flights))] tabular-nums">
                  {formatCurrency(Number(booking.total_amount) * Number(booking.passengers || 1), String(booking.currency || "USD"))}
                </span>
              </div>

              {/* Passengers */}
              {booking.flight_passengers && Array.isArray(booking.flight_passengers) && booking.flight_passengers.length > 0 && (
                <>
                  <Separator className="bg-border/30" />
                  <div>
                    <p className="text-sm font-medium mb-2">Travelers</p>
                    {booking.flight_passengers.map((fp: any) => (
                      <p key={fp.id} className="text-sm text-muted-foreground">{fp.given_name} {fp.family_name}</p>
                    ))}
                  </div>
                </>
              )}

              {/* Ticket numbers */}
              {booking.ticket_numbers && Array.isArray(booking.ticket_numbers) && booking.ticket_numbers.length > 0 && (
                <>
                  <Separator className="bg-border/30" />
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-emerald-500" />
                      E-Tickets
                    </p>
                    {(booking.ticket_numbers as string[]).map((t: string, i: number) => (
                      <p key={i} className="font-mono text-sm text-muted-foreground">{t}</p>
                    ))}
                  </div>
                </>
              )}

              {/* Failed support */}
              {booking.ticketing_status === "failed" && (
                <>
                  <Separator className="bg-border/30" />
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                    <p className="text-xs font-semibold text-destructive">Need help?</p>
                    <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizovo.com"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="w-3.5 h-3.5" /> support@hizovo.com
                    </button>
                    <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://hizovo.com/help"))} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> Help Center
                    </button>
                  </div>
                </>
              )}

              {/* Processing */}
              {(booking.ticketing_status === "pending" || booking.ticketing_status === "processing") && (
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--flights))]/5 border border-[hsl(var(--flights))]/20">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[hsl(var(--flights))]" />
                  <p className="text-xs font-medium">{statusInfo?.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Button asChild className="w-full bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 rounded-xl active:scale-[0.98]">
                  <Link to={`/flights/confirmation/${booking.id}`}>View Full Details</Link>
                </Button>
                {refundEligible && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRefundConfirm(true)}
                    className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                  >
                    Request Cancellation
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund confirmation */}
      <Dialog open={showRefundConfirm} onOpenChange={setShowRefundConfirm}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Request Cancellation
            </DialogTitle>
            <DialogDescription>
              This will submit a cancellation request for booking <span className="font-mono font-bold">{booking?.booking_reference}</span>.
              Refunds are subject to airline fare rules and cancellation fees may apply.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRefundConfirm(false)} className="w-full sm:w-auto rounded-xl">
              Keep Booking
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundMutation.isPending}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 rounded-xl gap-2"
            >
              {refundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
