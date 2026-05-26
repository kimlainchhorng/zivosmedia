/**
 * Booking Management Page
 * Fetches real booking data from travel_orders table
 */

import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Plane,
  Calendar,
  Users,
  FileText,
  Phone,
  Mail,
  Download,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Info,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type TicketStatus = "issued" | "pending" | "changed" | "cancelled";

interface BookingDetails {
  bookingRef: string;
  airlineCode: string;
  status: TicketStatus;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureDate: string;
  passengers: number;
  cabinClass: string;
  providerPhone: string;
  providerEmail: string;
  changePolicy: string;
  cancelPolicy: string;
  baggagePolicy: string;
  refundEligibility: string;
}

const statusConfig: Record<TicketStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  issued: {
    label: "Ticket Issued",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  changed: {
    label: "Changed",
    icon: AlertCircle,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
};

const BookingManagement = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-management", bookingId, user?.id],
    queryFn: async (): Promise<BookingDetails | null> => {
      if (!user?.id || !bookingId) return null;

      // Fetch order + items
      const { data: order } = await supabase
        .from("travel_orders")
        .select("*, travel_order_items(*)")
        .eq("user_id", user.id)
        .eq("order_number", bookingId)
        .maybeSingle();

      if (!order) return null;

      const items = (order as any).travel_order_items || [];
      const flightItem = items.find((i: any) => i.type === "flight") || items[0];
      const meta = (flightItem?.meta as any) || {};

      const statusMap: Record<string, TicketStatus> = {
        confirmed: "issued",
        pending: "pending",
        cancelled: "cancelled",
      };

      return {
        bookingRef: order.order_number || bookingId,
        airlineCode: meta.airline_code || meta.flightNumber || "—",
        status: statusMap[order.status || "pending"] || "pending",
        flightNumber: meta.flightNumber || "—",
        airline: meta.airline || order.provider || "Travel Partner",
        origin: meta.origin || flightItem?.title?.split("→")?.[0]?.trim() || "—",
        destination: meta.destination || flightItem?.title?.split("→")?.[1]?.trim() || "—",
        departureDate: flightItem?.start_date
          ? new Date(flightItem.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "—",
        passengers: flightItem?.adults || 1,
        cabinClass: meta.cabin_class || "Economy",
        providerPhone: meta.provider_phone || "Contact via partner website",
        providerEmail: meta.provider_email || "support@partner.com",
        changePolicy: flightItem?.cancellation_policy || "Please check the partner's website for change and modification policies.",
        cancelPolicy: flightItem?.cancellation_policy || "Please check the partner's website for cancellation policies.",
        baggagePolicy: meta.baggage_policy || "Please check the partner's website for baggage allowance details.",
        refundEligibility: meta.refund_policy || "Refund eligibility is governed by the travel partner's rules.",
      };
    },
    enabled: !!user?.id && !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find a booking with reference "{bookingId}".</p>
            <Button onClick={() => navigate("/my-trips")}>View My Trips</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const status = statusConfig[booking.status];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Booking ${bookingId} | ZIVO`}
        description="Manage your booking, view ticket status, and access provider contact information."
        canonical={`https://hizivo.com/bookings/${bookingId}`}
      />
      <Header />

      <main className="pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="container mx-auto px-4 max-w-3xl">
          {/* Back Navigation */}
          <Link
            to="/my-trips"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Trips
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold mb-2">
                  Booking Management
                </h1>
                <p className="text-muted-foreground">
                  Reference: <span className="font-mono font-semibold text-foreground">{booking.bookingRef}</span>
                </p>
              </div>
              <Badge className={cn(status.bg, status.color, "border-0 gap-1.5 py-1.5 px-3")}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Flight Details Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-primary" />
                Flight Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {booking.origin.split(" (")[0]} → {booking.destination.split(" (")[0]}
                  </p>
                  <p className="text-muted-foreground">
                    {booking.airline} {booking.flightNumber}
                  </p>
                </div>
                <Badge variant="outline">{booking.cabinClass}</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <p className="font-medium">{booking.departureDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Passengers</p>
                    <p className="font-medium">{booking.passengers} Adult{booking.passengers > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Airline Confirmation: <span className="font-mono font-semibold text-foreground">{booking.airlineCode}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Booking Rules Accordion */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Booking Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="changes" className="border-border/50">
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Change Policy
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {booking.changePolicy}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cancel" className="border-border/50">
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Cancellation Policy
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {booking.cancelPolicy}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="baggage" className="border-border/50">
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      Baggage Allowance
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {booking.baggagePolicy}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="refund" className="border-border/50">
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Refund Eligibility
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {booking.refundEligibility}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Provider Contact Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
                Provider Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{booking.airline}</p>
                  <p className="text-sm text-muted-foreground">Operating Carrier</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <a
                  href={`tel:${booking.providerPhone.replace(/-/g, "")}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] touch-manipulation"
                >
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{booking.providerPhone}</span>
                </a>
                <a
                  href={`mailto:${booking.providerEmail}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-all duration-200 active:scale-[0.98] touch-manipulation"
                >
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{booking.providerEmail}</span>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button className="gap-2">
              <Download className="w-4 h-4" />
              Download E-Ticket
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/help">
                <MessageCircle className="w-4 h-4" />
                Request Support
              </Link>
            </Button>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: Phone, label: "Call Airline", action: () => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl(`tel:${booking.providerPhone.replace(/-/g, "")}`)) },
              { icon: Mail, label: "Email Airline", action: () => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl(`mailto:${booking.providerEmail}`)) },
              { icon: FileText, label: "View Receipt", action: () => {} },
              { icon: ExternalLink, label: "Airline Website", action: () => {} },
            ].map((act) => (
              <button type="button"
                key={act.label}
                onClick={act.action}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 active:scale-[0.98] touch-manipulation"
              >
                <act.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{act.label}</span>
              </button>
            ))}
          </div>

          {/* Booking Timeline */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "Dec 15, 2025", event: "Booking created on ZIVO", status: "complete" },
                  { time: "Dec 15, 2025", event: "Redirected to partner checkout", status: "complete" },
                  { time: "Dec 15, 2025", event: "Payment processed by partner", status: "complete" },
                  { time: "Dec 15, 2025", event: "E-ticket issued", status: "complete" },
                  { time: "Feb 10, 2026", event: "Departure day", status: "upcoming" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      item.status === "complete" ? "bg-primary/10" : "bg-muted"
                    )}>
                      {item.status === "complete" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.event}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Travel Tips */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pre-Flight Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Check passport validity (6+ months)",
                  "Review baggage allowance",
                  "Online check-in (24hrs before)",
                  "Download airline app",
                  "Confirm seat selection",
                  "Review travel insurance",
                ].map((tip) => (
                  <div key={tip} className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Important Information</p>
                <p className="text-muted-foreground">
                  For changes, cancellations, or refunds, please contact the airline directly using the details above.
                  ZIVO facilitates the booking but does not control fare conditions or airline policies.
                </p>
                <p className="text-muted-foreground">
                  Refunds and changes are governed by the airline or travel provider's rules.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingManagement;
