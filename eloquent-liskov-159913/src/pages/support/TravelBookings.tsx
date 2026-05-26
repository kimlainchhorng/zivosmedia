/**
 * Travel Bookings Support Page
 * Explains responsibility boundaries for booking support
 */

import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Plane, 
  Hotel, 
  Car, 
  Shield, 
  AlertCircle,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";

const partnerResponsibilities = [
  "Flight changes, cancellations, and refunds",
  "Hotel reservation modifications",
  "Car rental booking changes",
  "Payment processing and receipts",
  "E-tickets and booking confirmations",
  "Baggage issues and airline policies",
  "Check-in and boarding passes",
  "Travel insurance claims",
];

const hizovoResponsibilities = [
  "Website navigation and search functionality",
  "Account issues (login, password reset)",
  "Technical problems with our site",
  "Questions about how Hizovo works",
  "Reporting display errors or bugs",
];

const supportSteps = [
  {
    step: 1,
    title: "Find Your Confirmation Email",
    description: "Check your inbox (and spam folder) for the booking confirmation from our travel partner.",
  },
  {
    step: 2,
    title: "Locate Partner Contact Info",
    description: "Your confirmation email contains the partner's customer support phone number and email.",
  },
  {
    step: 3,
    title: "Contact the Partner Directly",
    description: "Reach out to the travel partner with your booking reference number for fastest resolution.",
  },
];

export default function TravelBookingsSupport() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Travel Booking Support – ZIVO"
        description="Learn how to get support for flight, hotel, and car rental bookings. Understand the support process and contact the right team."
        canonical="https://hizivo.com/support/travel-bookings"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary text-foreground border-border">
              <ExternalLink className="w-3 h-3 mr-1" />
              Booking Support
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Travel Booking Support
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Need help with a booking? Here's how to get the right support.
            </p>
          </div>

          {/* Important Notice */}
          <Alert className="mb-8 border-amber-500/30 bg-amber-500/5">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <AlertDescription className="text-base">
              <strong>Important:</strong> Hizovo is a travel search platform. All bookings are processed 
              and fulfilled by our licensed travel partners. For booking changes, cancellations, or 
              refunds, you must contact the travel partner directly.
            </AlertDescription>
          </Alert>

          {/* How to Get Support */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                How to Get Booking Support
              </CardTitle>
              <CardDescription>Follow these steps to resolve booking issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {supportSteps.map((item, idx) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">{item.title}</p>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                    {idx < supportSteps.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground self-center hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Responsibility Split */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Partner Handles */}
            <Card className="border-border hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ExternalLink className="w-5 h-5" />
                  Travel Partner Handles
                </CardTitle>
                <CardDescription>Contact the booking partner for:</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {partnerResponsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Hizovo Handles */}
            <Card className="border-primary/30 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5" />
                  Hizovo Handles
                </CardTitle>
                <CardDescription>Contact us for:</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {hizovoResponsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/contact" className="gap-2">
                      <Mail className="w-4 h-4" />
                      Contact Hizovo Support
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Common Travel Partners */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Common Travel Partners</CardTitle>
              <CardDescription>If you booked through one of these partners, contact them directly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-border hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Plane className="w-5 h-5 text-foreground" />
                    <span className="font-semibold">Flights</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Contact the airline or travel agency listed on your confirmation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-border hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Hotel className="w-5 h-5 text-foreground" />
                    <span className="font-semibold">Hotels</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Contact the booking platform (e.g., Booking.com) or hotel directly.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-emerald-500/30 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Car className="w-5 h-5 text-emerald-500" />
                    <span className="font-semibold">Car Rentals</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Contact the rental company or booking platform on your confirmation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What We Cannot Do */}
          <Card className="mb-8 border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                What Hizovo Cannot Help With
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Because we are a search platform and not the merchant of record, we cannot:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Process refunds or issue credits
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Modify or cancel bookings on your behalf
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Access your booking details or itinerary
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  Guarantee prices or availability after redirect
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Still Need Help */}
          <div className="text-center p-8 rounded-2xl bg-primary/5 border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-200">
            <h2 className="text-xl font-bold mb-2">Having trouble with our website?</h2>
            <p className="text-muted-foreground mb-6">
              If you're experiencing issues with the Hizovo website itself, we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link to="/support/site-issues" className="gap-2">
                  Troubleshooting Guide
                </Link>
              </Button>
              <Button asChild>
                <Link to="/contact" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
