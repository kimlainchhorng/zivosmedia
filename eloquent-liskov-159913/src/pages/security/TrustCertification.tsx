/**
 * Trust & Certification Page
 * Security audits, attestations, and external proof documentation
 */

import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, CheckCircle2, Building, FileCheck, Lock,
  Users, Globe, RefreshCw, AlertTriangle, Award, Server,
  CreditCard, Plane, Cloud, Eye, Calendar, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const securityPillars = [
  { title: "Security-First Platform", icon: Shield, description: "Built with security at every layer" },
  { title: "Encrypted Data", icon: Lock, description: "Transit & rest encryption" },
  { title: "No Card Storage", icon: CreditCard, description: "PCI handled by Stripe" },
  { title: "Licensed Partners", icon: Plane, description: "Ticketing via authorized agents" },
];

const auditReadiness = [
  "Documented security controls and policies",
  "Comprehensive access and audit trails",
  "Incident response procedures",
  "Backup and recovery evidence",
  "Privacy and consent records",
  "Vulnerability management process",
];

const complianceFrameworks = [
  {
    name: "SOC 2",
    status: "Aligned",
    description: "Security, Availability, Confidentiality trust principles",
    note: "Controls aligned with SOC 2 requirements",
  },
  {
    name: "ISO 27001",
    status: "Aligned",
    description: "Information security management principles",
    note: "Processes follow ISO 27001 framework",
  },
  {
    name: "GDPR",
    status: "Compliant",
    description: "EU General Data Protection Regulation",
    note: "Full compliance with data subject rights",
  },
  {
    name: "CCPA",
    status: "Compliant",
    description: "California Consumer Privacy Act",
    note: "Privacy controls for US users",
  },
];

const certifiedPartners = [
  {
    name: "Stripe",
    certification: "PCI-DSS Level 1",
    role: "Payment processing",
    icon: CreditCard,
  },
  {
    name: "Duffel & Licensed Ticketing Partners",
    certification: "IATA/ARC Accredited",
    role: "Airline ticketing",
    icon: Plane,
  },
  {
    name: "Cloud Infrastructure",
    certification: "SOC 2 Type II",
    role: "Hosting & compute",
    icon: Cloud,
  },
  {
    name: "Supabase",
    certification: "SOC 2 Type II",
    role: "Database & auth",
    icon: Server,
  },
];

const annualReviews = [
  { review: "Internal security review", frequency: "Annual" },
  { review: "Privacy practices review", frequency: "Annual" },
  { review: "Vendor security assessment", frequency: "Annual" },
  { review: "Policy updates", frequency: "As laws evolve" },
  { review: "Penetration testing", frequency: "Periodic" },
];

export default function TrustCertification() {
  return (
    <>
      <SEOHead
        title="Security Trust & Certification | ZIVO"
        description="Learn about ZIVO's security posture, audit readiness, compliance frameworks, and certified partners. Enterprise-grade security for travel."
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
              <Award className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Security Trust & Certification</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ZIVO's security controls are designed for independent verification, 
              audit readiness, and partner confidence.
            </p>
          </div>

          {/* Trust Pillars */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {securityPillars.map((pillar) => (
              <div key={pillar.title} className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <pillar.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </div>

          {/* Security Audit Readiness */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Security Audit Readiness
              </CardTitle>
              <CardDescription>
                ZIVO maintains documentation and evidence for independent security audits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {auditReadiness.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Independent audits may be conducted periodically to verify controls.
              </p>
            </CardContent>
          </Card>

          {/* Compliance Frameworks */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Compliance Framework Alignment
              </CardTitle>
              <CardDescription>
                Controls aligned with industry standards (alignment does not guarantee certification)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {complianceFrameworks.map((framework) => (
                  <div key={framework.name} className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{framework.name}</h4>
                      <Badge variant={framework.status === "Compliant" ? "default" : "secondary"}>
                        {framework.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{framework.description}</p>
                    <p className="text-xs text-muted-foreground">{framework.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certified Partners */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Certified Partner Attestations
              </CardTitle>
              <CardDescription>
                ZIVO relies on independently certified partners for critical operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certifiedPartners.map((partner) => (
                  <div key={partner.name} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <partner.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{partner.name}</h4>
                        <Badge variant="outline" className="text-xs">{partner.certification}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{partner.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>No card data storage:</strong> ZIVO does not store raw payment card data. 
                  All payment processing is handled by PCI-DSS compliant processors.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Annual Reviews */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Annual Security & Privacy Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {annualReviews.map((item) => (
                  <div key={item.review} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-primary" />
                      <span className="text-sm">{item.review}</span>
                    </div>
                    <Badge variant="outline">{item.frequency}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Failure to conduct scheduled reviews does not waive security protections.
              </p>
            </CardContent>
          </Card>

          {/* Vendor Review */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Vendor & Dependency Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ZIVO reviews critical vendors including:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {["Payment processors", "Travel suppliers", "Cloud providers", "Monitoring services"].map((vendor) => (
                  <div key={vendor} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{vendor}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Vendor security issues may result in service changes to protect users.
              </p>
            </CardContent>
          </Card>

          {/* Customer Assurance */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Customer & Partner Security Assurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ZIVO may provide upon request:
              </p>
              <ul className="space-y-2">
                {[
                  "Security overview (high-level)",
                  "Compliance summaries",
                  "Risk posture explanations",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Detailed internal architecture and configurations are not disclosed publicly.
              </p>
            </CardContent>
          </Card>

          {/* Responsible Disclosure */}
          <Card className="mb-8 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Responsible Disclosure Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Security researchers who discover vulnerabilities are encouraged to report them responsibly.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:security@hizivo.com">
                  Report a Vulnerability
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Important Disclaimer */}
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                No Absolute Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Security measures are designed to <strong>reduce risk</strong>, not eliminate it entirely. 
                ZIVO does not guarantee absolute security or claim to be "unhackable." 
                We continuously improve our security posture and respond promptly to emerging threats.
              </p>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Related security resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/security">Security Overview</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/security/data-protection">Data Protection</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/security/privacy-compliance">Privacy Compliance</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
