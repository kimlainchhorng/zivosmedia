/**
 * Transportation Network Disclaimer Page
 * /legal/transportation-disclaimer
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Car, Users, Building2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TRANSPORTATION_DISCLAIMER, COMPANY_INFO } from "@/config/legalContent";
import Footer from "@/components/Footer";

export default function TransportationDisclaimer() {
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
            <Car className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Transportation Network Disclaimer</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Important information about the relationship between ZIVO, drivers, and riders.
          </p>
        </div>

        {/* Main Disclaimer */}
        <Alert className="mb-8 border-blue-500/30 bg-blue-500/5">
          <AlertTriangle className="h-5 w-5 text-blue-500" />
          <AlertTitle className="text-lg">Important Disclaimer</AlertTitle>
          <AlertDescription className="text-base mt-2">
            {TRANSPORTATION_DISCLAIMER.content}
          </AlertDescription>
        </Alert>

        {/* Key Points */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Key Points
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Technology Platform</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO operates as a technology platform connecting riders with independent drivers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Independent Contractors</p>
                <p className="text-sm text-muted-foreground">
                  All drivers using the ZIVO platform are independent contractors, not employees.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No Transportation Services</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO does not provide transportation services and is not a transportation carrier.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Booking & Payment Facilitation</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO facilitates bookings and payments between riders and drivers only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applies To */}
        <Card className="mb-8 bg-muted/50">
          <CardHeader>
            <CardTitle>This Disclaimer Applies To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <Car className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">ZIVO Rides</p>
                  <p className="text-sm text-muted-foreground">On-demand transportation</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <Building2 className="w-8 h-8 text-foreground" />
                <div>
                  <p className="font-medium">ZIVO Move</p>
                  <p className="text-sm text-muted-foreground">Package delivery & moving</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">
              Questions about this disclaimer? Contact{" "}
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
