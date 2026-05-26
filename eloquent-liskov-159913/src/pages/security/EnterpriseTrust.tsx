/**
 * Enterprise Trust - Security signals page for banks, partners, and enterprise customers
 */

import { Link } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  Server, 
  Users, 
  Eye, 
  AlertTriangle,
  CheckCircle2,
  Building,
  CreditCard,
  Globe,
  FileCheck,
  Clock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const securityBadges = [
  {
    title: "Secure Infrastructure",
    description: "Hosted on enterprise-grade cloud infrastructure with redundancy and high availability",
    icon: Server,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    details: ["AWS/Supabase hosting", "Multi-region redundancy", "99.9% uptime target"],
  },
  {
    title: "Encrypted Data",
    description: "All data encrypted at rest and in transit using industry-standard protocols",
    icon: Lock,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    details: ["AES-256 encryption at rest", "TLS 1.3 in transit", "Key rotation policies"],
  },
  {
    title: "Trusted Payments",
    description: "Payment processing through PCI-DSS Level 1 certified providers",
    icon: CreditCard,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    details: ["Stripe (PCI Level 1)", "No card data storage", "Tokenized transactions"],
  },
  {
    title: "Access Control",
    description: "Role-based access control with multi-factor authentication",
    icon: Users,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    details: ["RBAC implementation", "MFA for admin access", "Least privilege principle"],
  },
  {
    title: "Continuous Monitoring",
    description: "24/7 security monitoring with automated threat detection",
    icon: Eye,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    details: ["Real-time alerting", "Automated anomaly detection", "Security event logging"],
  },
  {
    title: "Incident Response",
    description: "Documented incident response procedures with defined escalation paths",
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    details: ["Response playbooks", "24-hour SLA for critical", "Post-incident reviews"],
  },
];

const complianceSignals = [
  { name: "GDPR Ready", status: "active", description: "EU data protection compliance" },
  { name: "CCPA Compliant", status: "active", description: "California privacy rights" },
  { name: "PCI-DSS", status: "active", description: "Payment card industry standards" },
  { name: "SOC 2 Type II", status: "roadmap", description: "Security audit certification" },
];

export default function EnterpriseTrust() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Enterprise Security
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Enterprise-Grade Trust & Security
          </h1>
          <p className="text-lg text-muted-foreground">
            ZIVO implements enterprise-grade security controls to protect user data, 
            payments, and platform integrity. Built for trust at scale.
          </p>
        </div>

        {/* Compliance Signals */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Compliance Status
              </CardTitle>
              <CardDescription>
                Current compliance certifications and attestations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {complianceSignals.map((signal) => (
                  <div
                    key={signal.name}
                    className={`p-4 rounded-xl border ${
                      signal.status === "active" 
                        ? "bg-emerald-500/5 border-emerald-500/30" 
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {signal.status === "active" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-sm">{signal.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{signal.description}</p>
                    {signal.status === "roadmap" && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Roadmap
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Badges Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {securityBadges.map((badge) => (
            <Card key={badge.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${badge.bgColor} flex items-center justify-center mb-4`}>
                  <badge.icon className={`w-6 h-6 ${badge.color}`} />
                </div>
                <CardTitle className="text-lg">{badge.title}</CardTitle>
                <CardDescription>{badge.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {badge.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Statement */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Bank & Partner Confidence</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                ZIVO's security infrastructure is designed to meet the requirements of 
                financial institutions, payment processors, and enterprise partners. 
                We maintain comprehensive documentation and are prepared for security reviews.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/legal/payment-transparency">
                  <Button variant="outline" className="gap-2">
                    Payment Documentation
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/partner-audit-docs">
                  <Button variant="outline" className="gap-2">
                    Partner Audit Docs
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold mb-4 text-center">Related Security Resources</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/security" className="block">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 text-center">
                  <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Security Hub</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/reliability" className="block">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 text-center">
                  <Server className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Reliability</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/security/disaster-recovery" className="block">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 text-center">
                  <Globe className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Disaster Recovery</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/compliance" className="block">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 text-center">
                  <FileCheck className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Compliance Center</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            For security questionnaires or enterprise inquiries, contact{" "}
            <a href="mailto:security@hizivo.com" className="text-primary hover:underline">
              security@hizivo.com
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
