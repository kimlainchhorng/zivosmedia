/**
 * Privacy & Security Page
 * How we protect your information - detailed breakdown
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Shield, Database, Clock, Download, Trash2, 
  Eye, Lock, ArrowLeft, CheckCircle2, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { COMPANY_INFO } from "@/config/legalContent";

const dataTypes = [
  {
    category: "Account Information",
    items: ["Email address", "Name", "Password (hashed)"],
    purpose: "To create and manage your account",
    retention: "Until account deletion + 30 days",
  },
  {
    category: "Booking Information",
    items: ["Travel dates", "Passenger names", "Booking preferences"],
    purpose: "To process and manage your travel bookings",
    retention: "7 years (legal requirement)",
  },
  {
    category: "Payment Information",
    items: ["Card last 4 digits", "Billing address"],
    purpose: "To process payments (full card details stored by Stripe)",
    retention: "7 years (legal requirement)",
  },
  {
    category: "Usage Data",
    items: ["Search queries", "Pages viewed", "Device information"],
    purpose: "To improve our service and detect issues",
    retention: "90 days",
  },
];

const securityMeasures = [
  {
    title: "Technical Safeguards",
    items: [
      "TLS 1.3 encryption for all data in transit",
      "AES-256 encryption for data at rest",
      "Secure password hashing with bcrypt",
      "Regular security patching and updates",
      "Intrusion detection systems",
    ],
  },
  {
    title: "Access Controls",
    items: [
      "Role-based access control (RBAC)",
      "Multi-factor authentication for staff",
      "Audit logging of all data access",
      "Principle of least privilege",
      "Regular access reviews",
    ],
  },
  {
    title: "Organizational Measures",
    items: [
      "Employee security training",
      "Background checks for staff with data access",
      "Incident response procedures",
      "Vendor security assessments",
      "Regular security audits",
    ],
  },
];

export default function PrivacySecurity() {
  return (
    <>
      <SEOHead
        title="How We Protect Your Information | ZIVO Privacy & Security"
        description="Understand what data ZIVO collects, why we collect it, how we store it, and your rights to access, export, or delete your information."
      />
      <Header />

      <main className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/security" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Security
            </Link>
          </div>

          {/* Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center py-8 mb-8"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">How We Protect Your Information</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparency about your data: what we collect, why, and how we keep it safe.
            </p>
          </motion.div>

          {/* Data We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              What We Collect
            </h2>
            <div className="space-y-4">
              {dataTypes.map((type) => (
                <Card key={type.category}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{type.category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Data points:</p>
                      <p className="text-sm">{type.items.join(", ")}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Purpose:</p>
                        <p className="text-sm">{type.purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Retention:</p>
                        <p className="text-sm">{type.retention}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Data Minimization */}
          <Card className="mb-12 border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Data Minimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We only collect data that's necessary to provide our services. We don't collect sensitive personal information 
                like Social Security numbers, and we don't track your location unless you explicitly enable location-based features.
              </p>
            </CardContent>
          </Card>

          {/* How We Store & Protect */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              How We Store & Protect Your Data
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {securityMeasures.map((measure) => (
                <AccordionItem key={measure.title} value={measure.title} className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline font-semibold">
                    {measure.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {measure.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary" />
              Your Data Rights
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Download className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-semibold">Export Your Data</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Request a copy of all personal data we hold about you in a portable format.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="font-semibold">Delete Your Data</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Request deletion of your account and personal data, subject to legal retention requirements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Retention */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Retention Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We retain your data only as long as necessary to provide our services and comply with legal obligations:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  <span><strong>Account data:</strong> Retained until you delete your account, then removed within 30 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  <span><strong>Booking/payment records:</strong> 7 years (tax and legal compliance)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  <span><strong>Usage analytics:</strong> 90 days (anonymized after)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">•</span>
                  <span><strong>Security logs:</strong> 1 year (fraud prevention)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <div className="text-center p-8 rounded-xl bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <h3 className="text-lg font-semibold mb-2">Have Questions About Your Data?</h3>
            <p className="text-muted-foreground mb-4">
              Contact our privacy team for data requests or questions.
            </p>
            <a 
              href={`mailto:${COMPANY_INFO.email}`}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              {COMPANY_INFO.email}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
