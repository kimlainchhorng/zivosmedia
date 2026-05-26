/**
 * Scale Protection & Anti-Fraud Policy Page
 * Comprehensive documentation for fraud, bot, and abuse prevention
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, Bot, CreditCard, UserPlus, Search, 
  KeyRound, Smartphone, AlertTriangle, GraduationCap,
  Ban, Clock, Fingerprint, Eye, Lock, Zap, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const botDefenses = [
  { measure: "Bot detection on search & checkout", status: "Active" },
  { measure: "Rate limiting per IP / device", status: "Active" },
  { measure: "CAPTCHA challenges on suspicious activity", status: "Active" },
  { measure: "API abuse detection", status: "Active" },
  { measure: "Traffic pattern analysis", status: "Active" },
  { measure: "Behavioral fingerprinting", status: "Active" },
];

const fraudIndicators = [
  "Fake or test bookings",
  "Stolen or fraudulent cards",
  "Repeated failed payment attempts",
  "Rapid booking attempts",
  "Unusual purchase patterns",
  "Velocity anomalies",
  "Geographic mismatches",
  "Device reputation signals",
];

const accountProtections = [
  { feature: "Email verification", description: "Required for all accounts" },
  { feature: "Phone verification", description: "Enabled for high-risk actions" },
  { feature: "Device fingerprinting", description: "Track trusted devices" },
  { feature: "Duplicate detection", description: "Prevent multi-accounting" },
  { feature: "Abuse pattern matching", description: "Identify bad actors" },
];

const scrapingDefenses = [
  "Search result throttling",
  "Session-bound offers (non-transferable)",
  "Anti-scraping technical controls",
  "Offer expiration enforcement",
  "Request signature validation",
  "Headless browser detection",
];

const recoveryRules = [
  "Identity verification required",
  "Recovery attempts rate-limited",
  "High-risk recoveries manually reviewed",
  "Multi-factor verification for sensitive changes",
  "ZIVO may refuse recovery to prevent fraud",
];

const sessionControls = [
  { control: "Auto-expiration", description: "Sessions expire after inactivity" },
  { control: "New device alerts", description: "Email notifications for new logins" },
  { control: "Forced logout", description: "Suspicious activity triggers logout" },
  { control: "IP monitoring", description: "Location mismatch detection" },
  { control: "Concurrent limits", description: "Limit simultaneous sessions" },
];

const userTips = [
  "Never share your password or verification codes",
  "Beware of phishing emails and fake websites",
  "ZIVO will never ask for your full card number via email or chat",
  "Enable two-factor authentication for extra protection",
  "Log out from shared or public devices",
  "Report suspicious activity immediately",
];

export default function ScaleProtection() {
  return (
    <>
      <SEOHead
        title="Scale Protection & Anti-Fraud | ZIVO Security"
        description="Learn how ZIVO protects against fraud, bots, scraping, and account abuse at scale. Enterprise-grade security for travelers."
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
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Scale Protection & Anti-Fraud</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              How ZIVO protects against fraud, bots, scraping, fake bookings, and account abuse 
              as we scale.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong className="text-amber-600">Notice:</strong> ZIVO may take protective actions 
                (blocking, delays, restrictions) without prior notice to prevent abuse. These actions 
                are for security purposes and do not create liability.
              </p>
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="bots" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
              <TabsTrigger value="bots" className="text-xs md:text-sm">Bot Defense</TabsTrigger>
              <TabsTrigger value="fraud" className="text-xs md:text-sm">Fraud Prevention</TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs md:text-sm">Account Safety</TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs md:text-sm">Session Security</TabsTrigger>
            </TabsList>

            {/* Bot Defense Tab */}
            <TabsContent value="bots">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    Bot & Automated Attack Defense
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    ZIVO actively blocks automated abuse to protect legitimate users and maintain 
                    fair access to travel deals.
                  </p>
                  <div className="space-y-3 mb-6">
                    {botDefenses.map((item) => (
                      <div key={item.measure} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Ban className="w-4 h-4 text-primary" />
                          <span className="text-sm">{item.measure}</span>
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm">
                      <strong className="text-destructive">Enforcement:</strong> Bots and automated 
                      tools may be blocked without notice. Repeated violations may result in 
                      permanent IP/device bans.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fraud Prevention Tab */}
            <TabsContent value="fraud">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Fraud & Payment Abuse Prevention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    ZIVO monitors for fraudulent activity and reserves the right to delay, flag, 
                    cancel, or reverse suspicious transactions.
                  </p>
                  
                  <h4 className="font-semibold mb-3">Monitored Indicators</h4>
                  <div className="grid sm:grid-cols-2 gap-2 mb-6">
                    {fraudIndicators.map((indicator) => (
                      <div key={indicator} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                        <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{indicator}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="font-semibold mb-3">Possible Actions</h4>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {[
                      { action: "Transaction delay", icon: Clock, desc: "For manual review" },
                      { action: "Flagged for review", icon: AlertTriangle, desc: "Risk assessment" },
                      { action: "Cancellation", icon: Ban, desc: "Fraudulent orders voided" },
                      { action: "Reversal", icon: RefreshCw, desc: "Funds returned to source" },
                    ].map((item) => (
                      <div key={item.action} className="p-3 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{item.action}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <p className="text-sm text-muted-foreground">
                      <strong>No Guarantee:</strong> ZIVO does not guarantee transaction completion. 
                      Transactions may be declined or reversed for security reasons without detailed 
                      explanation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Safety Tab */}
            <TabsContent value="accounts">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Account Creation Protection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {accountProtections.map((item) => (
                        <div key={item.feature} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Fingerprint className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{item.feature}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Fake or abusive accounts are removed without notice. ZIVO may request 
                      additional verification at any time.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-primary" />
                      Account Recovery Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {recoveryRules.map((rule) => (
                        <li key={rule} className="flex items-center gap-2 text-sm">
                          <Lock className="w-4 h-4 text-primary shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Session Security Tab */}
            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Session & Device Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {sessionControls.map((item) => (
                      <div key={item.control} className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-primary" />
                          <h4 className="font-medium">{item.control}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Search & Scraping Protection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search & Scraping Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                ZIVO prevents unauthorized data extraction and price scraping to ensure fair 
                access for legitimate users.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {scrapingDefenses.map((defense) => (
                  <div key={defense} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <span>{defense}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                <strong>Notice:</strong> Search access does not grant data ownership. Offer data 
                is licensed for personal, non-commercial use only.
              </p>
            </CardContent>
          </Card>

          {/* User Education */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Stay Safe: User Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Help us protect your account. You are responsible for keeping your credentials safe.
              </p>
              <ul className="space-y-2">
                {userTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm">
                    <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Fraud Response */}
          <Card className="mb-8 border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Fraud Response & Containment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                If fraud is suspected, ZIVO may take immediate action without prior notice:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "Account access may be restricted or suspended",
                  "Payments may be frozen pending investigation",
                  "Offers and bookings may be voided",
                  "Evidence is preserved for potential legal action",
                ].map((action) => (
                  <li key={action} className="flex items-center gap-2 text-sm">
                    <Ban className="w-4 h-4 text-destructive shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium">
                Actions taken for security purposes do not create liability for ZIVO.
              </p>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Related security information:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link to="/security/zero-trust">Zero-Trust Architecture</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/security/report">Report Abuse</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/legal/terms">Terms of Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
