/**
 * Refunds Policy Page
 * Explains that refunds are handled by travel partners
 */
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  RefreshCw, 
  Shield, 
  ExternalLink,
  AlertCircle,
  Mail,
  CheckCircle2,
  XCircle,
  Building2,
  Car,
  Plane
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Refunds = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Refund Policy | ZIVO"
        description="Learn about ZIVO's refund policy. All bookings are processed by our travel partners who handle refunds directly."
        canonical="https://hizivo.com/refunds"
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-amber-500/20 text-amber-500 border-amber-500/30">
              <RefreshCw className="w-3 h-3 mr-1" />
              Refund Policy
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Refunds & Cancellations
            </h1>
            <p className="text-lg text-muted-foreground">
              How refunds work when you book through ZIVO
            </p>
          </div>

          {/* Important Notice */}
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg mb-2">Refund Eligibility</h3>
                  <p className="text-muted-foreground mb-4">
                    Refund eligibility depends on the fare rules, hotel policy, or rental provider terms applicable to your booking.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>ZIVO processes refunds only when authorized by the supplier</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>Service fees may be non-refundable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>ZIVO is not responsible for provider-imposed penalties</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How Refunds Work */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">How Refunds Work</h2>
            
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Contact Your Travel Partner</h3>
                      <p className="text-muted-foreground text-sm">
                        Check your booking confirmation email for the travel partner's contact details. 
                        They processed your payment and issued your ticket or reservation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Review Their Refund Policy</h3>
                      <p className="text-muted-foreground text-sm">
                        Each travel partner has their own refund and cancellation policies. 
                        Airline tickets, hotel bookings, and car rentals each have different rules.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Request Your Refund</h3>
                      <p className="text-muted-foreground text-sm">
                        Submit your refund request directly to the travel partner. 
                        Processing times vary by partner and fare type.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Refund Handling by Service */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">How Refunds Work by Service</h2>
            
            <div className="space-y-4">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Hotels & Car Rentals</h3>
                      <p className="text-sm text-muted-foreground">
                        ZIVO is the merchant of record. Refunds are processed according to the hotel or rental company's 
                        cancellation policy shown at checkout. Contact ZIVO support for assistance.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Flights</h3>
                      <p className="text-sm text-muted-foreground">
                        Airline partners handle payment and ticketing. Contact the airline partner listed in your 
                        confirmation email for changes, cancellations, and refunds.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* What ZIVO Can/Cannot Do */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">What ZIVO Can & Cannot Do</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    What We Can Do
                  </h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      Process refunds for hotels/cars when authorized by supplier
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      Help you find partner contact information
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      Answer questions about using ZIVO
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-destructive" />
                    What We Cannot Do
                  </h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      Override supplier cancellation policies
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      Process flight refunds (handled by airline partner)
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      Waive provider-imposed penalties
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Partner Disclosure */}
          <Card className="mb-8 bg-muted/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Partner Disclosure</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    When you book through ZIVO, you're booking directly with a licensed travel partner 
                    who acts as the merchant of record. They process your payment, issue your ticket 
                    or reservation, and handle all post-booking support including refunds.
                  </p>
                  <Link to="/partner-disclosure">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-3 h-3" />
                      View Partner Disclosure
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have questions about using ZIVO, our support team is here to help.
              </p>
              <Link to="/contact">
                <Button className="gap-2">
                  Contact Support
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Refunds;
