/**
 * Car Rental Marketplace Disclaimer Page
 * /legal/car-rental-disclaimer
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Car, Shield, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CAR_RENTAL_DISCLAIMER, COMPANY_INFO } from "@/config/legalContent";
import Footer from "@/components/Footer";

export default function CarRentalDisclaimer() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 safe-area-top z-10">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to ZIVO</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Car className="w-10 h-10 text-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Car Rental Marketplace Disclaimer</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Important information about renting vehicles through the ZIVO marketplace.
          </p>
        </div>

        {/* Main Disclaimer */}
        <Alert className="mb-8 border-border bg-secondary">
          <FileWarning className="h-5 w-5 text-foreground" />
          <AlertTitle className="text-lg">Marketplace Disclaimer</AlertTitle>
          <AlertDescription className="text-base mt-2">
            {CAR_RENTAL_DISCLAIMER.content}
          </AlertDescription>
        </Alert>

        {/* Owner Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Vehicle Owner Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Vehicle Condition</p>
                <p className="text-sm text-muted-foreground">
                  Owners must maintain their vehicles in safe, roadworthy condition.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Insurance Coverage</p>
                <p className="text-sm text-muted-foreground">
                  Owners must maintain adequate insurance coverage for their vehicles.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Accurate Listings</p>
                <p className="text-sm text-muted-foreground">
                  Owners must provide accurate information about their vehicles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ZIVO's Role */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What ZIVO Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Booking Facilitation</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO connects renters with vehicle owners and facilitates the booking process.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Payment Processing</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO processes payments securely between renters and owners.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Dispute Resolution</p>
                <p className="text-sm text-muted-foreground">
                  Damage claims are handled through ZIVO's platform dispute resolution process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Alert className="mb-8">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Important Notice</AlertTitle>
          <AlertDescription>
            ZIVO does not own or operate rental vehicles. All vehicles are owned by independent 
            providers who set their own prices and availability.
          </AlertDescription>
        </Alert>

        {/* Contact */}
        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">
              Questions? Contact{" "}
              <a 
                href={`mailto:${COMPANY_INFO.supportEmail}`}
                className="text-primary hover:underline"
              >
                {COMPANY_INFO.supportEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
