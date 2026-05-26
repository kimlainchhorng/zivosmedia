/**
 * Damage & Incident Policy - P2P Car Rental Marketplace
 */
import { Link } from "react-router-dom";
import { ArrowLeft, Car, Shield, AlertTriangle, Camera, Clock, FileText, Mail, Phone, CheckCircle, Scale, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const DamagePolicy = () => {
  const lastUpdated = "February 2, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Damage & Incident Policy - ZIVO P2P Car Rental"
        description="How to report damage, documentation requirements, and dispute resolution for ZIVO peer-to-peer car rentals."
        canonical="/damage-policy"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-6">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Important Policy</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Damage & Incident Policy</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* How to Report Damage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-destructive" />
                How to Report Damage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive">During Rental</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    If damage occurs while driving, immediately:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Ensure everyone's safety first</li>
                    <li>2. Call emergency services if needed (911)</li>
                    <li>3. Contact ZIVO support: <strong className="text-foreground">1-888-ZIVO-HELP</strong></li>
                    <li>4. Document the scene with photos</li>
                    <li>5. Do not admit fault at the scene</li>
                  </ul>
                </div>
                
                <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-500">At Return</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    Before leaving the vehicle:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Complete walkthrough inspection with owner (if present)</li>
                    <li>2. Take detailed photos of entire vehicle</li>
                    <li>3. Note any damage in the ZIVO app</li>
                    <li>4. Get owner acknowledgment if possible</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Post-Return</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    If damage is discovered after return:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Owners have <strong>48 hours</strong> to report damage</li>
                    <li>• Renters should report within <strong>24 hours</strong> if discovered later</li>
                    <li>• Email photos and description to support@hizivo.com</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Photo Documentation Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Proper documentation is essential for claim processing. Both renters and owners should:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Pre-Trip Walkthrough
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• All 4 sides of vehicle</li>
                    <li>• Close-ups of existing damage</li>
                    <li>• Odometer reading</li>
                    <li>• Fuel gauge</li>
                    <li>• Interior condition</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Post-Trip Documentation
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Same angles as pre-trip</li>
                    <li>• Any new damage (multiple angles)</li>
                    <li>• Final odometer reading</li>
                    <li>• Final fuel gauge</li>
                    <li>• Date/time stamped photos</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Photos should be clear, well-lit, and show the full context of any damage.
              </p>
            </CardContent>
          </Card>

          {/* Inspection Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Inspection Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Joint Inspection</h4>
                    <p className="text-sm text-muted-foreground">
                      Renter and owner should inspect vehicle together at pickup and return when possible
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Document Everything</h4>
                    <p className="text-sm text-muted-foreground">
                      Take photos/videos and note condition in the ZIVO app at both pickup and return
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Report Promptly</h4>
                    <p className="text-sm text-muted-foreground">
                      Owners have 48 hours after return to report any damage. Late reports may not be accepted.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Claim Review Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Claim Review Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">Initial Review</p>
                    <p className="text-sm text-muted-foreground">Assessment of damage claim validity</p>
                  </div>
                  <Badge variant="outline">48 hours</Badge>
                </div>
                
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">Investigation</p>
                    <p className="text-sm text-muted-foreground">Evidence collection and review</p>
                  </div>
                  <Badge variant="outline">Up to 7 days</Badge>
                </div>

                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">Resolution</p>
                    <p className="text-sm text-muted-foreground">Final decision and payment processing</p>
                  </div>
                  <Badge variant="outline">Within 14 days</Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Complex cases involving third-party insurance may take longer to resolve.
              </p>
            </CardContent>
          </Card>

          {/* Resolution Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Resolution Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Damage claims may be resolved through:</p>
              
              <div className="grid gap-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Insurance Claim
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    If damage is covered by ZIVO's third-party insurance, the claim is processed through the insurer. 
                    Deductibles apply based on the renter's selected protection plan.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Direct Owner Compensation
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    For damage not covered by insurance, owners may be compensated directly from the 
                    renter's payment method on file.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-amber-500" />
                    Dispute Escalation
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    If parties disagree, ZIVO provides mediation services. Final decisions are made based on 
                    available evidence and platform policies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispute Handling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Dispute Handling Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Formal Dispute Filing</h4>
                    <p className="text-sm text-muted-foreground">
                      Either party can file a formal dispute through the ZIVO dashboard or by contacting support
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Evidence Submission Window</h4>
                    <p className="text-sm text-muted-foreground">
                      Both parties have <strong>72 hours</strong> to submit all relevant evidence (photos, receipts, statements)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">ZIVO Mediation</h4>
                    <p className="text-sm text-muted-foreground">
                      Our team reviews all evidence and attempts to facilitate a fair resolution
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-amber-600">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Final Decision</h4>
                    <p className="text-sm text-muted-foreground">
                      A binding decision is issued within <strong>14 days</strong> of dispute filing
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payout Delays */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                When Payouts May Be Delayed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Owner payouts may be held in the following situations:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Active dispute or damage claim under review
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Pending damage assessment (awaiting repair estimates)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Admin review required (policy violation investigation)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Insurance claim in progress
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Once the dispute is resolved, payouts are processed within 48 hours.
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
              <Link to="/cancellation-policy">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  Cancellation Policy
                </Badge>
              </Link>
            </div>
          </div>

          {/* Contact */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Phone className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Emergency Support</h3>
                  <p className="text-sm text-muted-foreground">Available 24/7 for active rentals</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">1-888-ZIVO-HELP</p>
                <a 
                  href="mailto:support@hizivo.com" 
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  support@hizivo.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DamagePolicy;
