/**
 * Refund Policy Page
 * Updated for ZIVO hybrid model:
 * - Hotels & Cars: ZIVO MoR (processes refunds directly)
 * - Flights: Partner ticketing (refunds handled by airline)
 */
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCcw, Car, Plane, Hotel, Clock, AlertCircle, CheckCircle, CreditCard, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const RefundPolicy = () => {
  const lastUpdated = "February 2, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Refund Policy – ZIVO Travel"
        description="Understand refund terms for Hotels, Car Rentals (processed by ZIVO?), and Flights (handled by airline partners)."
        canonical="https://hizivo.com/refund-policy"
      />
      <NavBar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl pt-24">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <RefreshCcw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">Refund Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <p className="text-foreground leading-relaxed">
              ZIVO operates a <strong>hybrid business model</strong>. Refund policies differ based on service type:
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span><strong>Hotels & Car Rentals:</strong> Refunds processed by ZIVO (we are the merchant of record)</span>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-amber-500" />
                <span><strong>Flights:</strong> Refunds handled by the airline partner (we are not the merchant of record)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Refund Timeline Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Hotel className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-medium">Hotels</p>
              <p className="text-xs text-muted-foreground">3-10 business days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Car className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-medium">Car Rentals</p>
              <p className="text-xs text-muted-foreground">3-10 business days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Plane className="h-6 w-6 mx-auto mb-2 text-foreground" />
              <p className="text-sm font-medium">Flights</p>
              <p className="text-xs text-muted-foreground">Per airline policy</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CreditCard className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Payment Method</p>
              <p className="text-xs text-muted-foreground">Card: 5-10 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Service-Specific Policies */}
        <Tabs defaultValue="hotels" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hotels" className="text-xs sm:text-sm">Hotels</TabsTrigger>
            <TabsTrigger value="cars" className="text-xs sm:text-sm">Car Rentals</TabsTrigger>
            <TabsTrigger value="flights" className="text-xs sm:text-sm">Flights</TabsTrigger>
          </TabsList>

          {/* Hotels */}
          <TabsContent value="hotels">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-amber-500" />
                  Hotels (ZIVO Processes Refunds)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ZIVO is Merchant of Record
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Refunds for hotel bookings are processed directly by ZIVO. Contact us for refund requests.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Refund Eligibility by Rate Type</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <div>
                        <p className="font-medium">Free Cancellation Rate</p>
                        <p className="text-sm text-muted-foreground">Cancelled before deadline</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <div>
                        <p className="font-medium">Free Cancellation Rate</p>
                        <p className="text-sm text-muted-foreground">Cancelled after deadline</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Partial (minus 1 night)</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <div>
                        <p className="font-medium">Non-Refundable Rate</p>
                        <p className="text-sm text-muted-foreground">Discounted rate</p>
                      </div>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Other Refund Scenarios</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Room not as described → Full or partial refund</li>
                    <li>Overbooking by hotel → Full refund</li>
                    <li>Unresolved cleanliness/safety issues → Case-by-case</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Car Rentals */}
          <TabsContent value="cars">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-emerald-500" />
                  Car Rentals (ZIVO Processes Refunds)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ZIVO is Merchant of Record
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Refunds for car rental bookings are processed directly by ZIVO.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Cancellation Refunds</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <span>48+ hours before pickup</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-xl">
                      <span>24-48 hours before pickup</span>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">75% Refund</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span>Less than 24 hours</span>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">50% Refund</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span>No-show</span>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Other Refund Scenarios</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Vehicle not available at pickup → Full refund or rebooking</li>
                    <li>Vehicle not as described → Partial or full refund</li>
                    <li>Mechanical issues preventing use → Case-by-case</li>
                    <li>Early return → Partial refund minus processing fee</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flights */}
          <TabsContent value="flights">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-foreground" />
                  Flights (Airline Partner Processes Refunds)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Important: ZIVO Does NOT Issue Tickets
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Flight refunds are processed by the airline partner who issued your ticket. 
                    Contact them directly for refund requests.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Typical Airline Refund Policies</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Refundable Fare</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund (may have fee)</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Flexible Fare</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Travel Credit</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Basic/Non-Refundable</p>
                      </div>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">No Refund*</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Airline-Cancelled Flight</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Full Refund</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    *24-hour free cancellation may apply for US departures per DOT regulations.
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">How to Request Flight Refund</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Find the airline partner name in your confirmation email</li>
                    <li>Contact the airline directly via their website or phone</li>
                    <li>Provide your booking reference and ticket number</li>
                    <li>Follow the airline's refund process</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* General Information */}
        <Accordion type="single" collapsible className="space-y-4">
          <AccordionItem value="process" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">How to Request a Refund (Hotels & Car Rentals)</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <ol className="list-decimal list-inside space-y-3">
                <li><strong>My Trips:</strong> Log in → My Trips → Select booking → Request Refund</li>
                <li><strong>Email:</strong> Contact support@hizivo.com with your booking reference</li>
                <li><strong>Response Time:</strong> We respond within 24-48 hours</li>
              </ol>
              <p className="mt-4">
                <strong>Required Information:</strong> Booking ID, dates, reason for refund, any supporting evidence.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="timing" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Refund Processing Times</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Credit Card</span>
                  <span className="text-primary">5-10 business days</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Debit Card</span>
                  <span className="text-primary">3-5 business days</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Digital Wallet (Apple/Google Pay)</span>
                  <span className="text-primary">3-5 business days</span>
                </div>
              </div>
              <p className="text-sm mt-4">
                Note: These times apply after approval. Your bank may take additional time.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-display font-bold text-lg mb-2">Need Help?</h3>
            <p className="text-muted-foreground mb-4">
              For hotel and car rental refunds, contact ZIVO. For flight refunds, contact your airline partner.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="mailto:support@hizivo.com">
                <Button className="gap-2">
                  <Mail className="w-4 h-4" />
                  support@hizivo.com
                </Button>
              </a>
              <Link to="/cancellation-policy">
                <Button variant="outline">Cancellation Policy</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border mt-8">
          <Link to="/cancellation-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Cancellation Policy
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/partner-disclosure" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Partner Disclosure
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RefundPolicy;
