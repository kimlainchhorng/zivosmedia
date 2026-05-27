/**
 * Enterprise Ready - Procurement-friendly documentation for corporate and government buyers
 */

import { 
  Building, 
  FileText, 
  Shield, 
  Users,
  CheckCircle2,
  CreditCard,
  Globe,
  Lock,
  Mail,
  ArrowRight,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const enterpriseFeatures = [
  {
    title: "Corporate Travel Compatibility",
    icon: Users,
    description: "Built for business travel management",
    items: [
      "Business account structure",
      "Multi-traveler booking support",
      "Expense reporting integration ready",
      "Corporate travel policy support (roadmap)",
      "Centralized billing management",
    ],
  },
  {
    title: "Invoice-Ready Structure",
    icon: FileText,
    description: "Complete financial documentation",
    items: [
      "VAT/Tax ID support",
      "Automated invoice generation",
      "Purchase order tracking",
      "Custom billing cycles available",
      "Detailed transaction records",
    ],
  },
  {
    title: "Procurement Documentation",
    icon: Building,
    description: "Ready for enterprise onboarding",
    items: [
      "Company registration documents",
      "Insurance certificates (on request)",
      "Security questionnaire responses",
      "Vendor assessment support",
      "Compliance attestations",
    ],
  },
  {
    title: "Security & Compliance",
    icon: Shield,
    description: "Enterprise-grade security posture",
    items: [
      "Data processing agreement (DPA) ready",
      "GDPR/CCPA compliance",
      "SOC 2 Type II (roadmap)",
      "PCI-DSS via Stripe",
      "Regular security assessments",
    ],
  },
];

const complianceStatus = [
  { name: "GDPR", status: "active", description: "EU data protection" },
  { name: "CCPA", status: "active", description: "California privacy" },
  { name: "PCI-DSS", status: "active", description: "Payment security" },
  { name: "SOC 2 Type II", status: "roadmap", description: "Security audit" },
  { name: "ISO 27001", status: "roadmap", description: "InfoSec standard" },
];

export default function EnterpriseReady() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <Building className="w-3 h-3 mr-1" />
            Enterprise
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Enterprise Ready
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            ZIVO is designed to meet enterprise procurement requirements. 
            Contact our business team for custom agreements and documentation.
          </p>
          <Button size="lg" className="gap-2" asChild>
            <a href="mailto:enterprise@hizivo.com">
              <Mail className="w-4 h-4" />
              Contact Enterprise Sales
            </a>
          </Button>
        </div>

        {/* Compliance Status */}
        <Card className="mb-12 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Compliance Certifications
            </CardTitle>
            <CardDescription>
              Current compliance status and roadmap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-5 gap-4">
              {complianceStatus.map((cert) => (
                <div
                  key={cert.name}
                  className={`p-4 rounded-xl border text-center ${
                    cert.status === "active" 
                      ? "bg-emerald-500/5 border-emerald-500/30" 
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {cert.status === "active" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Clock className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-semibold text-sm">{cert.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{cert.description}</p>
                  {cert.status === "roadmap" && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Roadmap
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {enterpriseFeatures.map((feature) => (
            <Card key={feature.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Our enterprise team is ready to provide custom agreements, security documentation, 
              and tailored solutions for your organization's travel needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <a href="mailto:enterprise@hizivo.com">
                  <Mail className="w-4 h-4" />
                  enterprise@hizivo.com
                </a>
              </Button>
              <Link to="/security/enterprise">
                <Button variant="outline" size="lg" className="gap-2">
                  Security Documentation
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold mb-4">Additional Resources</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/business/corporate-travel">
              <Button variant="outline" className="gap-2">
                Corporate Travel
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/compliance">
              <Button variant="outline" className="gap-2">
                Compliance Center
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/reliability">
              <Button variant="outline" className="gap-2">
                Reliability
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
