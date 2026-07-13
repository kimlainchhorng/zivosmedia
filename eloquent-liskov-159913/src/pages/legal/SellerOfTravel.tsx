/**
 * Seller of Travel Legal Page
 * Required for Duffel LIVE compliance
 * 
 * ZIVO operates as a sub-agent of licensed ticketing providers
 */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  Scale,
  Plane,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { ZIVO_SOT_REGISTRATION, FLIGHT_MOR_DISCLAIMERS, FLIGHT_LEGAL_LINKS } from "@/config/flightMoRCompliance";

const SellerOfTravel = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Seller of Travel Registration | ZIVO"
        description="ZIVO is a registered Seller of Travel. Learn about our legal status, ticketing partnerships, and consumer protections."
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 gap-2">
              <Shield className="w-3 h-3" />
              Legal Compliance
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Seller of Travel Registration
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ZIVO is registered as a Seller of Travel where required by law. 
              We operate as a sub-agent of licensed ticketing providers.
            </p>
          </div>

          <div className="grid gap-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Legal Business Name</p>
                    <p className="font-semibold">ZIVO LLC</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Operating As</p>
                    <p className="font-semibold">Hizovo Travel / ZIVO</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Address</p>
                      <p className="font-medium">Address on file with state authorities</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Support Email</p>
                      <a href="mailto:support@hizivo.com" className="font-medium text-primary hover:underline">
                        support@hizivo.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Support Available</p>
                      <p className="font-medium">Via email and in-app messaging</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" />
                  Registration Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="font-semibold text-emerald-600">
                      {ZIVO_SOT_REGISTRATION.status}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                        Pending
                      </Badge>
                    </div>
                    <p className="font-medium">California</p>
                    <p className="text-sm text-muted-foreground">
                      Seller of Travel Registration: Application submitted
                    </p>
                    <button type="button" 
                      onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://www.ag.ca.gov/consumers/travel"))}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                    >
                      CA Attorney General <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="p-4 rounded-lg border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                        Pending
                      </Badge>
                    </div>
                    <p className="font-medium">Florida</p>
                    <p className="text-sm text-muted-foreground">
                      Seller of Travel Registration: Application submitted
                    </p>
                    <button type="button" 
                      onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl("https://www.fdacs.gov/Consumer-Resources/Travel"))}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                    >
                      FL DACS <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sub-Agent Disclosure */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" />
                  Ticketing Partnership Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-background border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <p className="font-medium mb-2">Sub-Agent Status</p>
                  <p className="text-muted-foreground">
                    {FLIGHT_MOR_DISCLAIMERS.seller}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-background border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <p className="font-medium mb-2">Ticket Issuance</p>
                  <p className="text-muted-foreground">
                    {FLIGHT_MOR_DISCLAIMERS.ticketing}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-background border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <p className="font-medium mb-2">How It Works</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>You search and select flights on ZIVO</li>
                    <li>Payment is processed securely by ZIVO via Stripe</li>
                    <li>Your ticket is issued by our licensed ticketing partner</li>
                    <li>You receive your e-ticket and booking confirmation via email</li>
                  </ol>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ZIVO acts as the merchant of record for your purchase. Airline tickets are issued 
                  under the authority of our licensed ticketing partners in accordance with IATA regulations.
                </p>
              </CardContent>
            </Card>

            {/* Customer Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Your Rights & Protections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <p className="font-medium mb-2">Refund Eligibility</p>
                    <p className="text-sm text-muted-foreground">
                      {FLIGHT_MOR_DISCLAIMERS.refund}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border">
                    <p className="font-medium mb-2">Booking Support</p>
                    <p className="text-sm text-muted-foreground">
                      {FLIGHT_MOR_DISCLAIMERS.support}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="font-medium mb-2">Complaint Process</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    If you have a complaint about your booking, please contact us first at{" "}
                    <a href="mailto:support@hizivo.com" className="text-primary hover:underline">
                      support@hizivo.com
                    </a>. 
                    We aim to resolve all issues within 72 hours.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If we are unable to resolve your complaint, you may contact your 
                    state's consumer protection office or the appropriate regulatory authority.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Related Legal Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Related Legal Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Link
                    to={FLIGHT_LEGAL_LINKS.terms}
                    className="p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                  >
                    <p className="font-medium text-sm">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">General terms</p>
                  </Link>
                  <Link
                    to={FLIGHT_LEGAL_LINKS.flightTerms}
                    className="p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                  >
                    <p className="font-medium text-sm">Flight Terms</p>
                    <p className="text-xs text-muted-foreground">Booking policies</p>
                  </Link>
                  <Link
                    to={FLIGHT_LEGAL_LINKS.privacy}
                    className="p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                  >
                    <p className="font-medium text-sm">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">Data protection</p>
                  </Link>
                  <Link
                    to={FLIGHT_LEGAL_LINKS.partnerDisclosure}
                    className="p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                  >
                    <p className="font-medium text-sm">Partner Disclosure</p>
                    <p className="text-xs text-muted-foreground">Partner info</p>
                  </Link>
                  <Link
                    to={FLIGHT_LEGAL_LINKS.refundPolicy}
                    className="p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
                  >
                    <p className="font-medium text-sm">Refund Policy</p>
                    <p className="text-xs text-muted-foreground">Cancellations</p>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <p className="text-center text-xs text-muted-foreground">
              Last updated: February 3, 2026
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SellerOfTravel;
