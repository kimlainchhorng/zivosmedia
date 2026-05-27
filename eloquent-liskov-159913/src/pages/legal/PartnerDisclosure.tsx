/**
 * Partner Disclosure Page
 * ZIVO is a travel search and referral platform.
 * - Flights: Users search on ZIVO, then are redirected to a licensed travel partner for checkout/ticketing.
 * - Rides, Eats, Car Rentals: Facilitated by independent third-party providers via the ZIVO platform.
 * - ZIVO does NOT issue airline tickets or act as merchant of record for flights.
 */
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Share2,
  HeadphonesIcon,
  Mail,
  Plane,
  Car,
  Shield,
  CheckCircle,
  AlertTriangle,
  UtensilsCrossed,
  Truck,
} from "lucide-react";

const PartnerDisclosure = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Partner Disclosure – ZIVO Travel"
        description="Understand how ZIVO handles bookings: Flights are searched on ZIVO and booked through licensed travel partners. ZIVO does not issue airline tickets."
        canonical="https://hizivo.com/partner-disclosure"
      />
      <NavBar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl font-bold mb-4">
              Partner Disclosure
            </h1>
            <p className="text-muted-foreground">
              How ZIVO works with licensed partners to serve you
            </p>
            <p className="text-sm text-muted-foreground mt-2">Last updated: March 13, 2026</p>
          </div>

          <div className="space-y-8">
            {/* Introduction */}
            <section className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed text-lg">
                ZIVO is a travel search and referral platform operated by ZIVO LLC in the United States.
                We help users search, compare, and discover travel services. All bookings are completed
                through licensed third-party providers who act as the merchant of record.
              </p>
            </section>

            {/* Flights - Partner Referral */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold">Flights (Partner Referral)</h2>
                </div>
                <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-foreground font-medium">
                      ZIVO does NOT issue airline tickets and does NOT collect payment for flights.
                    </p>
                  </div>
                </div>
                <p className="text-foreground leading-relaxed">
                  When you search for flights on ZIVO, we display estimated prices and options from licensed
                  travel partners. When you select a flight and proceed to book:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                    <span>You are redirected to the travel partner's secure checkout page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                    <span>The travel partner processes your payment and issues your ticket</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                    <span>Final price and terms are confirmed on the partner's checkout page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                    <span>Changes, cancellations, and refunds are handled by the travel partner</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Cancellation and baggage rules are displayed when provided by partners. For booking
                  support, contact the travel partner listed in your confirmation email.
                </p>
              </CardContent>
            </Card>

            {/* Local Services - Platform Facilitated */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold">Rides, Eats & Delivery</h2>
                </div>
                <p className="text-foreground leading-relaxed">
                  ZIVO connects users with <strong>independent third-party service providers</strong> for
                  local transportation, food delivery, and package delivery. ZIVO is a technology platform:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                    <span>Drivers are independent contractors, not ZIVO employees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                    <span>Restaurants are independent partners responsible for food quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                    <span>Car rental vehicles are owned by independent providers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                    <span>ZIVO facilitates bookings, payments, and logistics only</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Pricing Notice */}
            <section>
              <p className="text-muted-foreground leading-relaxed">
                Prices and availability shown on ZIVO are estimates and may change before you complete
                checkout. For flights, the final price is confirmed on the travel partner's checkout page.
                For local services, fares are calculated based on distance, time, and demand at the
                time of booking.
              </p>
            </section>

            {/* Information Sharing */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Information Sharing</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Flights:</strong> If you proceed to a partner checkout, ZIVO may pass
                  necessary traveler information (name, contact details) to the travel partner
                  with your consent to facilitate your booking.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Local Services:</strong> Your booking details are shared with drivers,
                  restaurants, or vehicle owners as needed to fulfill your request.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell your personal information. See our{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
                  for details.
                </p>
              </CardContent>
            </Card>

            {/* Customer Support */}
            <Card className="bg-muted/30">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <HeadphonesIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">Customer Support</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Plane className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Flights</p>
                      <p className="text-sm text-muted-foreground">
                        For booking changes, cancellations, or refunds, contact the travel partner
                        listed in your confirmation email. ZIVO can only assist with website
                        navigation issues.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Rides, Eats & Local Services</p>
                      <p className="text-sm text-muted-foreground">
                        Contact ZIVO support for booking issues, disputes, or service problems.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href="mailto:support@hizivo.com"
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    support@hizivo.com
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Related Links */}
            <div className="flex flex-wrap gap-4 justify-center pt-4 border-t border-border">
              <Link
                to="/terms-of-service"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/refund-policy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Refund Policy
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to="/cookies"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PartnerDisclosure;
