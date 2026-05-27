/**
 * Insurance Disclaimer & Claims Policy Page
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileX, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMMUNICATIONS_COMPLIANCE_POLICIES, COMPANY_INFO } from "@/config/legalContent";

export default function InsuranceDisclaimer() {
  const insurance = COMMUNICATIONS_COMPLIANCE_POLICIES.insuranceDisclaimer;
  const claims = COMMUNICATIONS_COMPLIANCE_POLICIES.noClaimsHandling;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 safe-area-top z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/legal/terms">
              <Button variant="ghost" size="icon" aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-bold text-xl">{insurance.title}</h1>
              <p className="text-sm text-muted-foreground">
                Version {insurance.version} • {COMPANY_INFO.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8 border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Informational Only</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Insurance information displayed on ZIVO is for informational purposes only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Insurance Certificate Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>{insurance.content}</p>
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <h4 className="font-semibold text-foreground mb-2">No Guarantee For:</h4>
              <ul className="space-y-2">
                {insurance.noGuaranteeFor.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-destructive">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <FileX className="h-5 w-5" />
              {claims.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{claims.content}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              User Responsibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Users are responsible for:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Independently verifying insurance coverage before transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Contacting insurance providers directly for coverage questions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Filing claims directly with the relevant insurance company</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Understanding coverage limitations and exclusions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Insurance questions:{" "}
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="text-primary hover:underline">
              {COMPANY_INFO.supportEmail}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
