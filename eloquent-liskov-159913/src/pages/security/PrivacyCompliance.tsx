/**
 * Privacy Compliance Documentation Page
 * GDPR, CCPA, and privacy practices overview
 */

import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, Globe, CheckCircle2, Clock, Users,
  FileText, Lock, Eye, Download, Trash2, AlertTriangle,
  Scale, Building, Baby, Ban, Bell, Gavel
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const userRights = [
  { right: "Access my data", icon: Eye, description: "Request a copy of all personal data we hold" },
  { right: "Download my data", icon: Download, description: "Portable copy in machine-readable format" },
  { right: "Correct my data", icon: FileText, description: "Fix inaccurate or incomplete information" },
  { right: "Delete my data", icon: Trash2, description: "Request erasure (subject to legal requirements)" },
  { right: "Restrict processing", icon: Ban, description: "Limit how we use your data" },
  { right: "Withdraw consent", icon: Shield, description: "Revoke previously given consent" },
];

const consentRequirements = [
  { policy: "Terms of Service", required: true, method: "Explicit checkbox" },
  { policy: "Privacy Policy", required: true, method: "Explicit checkbox" },
  { policy: "Cookies & Tracking", required: "EU users", method: "Cookie banner opt-in" },
  { policy: "Marketing Communications", required: false, method: "Opt-in checkbox" },
];

const requestTimelines = [
  { regulation: "GDPR", timeline: "30 days", extension: "Up to 2 months for complex requests" },
  { regulation: "CCPA/CPRA", timeline: "45 days", extension: "Up to 90 days with notice" },
  { regulation: "UK GDPR", timeline: "30 days", extension: "Up to 2 months for complex requests" },
];

const deletionSafeguards = [
  { data: "Personal identifiers", action: "Erased or anonymized", retention: "None" },
  { data: "Financial records", action: "Retained", retention: "7 years (legal)" },
  { data: "Fraud/security logs", action: "Preserved", retention: "Per legal requirements" },
  { data: "Booking history", action: "Anonymized", retention: "Aggregated only" },
];

const staffAccessControls = [
  "All staff access to personal data is logged",
  "Access is role-restricted and purpose-limited",
  "No browsing of user data without justification",
  "Regular access audits and reviews",
  "Training on data protection requirements",
];

const sensitiveDataRules = [
  { rule: "No intentional collection of children's data", icon: Baby },
  { rule: "No sale of personal data", icon: Ban },
  { rule: "No sensitive data used for profiling", icon: Users },
  { rule: "Special category data handled with extra care", icon: Shield },
];

export default function PrivacyCompliance() {
  return (
    <>
      <SEOHead
        title="Privacy Compliance | ZIVO Security"
        description="Learn about ZIVO's GDPR and CCPA compliance, user data rights, consent management, and privacy practices."
      />
      <Header />

      <main className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/security" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Security
            </Link>
          </div>

          {/* Header */}
          <div className="text-center py-8 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Scale className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Privacy Compliance</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              How ZIVO protects your privacy rights and complies with global data protection regulations.
            </p>
          </div>

          {/* Compliance Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Badge className="px-4 py-2 text-sm bg-blue-500/10 text-blue-600 border-blue-500/30">
              <Globe className="w-4 h-4 mr-2" />
              GDPR Compliant
            </Badge>
            <Badge className="px-4 py-2 text-sm bg-green-500/10 text-green-600 border-green-500/30">
              <Shield className="w-4 h-4 mr-2" />
              CCPA Ready
            </Badge>
            <Badge className="px-4 py-2 text-sm bg-secondary text-foreground border-border">
              <Lock className="w-4 h-4 mr-2" />
              Privacy by Design
            </Badge>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="rights" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
              <TabsTrigger value="rights" className="text-xs md:text-sm">Your Rights</TabsTrigger>
              <TabsTrigger value="consent" className="text-xs md:text-sm">Consent</TabsTrigger>
              <TabsTrigger value="timelines" className="text-xs md:text-sm">Timelines</TabsTrigger>
              <TabsTrigger value="safeguards" className="text-xs md:text-sm">Safeguards</TabsTrigger>
            </TabsList>

            {/* Your Rights Tab */}
            <TabsContent value="rights">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Data Subject Rights (DSAR)
                  </CardTitle>
                  <CardDescription>
                    ZIVO supports the following user data rights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {userRights.map((item) => (
                      <div key={item.right} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.right}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm">
                      <strong>Exercise your rights:</strong> Visit{" "}
                      <Link to="/account/privacy" className="text-primary hover:underline">
                        Privacy Controls
                      </Link>{" "}
                      to submit data requests, or email{" "}
                      <a href="mailto:privacy@hizivo.com" className="text-primary hover:underline">
                        privacy@hizivo.com
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Sensitive Data Protection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {sensitiveDataRules.map((item) => (
                      <div key={item.rule} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <item.icon className="w-5 h-5 text-primary shrink-0" />
                        <span className="text-sm">{item.rule}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Consent Tab */}
            <TabsContent value="consent">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Consent Requirements
                  </CardTitle>
                  <CardDescription>
                    ZIVO requires explicit consent for services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Policy</th>
                          <th className="text-left py-2 font-medium">Required</th>
                          <th className="text-left py-2 font-medium">Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consentRequirements.map((item) => (
                          <tr key={item.policy} className="border-b border-border/50">
                            <td className="py-3 font-medium">{item.policy}</td>
                            <td className="py-3">
                              {item.required === true ? (
                                <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Required</Badge>
                              ) : item.required === false ? (
                                <Badge variant="outline">Optional</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">{item.required}</Badge>
                              )}
                            </td>
                            <td className="py-3 text-muted-foreground">{item.method}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h4 className="font-semibold">Consent Logging</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        "Timestamp recorded",
                        "IP address logged",
                        "Policy version stored",
                        "Device/browser info captured",
                        "Consent method tracked",
                        "Audit trail maintained",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Cookie & Tracking Disclosure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />
                      <span className="text-sm">Essential vs optional cookies clearly distinguished</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />
                      <span className="text-sm">Opt-in/out controls for non-essential cookies</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />
                      <span className="text-sm">No tracking before consent (EU users)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-1" />
                      <span className="text-sm">Cookie preferences can be changed anytime</span>
                    </li>
                  </ul>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link to="/cookies">View Cookie Policy</Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timelines Tab */}
            <TabsContent value="timelines">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Privacy Request Timelines
                  </CardTitle>
                  <CardDescription>
                    Response times by regulation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requestTimelines.map((item) => (
                      <div key={item.regulation} className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{item.regulation}</h4>
                          <Badge variant="outline">{item.timeline}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.extension}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-600">Identity Verification Required</p>
                        <p className="text-muted-foreground">
                          All data requests are verified before processing to prevent unauthorized access.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-primary" />
                    Privacy Incident Handling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      "Access restricted immediately on detection",
                      "Investigation initiated within 24 hours",
                      "Users notified if required by law",
                      "Regulators notified when mandated",
                      "Root cause analysis and prevention",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Safeguards Tab */}
            <TabsContent value="safeguards">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-primary" />
                    Data Deletion Safeguards
                  </CardTitle>
                  <CardDescription>
                    What happens when you request deletion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Data Type</th>
                          <th className="text-left py-2 font-medium">Action</th>
                          <th className="text-left py-2 font-medium">Retention</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deletionSafeguards.map((item) => (
                          <tr key={item.data} className="border-b border-border/50">
                            <td className="py-3">{item.data}</td>
                            <td className="py-3">
                              <Badge variant={item.action === "Erased or anonymized" ? "default" : "secondary"}>
                                {item.action}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">{item.retention}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    Staff Privacy Controls
                  </CardTitle>
                  <CardDescription>
                    How we protect your data internally
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {staffAccessControls.map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                        <Lock className="w-4 h-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* CTA Section */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">Manage Your Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Access your privacy controls, submit data requests, and manage consent preferences.
                  </p>
                </div>
                <Button asChild>
                  <Link to="/account/privacy">Privacy Controls</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Related resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/cookies">Cookie Policy</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/security/data-protection">Data Protection</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
