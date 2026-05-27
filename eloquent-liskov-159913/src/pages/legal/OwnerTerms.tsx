/**
 * Owner Terms of Service - P2P Car Rental Marketplace
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Car, Shield, CreditCard, AlertTriangle, CheckCircle, Scale, Mail, Clock, FileText, DollarSign, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const OwnerTerms = () => {
  const lastUpdated = "February 2, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Owner Terms of Service - ZIVO P2P Car Rental"
        description="Terms and conditions for listing your vehicle on the ZIVO peer-to-peer car rental marketplace. Understand your rights and responsibilities as a car owner."
        canonical="/terms/owner"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">P2P Car Rental</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Owner Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Vehicle Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Vehicle Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">To list a vehicle on ZIVO, it must meet the following requirements:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Year</Badge>
                  <span>Model year 2018 or newer</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Registration</Badge>
                  <span>Valid registration and current license plates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Insurance</Badge>
                  <span>Active personal auto insurance policy</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Condition</Badge>
                  <span>Safe, roadworthy condition with no mechanical issues</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Photos</Badge>
                  <span>Accurate, recent photos showing vehicle condition</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Mileage</Badge>
                  <span>Less than 130,000 miles on the odometer</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Authorization to ZIVO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Authorization Granted to ZIVO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">By listing your vehicle, you authorize ZIVO to:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Market and display your vehicle on the ZIVO platform</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Collect payments from renters on your behalf</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Deduct platform commission (20% of rental amount)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Deduct insurance and applicable fees</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Process refunds according to cancellation policy</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Commission & Payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Commission & Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-semibold text-lg">Platform Commission: 20%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ZIVO retains 20% of each rental to cover platform operations, customer support, and payment processing.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Payout Terms</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Payouts processed 24-48 hours after trip completion
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Requires connected Stripe account in good standing
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Payouts may be held during active disputes or damage claims
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                You can track your earnings and payout history in your{" "}
                <Link to="/owner/payouts" className="text-primary underline">Owner Dashboard</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Insurance & Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Insurance & Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                ZIVO arranges third-party commercial insurance for all rentals:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>$1,000,000 liability protection</strong> during active rentals</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>Physical damage protection</strong> for your vehicle</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>Lost income protection</strong> if vehicle is damaged</span>
                </li>
              </ul>
              
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Important Notice
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your personal auto insurance may not apply during ZIVO rentals. Please consult with your 
                  insurance provider about coverage gaps.
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                For complete coverage details, see{" "}
                <Link to="/insurance" className="text-primary underline">Insurance & Protection</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Owner Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Your Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">As a vehicle owner on ZIVO, you must:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Provide accurate vehicle information, photos, and descriptions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Maintain vehicle in safe, roadworthy condition</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Keep vehicle registration and personal insurance current</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Respond to booking requests promptly (within 24 hours)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Report any incidents or damage claims immediately</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Maintain accurate availability calendar</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* ZIVO Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                ZIVO Platform Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">ZIVO reserves the right to:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Suspend or remove listings that violate platform policies</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Reject vehicles that don't meet safety or quality standards</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Hold payouts during active disputes or damage investigations</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Deactivate owner accounts for policy violations</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>Modify commission rates with 30 days advance notice</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Governing Law & Disputes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by the laws of the State of Delaware, USA. Any disputes shall be resolved 
                through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
              <p className="text-sm text-muted-foreground">
                Disputes regarding damage claims follow our{" "}
                <Link to="/damage-policy" className="text-primary underline">Damage & Incident Policy</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/terms/renter">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Renter Terms
                </Badge>
              </Link>
              <Link to="/insurance">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Insurance & Protection
                </Badge>
              </Link>
              <Link to="/damage-policy">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Damage Policy
                </Badge>
              </Link>
              <Link to="/privacy">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Privacy Policy
                </Badge>
              </Link>
            </div>
          </div>

          {/* Contact */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Questions?</h3>
                  <p className="text-sm text-muted-foreground">We're here to help</p>
                </div>
              </div>
              <a 
                href="mailto:support@hizivo.com" 
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                <Mail className="w-4 h-4" />
                support@hizivo.com
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerTerms;
