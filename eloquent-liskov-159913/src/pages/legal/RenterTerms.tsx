/**
 * Renter Terms of Service - P2P Car Rental Marketplace
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Car, Shield, CreditCard, AlertTriangle, CheckCircle, Scale, Mail, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const RenterTerms = () => {
  const lastUpdated = "February 2, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Renter Terms of Service - ZIVO P2P Car Rental"
        description="Terms and conditions for renting vehicles through the ZIVO peer-to-peer car rental marketplace. Understand your rights and responsibilities as a renter."
        canonical="/terms/renter"
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Renter Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Marketplace Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                About ZIVO P2P Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                ZIVO operates a peer-to-peer car rental marketplace that connects vehicle owners with renters. 
                ZIVO facilitates the booking, payment processing, and insurance arrangement for rentals.
              </p>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Important Notice
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  ZIVO is not the vehicle owner. Vehicles are owned by independent hosts who list them on our platform. 
                  ZIVO acts as the marketplace facilitator and payment processor.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Renter Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Renter Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">To rent a vehicle on ZIVO, you must meet the following requirements:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Required</Badge>
                  <span>Hold a valid driver's license (in your name, not expired)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Age</Badge>
                  <span>Be at least 21 years old (25+ for luxury/premium vehicles)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Driving Record</Badge>
                  <span>Have a clean driving record with no major violations in the past 3 years</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">Legal</Badge>
                  <span>Agree to follow all applicable traffic laws and regulations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Payment Processing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                All payments are processed securely by ZIVO through Stripe. When you book a vehicle:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Full trip amount is charged at the time of booking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Payment includes daily rental rate, service fee, and optional insurance
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  All prices shown include applicable taxes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Receipts are sent via email upon successful payment
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Cancellation Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Cancellation & Refunds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Our standard cancellation policy:</p>
              <div className="grid gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="font-medium text-emerald-600">48+ hours before pickup</p>
                  <p className="text-sm text-muted-foreground">Full refund (100%)</p>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="font-medium text-amber-600">24-48 hours before pickup</p>
                  <p className="text-sm text-muted-foreground">75% refund</p>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="font-medium text-orange-600">Less than 24 hours before pickup</p>
                  <p className="text-sm text-muted-foreground">50% refund</p>
                </div>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="font-medium text-destructive">No-show</p>
                  <p className="text-sm text-muted-foreground">No refund</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Refunds are processed within 5-10 business days to your original payment method.
              </p>
            </CardContent>
          </Card>

          {/* Renter Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Your Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">As a renter, you are responsible for:</p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Traffic violations:</strong> All parking tickets, tolls, speeding tickets, and other violations incurred during the rental period</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Damage reporting:</strong> Immediately report any damage or incidents to ZIVO support</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Authorized drivers only:</strong> Only the registered renter may operate the vehicle unless additional drivers are approved</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Vehicle condition:</strong> Return the vehicle in the same condition as received, with the same fuel level</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span><strong>Prohibited activities:</strong> No smoking, no pets (unless approved), no off-road use, no towing</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Insurance Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Insurance Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                ZIVO arranges third-party commercial insurance for all rentals. Coverage applies only during the active rental period.
              </p>
              <div className="grid gap-3">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Liability Protection</p>
                  <p className="text-sm text-muted-foreground">Up to $1,000,000 coverage</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Physical Damage Protection</p>
                  <p className="text-sm text-muted-foreground">Subject to deductible based on selected plan</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Uninsured Motorist Coverage</p>
                  <p className="text-sm text-muted-foreground">Protection against uninsured drivers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                For complete coverage details, please review our{" "}
                <Link to="/insurance" className="text-primary underline">Insurance & Protection</Link> page.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                ZIVO's liability is limited as follows:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• ZIVO is not liable for the condition, safety, or legality of listed vehicles</li>
                <li>• ZIVO is not liable for the actions or omissions of vehicle owners or other renters</li>
                <li>• ZIVO is not liable for any indirect, incidental, or consequential damages</li>
                <li>• Maximum liability shall not exceed the total amount paid for the rental</li>
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
                Before initiating arbitration, you agree to first attempt to resolve disputes through ZIVO's customer 
                support process.
              </p>
            </CardContent>
          </Card>

          {/* Related Links */}
          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Related Policies</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/terms/owner">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Owner Terms
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

export default RenterTerms;
