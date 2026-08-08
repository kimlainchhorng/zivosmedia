/**
 * Cancellation Policy Page
 * Covers cancellation terms for Rides, Eats, Delivery, Hotels and Car Rentals
 * (ZIVO is merchant of record) and Flights (partner ticketing).
 *
 * The Rides/Eats/Delivery figures mirror the live `public.cancellation_rules`
 * rows and DEFAULT_RULE in supabase/functions/cancel-order. Change them here in
 * the same commit that changes them there.
 */
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Car, Plane, Clock, AlertCircle, CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cancellation Policy – ZIVO"
        description="Cancellation terms for rides, food orders, and deliveries, plus hotels and car rentals booked through ZIVO, and flights ticketed by airline partners."
        canonical="https://zivosmedia.com/legal/cancellation"
      />
      <NavBar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Link to="/">
            <Button variant="ghost" className="mb-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Cancellation Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: February 2, 2026
            </p>
          </div>

          {/* Introduction */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <p className="text-muted-foreground leading-relaxed">
                ZIVO operates a hybrid business model. Cancellation policies differ based on the service type.
                Rides, food orders, deliveries, hotels, and car rentals are cancelled through ZIVO;
                flights are cancelled under the airline partner's rules. Please review the relevant
                section for your booking.
              </p>
            </CardContent>
          </Card>

          {/* Hotels */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" />
                Hotels (ZIVO is Merchant of Record)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                For hotel bookings, ZIVO processes cancellations directly. Cancellation terms depend on the
                rate type selected at booking:
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Free Cancellation Rate</p>
                    <p className="text-sm text-muted-foreground">Cancel before deadline shown at booking</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Free Cancellation Rate</p>
                    <p className="text-sm text-muted-foreground">Cancel after deadline</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">1 Night Charge</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Non-Refundable Rate</p>
                    <p className="text-sm text-muted-foreground">Discounted rate, no cancellation</p>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">No-Show</p>
                    <p className="text-sm text-muted-foreground">Failure to check in without cancelling</p>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Full Charge</Badge>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  How to Cancel
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log in to your ZIVO account → My Trips → Select booking → Cancel Reservation.
                  Or contact support@zivosmedia.com.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Car Rentals */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-emerald-500" />
                Car Rentals (ZIVO is Merchant of Record)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                For car rental bookings, ZIVO processes cancellations. Refund amounts depend on timing:
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">48+ hours before pickup</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">24-48 hours before pickup</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">75% Refund</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Less than 24 hours before pickup</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">50% Refund</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">No-show at pickup location</p>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund</Badge>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Early Return
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you return the vehicle early, partial refunds for unused days may be available
                  minus a processing fee. Contact support for early return requests.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rides, Eats and Delivery.
              Absent from this page entirely until now, despite ride
              cancellation being by far the most common cancellation a ZIVO
              customer makes and the one most likely to be disputed.

              Every figure below is the live rule, not an illustration: they are
              the seeded `public.cancellation_rules` rows for ride/delivery/eats
              (120s free window, $2 after, $5 once the driver has arrived), and
              they match DEFAULT_RULE in supabase/functions/cancel-order. If an
              operator changes those rows, update this page in the same change —
              a published fee that disagrees with the one actually charged is a
              chargeback the platform will lose. */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Rides, Eats &amp; Delivery (ZIVO is Merchant of Record)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                You can cancel a ride, food order, or delivery from the app at any time before it is
                completed. Whether a fee applies depends on how you are paying.
              </p>

              {/* Leads with cash, because that is what ZIVO's operating market
                  actually uses. Cambodia is seeded digital_payments_enabled =
                  false (market_payment_settings), so rides there are cash, and
                  cancel-order treats cash as free_cancel unconditionally — the
                  timing table below is unreachable for them.
                  Presenting the fees first read as though Cambodian riders were
                  routinely charged to cancel, and contradicted the Ride app's
                  own policy page, which states plainly that Cambodia Ride has
                  no cancellation fee. Both are now saying the same thing. */}
              <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Paying with cash? Cancelling is always free
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  A cash fare is paid directly to the driver at the end of the trip, so ZIVO never
                  holds the money and no cancellation fee is charged — whatever the timing, and
                  however far the driver has travelled. Rides in Cambodia are cash, so this is the
                  rule that applies there.
                </p>
              </div>

              <p className="text-muted-foreground">
                Where a market offers card, ABA PayWay, or KHQR and you pay with one of them, ZIVO
                holds the payment and the timing below applies:
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Within 2 minutes of booking</p>
                    <p className="text-sm text-muted-foreground">Before a driver is on the way</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">No Fee</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">After 2 minutes</p>
                    <p className="text-sm text-muted-foreground">Driver assigned and en route</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">$2.00</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">After the driver has arrived</p>
                    <p className="text-sm text-muted-foreground">$3.00 of this goes to the driver</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">$5.00</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Cancelled by the driver, or no driver found</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">No Fee</Badge>
                </div>
              </div>

              {/* Waiting at the pickup.
                  Disclosed here because this is the Stripe-facing surface and a
                  waiting charge is a SECOND charge: the fare is captured when
                  the ride is booked, so waiting can never be added to it and
                  arrives separately after the trip. An undisclosed second
                  charge is the shape of a dispute the platform loses.

                  Card only, because a second charge needs a saved instrument to
                  bill off-session. Cash never reaches ZIVO, and ABA PayWay and
                  KHQR settle through manual operator review with nothing stored
                  to re-charge — so waiting is never billed on those. */}
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-foreground" />
                  Waiting at the Pickup
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cash, ABA PayWay and KHQR rides are never charged for waiting. On card rides the
                  first minutes of waiting are always free — never fewer than the five minutes
                  during which a customer cannot cancel, so no one is charged for time they are not
                  allowed to escape. Anything charged beyond that is capped, appears as its own line
                  on the receipt with the minutes it covers, and is paid in full to the driver.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Because the fare is charged when the ride is booked, a waiting amount is billed
                  separately after the trip rather than added to the original fare.
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Repeated Cancellations
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cancellations are limited per day. Persistent cancelling after drivers have been
                  dispatched may temporarily restrict your ability to book.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Flights */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-foreground" />
                Flights (Partner Ticketing)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Important
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ZIVO does NOT issue airline tickets. Flight cancellations are handled by the airline
                  partner who issued your ticket. Contact the airline partner listed in your confirmation email.
                </p>
              </div>

              <p className="text-muted-foreground">
                General airline cancellation policies (actual terms set by airline):
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Refundable Fare</p>
                    <p className="text-sm text-muted-foreground">Premium ticket type</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Refund (may have fee)</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Flexible Fare</p>
                    <p className="text-sm text-muted-foreground">Mid-tier ticket type</p>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Travel Credit</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Basic/Non-Refundable Fare</p>
                    <p className="text-sm text-muted-foreground">Economy ticket type</p>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund*</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Airline-Cancelled Flight</p>
                    <p className="text-sm text-muted-foreground">Flight cancelled by airline</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                *Non-refundable fares may be eligible for change with fee, or refund in case of airline cancellation.
                24-hour free cancellation may apply for US departures (DOT regulations).
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-muted-foreground mb-4">
                For rides, food orders, deliveries, hotels, and car rentals, contact ZIVO support —
                we handle those cancellations. For flight cancellations, contact your airline partner.
              </p>
              <a
                href="mailto:support@zivosmedia.com"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                support@zivosmedia.com
              </a>
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border mt-8">
            <Link to="/legal/refunds" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Refund Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/legal/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/legal/partner-disclosure" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Partner Disclosure
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CancellationPolicy;
