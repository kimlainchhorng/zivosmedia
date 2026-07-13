/**
 * Trust Statement Page
 * Public commitment to transparency and user trust
 */

import Header from "@/components/Header";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  CheckCircle2,
  DollarSign,
  Users,
  Lock,
  Eye,
  Heart,
  Scale,
  FileText,
  Sparkles,
} from "lucide-react";

const trustPillars = [
  {
    icon: Eye,
    title: "Transparency Promise",
    items: [
      "Clear pricing displayed at all times",
      "No hidden fees or service charges",
      "Honest affiliate and partner disclosures",
      "Straightforward terms and conditions",
    ],
  },
  {
    icon: DollarSign,
    title: "User-First Pricing",
    items: [
      "Partner prices shown exactly as provided",
      "No ZIVO surcharges or markups",
      "Commission paid by partners, not users",
      "Price transparency before checkout",
    ],
  },
  {
    icon: Scale,
    title: "Partner Fairness",
    items: [
      "Honest representation of all partners",
      "Fair commission structures",
      "No preferential ranking for payment",
      "Balanced comparison across providers",
    ],
  },
  {
    icon: Lock,
    title: "Data Protection",
    items: [
      "GDPR and CCPA compliance",
      "No selling of personal data",
      "User control over their data",
      "Secure, encrypted storage",
    ],
  },
];

const commitments = [
  {
    title: "We will always show you real prices",
    description: "The prices you see on ZIVO are the same prices our partners charge. We don't add fees.",
  },
  {
    title: "We will clearly disclose our partnerships",
    description: "When you see sponsored content or affiliate links, we'll tell you.",
  },
  {
    title: "We will protect your personal data",
    description: "Your information is encrypted, secured, and never sold to third parties.",
  },
  {
    title: "We will treat all partners fairly",
    description: "Our rankings are based on relevance and value, not payment.",
  },
  {
    title: "We will be honest when things go wrong",
    description: "If there's an issue, we'll communicate clearly and work to resolve it.",
  },
];

const TrustStatement = () => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Trust Statement | ZIVO"
        description="ZIVO's public commitment to transparency, user-first pricing, partner fairness, and data protection."
        canonical="https://hizivo.com/trust-statement"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Trust Statement
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Our Promise to You
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              ZIVO is built on trust. This document outlines our commitments 
              to transparency, fairness, and user protection.
            </p>
          </motion.div>

          {/* Trust Pillars */}
          <section className="mb-16">
            <div className="grid sm:grid-cols-2 gap-6">
              {trustPillars.map((pillar) => (
                <Card key={pillar.title} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <pillar.icon className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h3 className="font-semibold text-lg">{pillar.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {pillar.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Our Commitments */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Our Commitments</h2>
            <div className="space-y-4">
              {commitments.map((commitment, index) => (
                <Card key={commitment.title} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="font-semibold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{commitment.title}</h3>
                        <p className="text-sm text-muted-foreground">{commitment.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* How We Uphold Trust */}
          <section className="mb-16">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-500/5">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">How We Uphold Trust</h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Regular Audits</h4>
                    <p className="text-sm text-muted-foreground">
                      Quarterly reviews of pricing practices and partner agreements.
                    </p>
                  </div>
                  <div className="text-center">
                    <Users className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">User Feedback</h4>
                    <p className="text-sm text-muted-foreground">
                      Active monitoring of user concerns and rapid response.
                    </p>
                  </div>
                  <div className="text-center">
                    <Heart className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Ethical Standards</h4>
                    <p className="text-sm text-muted-foreground">
                      Internal ethics guidelines and compliance training.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Official Statement */}
          <section className="mb-16">
            <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-4">Official Trust Statement</h2>
                <div className="max-w-2xl mx-auto">
                  <p className="text-muted-foreground mb-6 italic">
                    "We, the ZIVO team, commit to operating with transparency, honesty, 
                    and integrity in all our dealings with users, partners, and stakeholders. 
                    We believe that trust is earned through consistent action, not just words. 
                    This statement represents our ongoing commitment to building a platform 
                    that users can rely on."
                  </p>
                  <div className="pt-6 border-t border-border/50">
                    <p className="font-semibold">ZIVO Leadership Team</p>
                    <p className="text-sm text-muted-foreground">ZIVO LLC</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Last updated: {currentDate}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Contact */}
          <div className="text-center p-6 rounded-xl bg-muted/30 border border-border/50">
            <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Questions About Our Practices?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you have concerns about how we handle your data or conduct our business, 
              please reach out.
            </p>
            <a 
              href="mailto:info@hizivo.com" 
              className="text-primary hover:underline"
            >
              info@hizivo.com
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TrustStatement;
