/**
 * Insurance & Protection Disclosure Page
 * /legal/insurance-disclosure
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, Info, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { INSURANCE_DISCLOSURE, COMPANY_INFO } from "@/config/legalContent";
import Footer from "@/components/Footer";

export default function InsuranceDisclosure() {
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
            <Shield className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Insurance & Protection Disclosure</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Important information about protection plans offered through ZIVO.
          </p>
        </div>

        {/* Main Disclosure */}
        <Alert className="mb-8 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="text-lg">Important Disclosure</AlertTitle>
          <AlertDescription className="text-base mt-2">
            {INSURANCE_DISCLOSURE.content}
          </AlertDescription>
        </Alert>

        {/* Key Points */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Key Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Not an Insurance Provider</p>
                <p className="text-sm text-muted-foreground">
                  ZIVO does not underwrite or provide insurance coverage. We are not an insurance company.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Third-Party Providers</p>
                <p className="text-sm text-muted-foreground">
                  Protection plans offered through ZIVO are provided by licensed third-party insurance providers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Policy Terms Apply</p>
                <p className="text-sm text-muted-foreground">
                  All coverage is subject to the specific terms, conditions, and exclusions of the insurance policy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Deductibles May Apply</p>
                <p className="text-sm text-muted-foreground">
                  Protection plans may include deductibles that you are responsible for paying in the event of a claim.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card className="mb-8 bg-blue-500/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Our Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              We strongly recommend that you carefully review the full policy terms, conditions, and 
              exclusions before purchasing any protection plan. If you have questions about coverage, 
              please contact the insurance provider directly or consult with a licensed insurance professional.
            </p>
          </CardContent>
        </Card>

        {/* Applies To */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>This Disclosure Applies To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">Car Rental Protection</p>
                <p className="text-sm text-muted-foreground">
                  Damage waivers and liability protection for vehicle rentals
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">Ride Protection</p>
                <p className="text-sm text-muted-foreground">
                  Accident coverage during ride-share trips
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="bg-muted/50">
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">
              Insurance questions? Contact{" "}
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
