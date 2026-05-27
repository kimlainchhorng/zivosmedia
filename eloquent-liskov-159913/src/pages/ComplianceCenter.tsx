/**
 * Compliance Center - Unified hub for all legal and compliance resources
 */

import { Link } from "react-router-dom";
import { 
  FileText, 
  Shield, 
  Scale, 
  Eye, 
  Users, 
  Globe, 
  CreditCard, 
  Building,
  Search,
  Download,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { motion } from "framer-motion";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";

const complianceCategories = [
  {
    id: "legal",
    title: "Legal Documents",
    icon: FileText,
    description: "Core terms and policies governing platform use",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    links: [
      { name: "Terms of Service", href: "/terms", updated: "2024-01" },
      { name: "Privacy Policy", href: "/privacy", updated: "2024-01" },
      { name: "Cookie Policy", href: "/cookies", updated: "2024-01" },
      { name: "Refund Policy", href: "/refunds", updated: "2024-01" },
      { name: "Cancellation Policy", href: "/legal/cancellation-policy", updated: "2024-01" },
      { name: "Acceptable Use Policy", href: "/legal/acceptable-use", updated: "2024-01" },
    ],
  },
  {
    id: "regulatory",
    title: "Regulatory Compliance",
    icon: Scale,
    description: "Travel industry registrations and consumer protections",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    links: [
      { name: "Seller of Travel", href: "/legal/seller-of-travel", updated: "2024-01" },
      { name: "Regulatory Status", href: "/legal/regulatory-status", updated: "2024-01" },
      { name: "Consumer Disclosures", href: "/legal/consumer-disclosures", updated: "2024-01" },
      { name: "Travel Rules", href: "/legal/travel-rules", updated: "2024-01" },
      { name: "Rental Compliance", href: "/legal/rental-compliance", updated: "2024-01" },
    ],
  },
  {
    id: "privacy",
    title: "Data Rights & Privacy",
    icon: Eye,
    description: "Your data rights under GDPR, CCPA, and global standards",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    links: [
      { name: "Privacy Controls", href: "/account/privacy", updated: "2024-01" },
      { name: "Data Protection", href: "/security/data-protection", updated: "2024-01" },
      { name: "Data Residency", href: "/legal/data-residency", updated: "2024-01" },
      { name: "Children's Privacy", href: "/legal/children-privacy", updated: "2024-01" },
      { name: "Data Breach Policy", href: "/legal/data-breach", updated: "2024-01" },
    ],
  },
  {
    id: "partner",
    title: "Partner Transparency",
    icon: Users,
    description: "How we work with partners and handle referrals",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    links: [
      { name: "Affiliate Disclosure", href: "/affiliate-disclosure", updated: "2024-01" },
      { name: "Partner Disclosure", href: "/partner-disclosure", updated: "2024-01" },
      { name: "Partner Agreement", href: "/partner-agreement", updated: "2024-01" },
      { name: "Third Party Services", href: "/legal/third-party-services", updated: "2024-01" },
      { name: "How ZIVO Makes Money", href: "/how-zivo-makes-money", updated: "2024-01" },
    ],
  },
  {
    id: "security",
    title: "Security & Trust",
    icon: Shield,
    description: "Platform security, encryption, and trust certifications",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    links: [
      { name: "Security Hub", href: "/security", updated: "2024-01" },
      { name: "Enterprise Trust", href: "/security/enterprise", updated: "2024-01" },
      { name: "Zero Trust Policy", href: "/security/zero-trust", updated: "2024-01" },
      { name: "Incident Response", href: "/legal/security-incident", updated: "2024-01" },
      { name: "Disaster Recovery", href: "/security/disaster-recovery", updated: "2024-01" },
    ],
  },
  {
    id: "payments",
    title: "Payments & Financial",
    icon: CreditCard,
    description: "Payment processing, refunds, and financial policies",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    links: [
      { name: "Payment Transparency", href: "/legal/payment-transparency", updated: "2024-01" },
      { name: "Payment Processors", href: "/legal/payment-processors", updated: "2024-01" },
      { name: "Payment Finality", href: "/legal/payment-finality", updated: "2024-01" },
      { name: "Financial Records", href: "/legal/financial-records", updated: "2024-01" },
    ],
  },
];

export default function ComplianceCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = complianceCategories.map(category => ({
    ...category,
    links: category.links.filter(link =>
      link.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.links.length > 0 || searchQuery === "");

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <Badge variant="secondary" className="mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Compliance Center
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Transparency & Compliance
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            All policies are written in clear, user-friendly language. 
            We believe in transparent communication with our users.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </motion.div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">GDPR Ready</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">CCPA Compliant</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground dark:text-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">PCI-DSS Level 1</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Seller of Travel Registered</span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center mb-4`}>
                  <category.icon className={`w-6 h-6 ${category.color}`} />
                </div>
                <CardTitle className="text-lg">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors group"
                      >
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {link.name}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <Link to="/account/privacy" className="block">
                  <div className="p-4 rounded-xl bg-background border hover:shadow-md transition-shadow text-center">
                    <Eye className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">Manage Privacy</p>
                    <p className="text-xs text-muted-foreground">Control your data</p>
                  </div>
                </Link>
                <Link to="/help" className="block">
                  <div className="p-4 rounded-xl bg-background border hover:shadow-md transition-shadow text-center">
                    <Building className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-sm">Contact Compliance</p>
                    <p className="text-xs text-muted-foreground">Ask questions</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    // Build a single JSON manifest of every policy + link so a
                    // user (or auditor) can archive the full policy set in one
                    // click. No server roundtrip — the structure is already in
                    // memory on this page. The site origin is included so the
                    // links resolve from outside the app too.
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const payload = {
                      generated_at: new Date().toISOString(),
                      origin,
                      categories: complianceCategories.map((c) => ({
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        policies: c.links.map((l) => ({
                          name: l.name,
                          url: `${origin}${l.href}`,
                          last_updated: l.updated,
                        })),
                      })),
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const stamp = new Date().toISOString().slice(0, 10);
                    a.download = `zivo-policies-${stamp}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-4 rounded-xl bg-background border hover:shadow-md transition-shadow text-center w-full"
                >
                  <Download className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-medium text-sm">Download All Policies</p>
                  <p className="text-xs text-muted-foreground">JSON manifest</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Notice */}
        <div className="text-center mt-12 text-sm text-muted-foreground max-w-2xl mx-auto">
          <p>
            Questions about our policies? Contact us at{" "}
            <a href="mailto:legal@hizivo.com" className="text-primary hover:underline">
              legal@hizivo.com
            </a>
          </p>
          <p className="mt-2">
            Last comprehensive review: January 2024
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
