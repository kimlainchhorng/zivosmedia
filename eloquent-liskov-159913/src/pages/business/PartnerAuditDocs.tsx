/**
 * Partner Audit Documentation - For affiliate network reviews
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  FileCheck, 
  Search, 
  DollarSign, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COMPANY_INFO } from "@/config/legalContent";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const complianceChecklist = [
  { item: "FTC disclosure visible on all search results", status: "compliant" },
  { item: "Partner attribution on checkout redirect", status: "compliant" },
  { item: "Clear 'Opens partner site' notices", status: "compliant" },
  { item: "No false advertising or price manipulation", status: "compliant" },
  { item: "Prices displayed as-is from partner APIs", status: "compliant" },
  { item: "Affiliate disclosure in footer and legal pages", status: "compliant" },
  { item: "No 'cheapest guaranteed' claims", status: "compliant" },
  { item: "User consent for data sharing", status: "compliant" },
];

const partnerRequirements = [
  {
    type: "Travel Affiliates",
    description: "Requirements for Travelpayouts, CJ, and travel affiliate networks",
    requirements: [
      "Clear price comparison display",
      "Partner logo/brand attribution",
      "Redirect disclosure before checkout",
      "No misleading availability claims",
      "Transparent commission model",
    ],
  },
  {
    type: "Hotel Partners",
    description: "Requirements for Booking.com, Hotels.com, and hotel affiliates",
    requirements: [
      "Accurate rate display from API",
      "Clear cancellation policy display",
      "Partner handles booking/refunds",
      "No rate manipulation",
      "Guest review display (where available)",
    ],
  },
  {
    type: "Car Rental Partners",
    description: "Requirements for car rental affiliate networks",
    requirements: [
      "Full pricing transparency",
      "Insurance/add-on disclosure",
      "Partner terms clearly linked",
      "No hidden fees added by ZIVO",
      "Driver age/requirements shown",
    ],
  },
];

export default function PartnerAuditDocs() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <FileCheck className="w-3 h-3 mr-1" />
            Partner Documentation
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Partner Audit Documentation
          </h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive documentation for affiliate network compliance reviews. 
            ZIVO maintains full transparency with users about all affiliate relationships.
          </p>
        </div>

        {/* How ZIVO Sources Prices */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              How ZIVO Sources Prices
            </CardTitle>
            <CardDescription>
              Price sourcing methodology and transparency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="font-medium">Real-Time API Integration</p>
                <p className="text-sm text-muted-foreground">
                  Prices fetched directly from partner APIs in real-time
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="font-medium">No Price Manipulation</p>
                <p className="text-sm text-muted-foreground">
                  Prices displayed exactly as provided by partners
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="font-medium">Partner Prices As-Is</p>
                <p className="text-sm text-muted-foreground">
                  No markup or additional fees added by ZIVO
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="font-medium">Final Price Confirmation</p>
                <p className="text-sm text-muted-foreground">
                  Users see final price on partner checkout page
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Price Disclaimer</p>
                  <p className="text-sm text-muted-foreground">
                    "Prices shown are indicative. Final price and availability confirmed on partner's secure checkout."
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How Commissions Work */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              How Commissions Work
            </CardTitle>
            <CardDescription>
              Transparent affiliate commission model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border bg-muted/30">
              <h4 className="font-semibold mb-2">Affiliate Model</h4>
              <p className="text-sm text-muted-foreground mb-4">
                ZIVO operates as an affiliate platform. When users book through partner links, 
                ZIVO receives a commission from the partner. This commission is paid by the partner, 
                not the user.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">No hidden fees</Badge>
                <Badge variant="outline">Commission from partners</Badge>
                <Badge variant="outline">No user surcharge</Badge>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <p className="text-3xl font-bold text-primary mb-1">0%</p>
                <p className="text-sm text-muted-foreground">Added to user price</p>
              </div>
              <div className="p-4">
                <p className="text-3xl font-bold text-primary mb-1">100%</p>
                <p className="text-sm text-muted-foreground">Transparency</p>
              </div>
              <div className="p-4">
                <p className="text-3xl font-bold text-primary mb-1">Clear</p>
                <p className="text-sm text-muted-foreground">Disclosure</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Transparency */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              User Transparency
            </CardTitle>
            <CardDescription>
              How we inform users about affiliate relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Affiliate Disclosure Visible</p>
                  <p className="text-sm text-muted-foreground">
                    Clear affiliate disclosure on search results and footer
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Partner Attribution</p>
                  <p className="text-sm text-muted-foreground">
                    Partner name/logo shown on checkout redirect
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Redirect Notices</p>
                  <p className="text-sm text-muted-foreground">
                    "Opens partner site in new tab" shown before redirect
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">No False Claims</p>
                  <p className="text-sm text-muted-foreground">
                    No "cheapest guaranteed" or misleading availability claims
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Checklist */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance Checklist
            </CardTitle>
            <CardDescription>
              FTC and partner network compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {complianceChecklist.map((item) => (
                <div key={item.item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm">{item.item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Partner-Specific Requirements */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-bold">Partner-Specific Requirements</h2>
          {partnerRequirements.map((partner) => (
            <Card key={partner.type}>
              <CardHeader>
                <CardTitle className="text-lg">{partner.type}</CardTitle>
                <CardDescription>{partner.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {partner.requirements.map((req) => (
                    <li key={req} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/affiliate-disclosure">
            <Button variant="outline" className="gap-2">
              Affiliate Disclosure
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/how-zivo-makes-money">
            <Button variant="outline" className="gap-2">
              How ZIVO Makes Money
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/compliance">
            <Button variant="outline" className="gap-2">
              Compliance Center
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            For partner inquiries, contact{" "}
            <a href="mailto:partners@hizivo.com" className="text-primary hover:underline">
              partners@hizivo.com
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
