/**
 * Cancellation Policy Page
 * Covers cancellation terms for Hotels, Car Rentals (MoR), and Flights (partner)
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
        title="Cancellation Policy – ZIVO Travel"
        description="Understand cancellation terms for Hotels, Car Rentals, and Flights booked through ZIVO. Different policies apply based on service type."
        canonical="https://hizivo.com/cancellation-policy"
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
                Please review the relevant section for your booking.
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
                  Or contact support@hizivo.com.
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
                For hotel and car rental cancellations, contact ZIVO support. 
                For flight cancellations, contact your airline partner.
              </p>
              <a 
                href="mailto:support@hizivo.com" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                support@hizivo.com
              </a>
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="flex flex-wrap gap-4 justify-center pt-8 border-t border-border mt-8">
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Refund Policy
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
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CancellationPolicy;
