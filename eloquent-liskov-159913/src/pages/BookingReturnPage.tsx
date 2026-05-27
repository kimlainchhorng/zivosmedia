/**
 * Booking Return Page
 * 
 * Handles callback from partner checkout at /booking/return
 * 
 * Partners send:
 * - bookingRef (or confirmation_number, ref, orderId)
 * - status (success, failed, pending)
 * - subid (our search session ID)
 * 
 * On return we:
 * 1. Read subid from URL
 * 2. Match it to SearchSession
 * 3. Save bookingRef
 * 4. Mark as Converted
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Plane,
  Hotel,
  CarFront,
  ArrowRight,
  HelpCircle,
  Clock,
  Mail,
  Search,
  ShieldCheck,
  ExternalLink,
  Info,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { 
  parseBookingReturnParams, 
  processBookingReturn,
  type BookingReturnResult 
} from "@/lib/bookingReturnHandler";
import { BookingSupportPanel } from "@/components/flight";
import { FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";

type PageStatus = "loading" | "converted" | "failed" | "pending" | "unknown";

const serviceConfig = {
  flights: {
    icon: Plane,
    label: "Flight",
    color: "text-flights",
    bgColor: "bg-flights/10",
  },
  hotels: {
    icon: Hotel,
    label: "Hotel",
    color: "text-hotels",
    bgColor: "bg-hotels/10",
  },
  cars: {
    icon: CarFront,
    label: "Car Rental",
    color: "text-cars",
    bgColor: "bg-cars/10",
  },
};

export default function BookingReturnPage() {
  const [searchParams] = useSearchParams();
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [result, setResult] = useState<BookingReturnResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Parse and process on mount
  useEffect(() => {
    const processReturn = async () => {
      // Parse URL params (handles various partner formats)
      const params = parseBookingReturnParams(searchParams);
      
      console.debug('[BookingReturn] URL params:', params);

      // Process the return and update database
      const returnResult = await processBookingReturn(params);
      
      setResult(returnResult);
      setPageStatus(returnResult.status);
    };

    processReturn();
  }, [searchParams]);

  // Determine service type from result or URL
  const serviceType = (result?.searchSession?.type || searchParams.get('type') || 'flights') as keyof typeof serviceConfig;
  const config = serviceConfig[serviceType] || serviceConfig.flights;
  const Icon = config.icon;

  // Extract data from result
  const bookingRef = result?.bookingRef;
  const partnerName = result?.redirectLog?.partnerName || searchParams.get('partner') || 'our travel partner';

  const handleCopyRef = () => {
    if (bookingRef) {
      navigator.clipboard.writeText(bookingRef);
      setCopied(true);
      toast.success("Booking reference copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (pageStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Processing your booking...</p>
        </div>
      </div>
    );
  }

  // Dynamic page title based on status
  const getPageTitle = () => {
    switch (pageStatus) {
      case "converted":
        return "You're booking with our airline partner";
      case "pending":
        return "Booking in progress";
      case "failed":
        return "Redirect complete";
      default:
        return "Redirect complete";
    }
  };

  // Extract trip summary data from result (use searchSession fields directly)
  const tripSummary = result?.searchSession ? {
    origin: result.searchSession.origin,
    destination: result.searchSession.destination,
  } : null;

  return (
    <>
      <SEOHead
        title={`${getPageTitle()} - Hizovo`}
        description="Your flight booking redirect status with our airline partner."
        noIndex
      />

      <div className="min-h-screen bg-background">
        <NavBar />

        <main className="pt-20 sm:pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-2xl">
            
            {/* Explanation Info Box - Always visible at top */}
            <Card className="mb-6 border-border bg-secondary">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Partner Checkout</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You've been redirected to complete your booking securely with one of our licensed airline partners. 
                      Your airline partner will send confirmation and ticket details by email.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Converted/Success State */}
            {pageStatus === "converted" && (
              <Card className="overflow-hidden">
                {/* Neutral Header - Not claiming ticket issuance */}
                <div className="p-6 sm:p-8 text-center text-primary-foreground bg-foreground">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <ExternalLink className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold mb-2">You're booking with our airline partner</h1>
                  <p className="text-primary-foreground/90 text-sm sm:text-base">
                    Booking status will be confirmed by the airline partner
                  </p>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Service Badge */}
                  <div className="flex justify-center">
                    <Badge variant="outline" className={cn("gap-2 px-4 py-2", config.color)}>
                      <Icon className="w-4 h-4" />
                      {config.label} Booking
                    </Badge>
                  </div>

                  {/* Trip Summary (Read-Only) */}
                  {tripSummary && (tripSummary.origin || tripSummary.destination) && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <p className="text-xs text-muted-foreground mb-3 font-medium">Trip Summary</p>
                      <div className="space-y-3 text-sm">
                        {/* Route */}
                        {tripSummary.origin && tripSummary.destination && (
                          <div className="flex items-center justify-center gap-2 font-semibold text-base">
                            <span>{tripSummary.origin}</span>
                            <Plane className="w-4 h-4 text-foreground rotate-90" />
                            <span>{tripSummary.destination}</span>
                          </div>
                        )}
                        {/* Partner */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <span>Booking partner:</span>
                          <Badge variant="secondary" className="text-xs">{partnerName}</Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking Reference - if available */}
                  {bookingRef && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Reference (if provided)</p>
                      <div className="inline-flex items-center gap-2 px-4 py-3 bg-muted rounded-xl">
                        <span className="text-lg sm:text-xl font-mono font-bold tracking-wider break-all">
                          {bookingRef}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={handleCopyRef}
                          aria-label="Copy booking reference"
                        >
                          <Copy className={cn("w-4 h-4", copied && "text-green-500")} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status Message */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      Booking status will be confirmed by the airline partner. Please check your email for confirmation details.
                    </p>
                  </div>

                  {/* Safe Actions */}
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizivo.com"))} className="w-full h-12 touch-manipulation active:scale-[0.98] gap-2">
                        <Mail className="w-4 h-4" />
                        Check my email
                    </Button>
                    <Button variant="outline" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Plane className="w-4 h-4" />
                        Back to Flights
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Search className="w-4 h-4" />
                        Search another flight
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Failed State */}
            {pageStatus === "failed" && (
              <Card className="overflow-hidden">
                {/* Error Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center text-white">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <XCircle className="w-12 h-12" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Booking Failed</h1>
                  <p className="text-white/90">
                    There was an issue processing your booking
                  </p>
                </div>

                <CardContent className="p-6 space-y-6">
                  <p className="text-center text-muted-foreground">
                    Don't worry! Your payment was not processed. Please try again or contact support if the issue persists.
                  </p>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => window.history.go(-2)}
                    >
                      Try Again
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <Link to="/help">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Contact Support
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending State */}
            {pageStatus === "pending" && (
              <Card className="overflow-hidden">
                {/* Pending Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 sm:p-8 text-center text-primary-foreground">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <Clock className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold mb-2">Booking in progress</h1>
                  <p className="text-primary-foreground/90 text-sm sm:text-base">
                    Waiting for confirmation from airline partner
                  </p>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Status Message */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                    <p className="text-xs text-muted-foreground">
                      Booking status will be confirmed by the airline partner. Please check your email for confirmation details.
                    </p>
                  </div>

                  {/* Safe Actions */}
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizivo.com"))} className="w-full h-12 touch-manipulation active:scale-[0.98] gap-2">
                        <Mail className="w-4 h-4" />
                        Check my email
                    </Button>
                    <Button variant="outline" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Plane className="w-4 h-4" />
                        Back to Flights
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Search className="w-4 h-4" />
                        Search another flight
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unknown State */}
            {pageStatus === "unknown" && (
              <Card className="overflow-hidden">
                {/* Unknown Header */}
                <div className="bg-gradient-to-r from-muted-foreground to-muted-foreground/80 p-6 sm:p-8 text-center text-primary-foreground">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <ExternalLink className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold mb-2">Redirect complete</h1>
                  <p className="text-primary-foreground/90 text-sm sm:text-base">
                    Please check your email for booking confirmation
                  </p>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                  {/* Status Message */}
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50 text-center hover:border-primary/20 transition-all duration-200">
                    <p className="text-xs text-muted-foreground">
                      Booking status will be confirmed by the airline partner. Please check your email for confirmation details.
                    </p>
                  </div>

                  {/* Safe Actions */}
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => import("@/lib/openExternalUrl").then(({ openSystemUrl }) => openSystemUrl("mailto:support@hizivo.com"))} className="w-full h-12 touch-manipulation active:scale-[0.98] gap-2">
                        <Mail className="w-4 h-4" />
                        Check my email
                    </Button>
                    <Button variant="outline" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Plane className="w-4 h-4" />
                        Back to Flights
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full h-12 touch-manipulation gap-2">
                      <Link to="/flights">
                        <Search className="w-4 h-4" />
                        Search another flight
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Support Panel - REQUIRED */}
            <BookingSupportPanel 
              partnerName={partnerName}
              className="mt-6 sm:mt-8"
            />

            {/* Support Routing - Highlighted */}
            <Card className="mt-4 border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-2">Support Information</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      <strong>For changes, cancellations, or refunds:</strong> Contact the airline partner listed in your confirmation email.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>For website issues:</strong> <a href="mailto:support@hizivo.com" className="text-foreground hover:underline">support@hizivo.com</a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Disclaimer - REQUIRED */}
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium">Legal Notice</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {FLIGHT_DISCLAIMERS.ticketing}
              </p>
            </div>

            {/* Cross-Sell CTA */}
            <Card className="mt-4 border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center space-y-2">
                <p className="font-semibold text-sm">Need a ride or food delivery?</p>
                <div className="flex justify-center gap-3">
                  <Link to="/rides/hub" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium">
                    Book a Ride
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <Link to="/eats" className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium">
                    Order Food
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Trust Icons */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <Badge variant="outline" className="gap-1.5 text-xs py-1.5 px-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Secure partner checkout
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs py-1.5 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                No hidden fees from Hizovo
              </Badge>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
