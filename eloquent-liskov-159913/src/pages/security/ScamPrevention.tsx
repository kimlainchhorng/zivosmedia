/**
 * Scam Prevention & Anti-Phishing Page
 * User safety education and reporting tools
 */

import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, AlertTriangle, Mail, Phone, MessageSquare,
  Lock, Eye, UserX, Flag, CheckCircle2, XCircle, ExternalLink,
  AlertCircle, Headphones, FileWarning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const officialChannels = [
  { channel: "Email", value: "@hizivo.com domains only", icon: Mail },
  { channel: "In-App", value: "Official app notifications", icon: MessageSquare },
  { channel: "Website", value: "hizivo.com only", icon: ExternalLink },
];

const neverAskFor = [
  "Your password",
  "One-time verification codes (OTP)",
  "Full credit/debit card numbers",
  "CVV or security codes",
  "Private keys or wallet phrases",
  "Social Security numbers",
  "Bank account PINs",
];

const scamWarnings = [
  {
    title: "Fake Support Calls",
    description: "Scammers may call claiming to be ZIVO support. We never call asking for passwords or payment info.",
    icon: Phone,
  },
  {
    title: "Phishing Emails",
    description: "Fake emails may look official but contain malicious links. Always check the sender domain.",
    icon: Mail,
  },
  {
    title: "Fake Refund Offers",
    description: "Scammers may claim you're owed a refund and ask for bank details. ZIVO refunds go through original payment method.",
    icon: FileWarning,
  },
  {
    title: "Impersonation on Social Media",
    description: "Fake ZIVO accounts may message you. We never initiate support via social media DMs.",
    icon: UserX,
  },
];

const reportOptions = [
  { type: "Phishing email", description: "Forward suspicious emails claiming to be from ZIVO" },
  { type: "Fake website", description: "Report websites impersonating ZIVO" },
  { type: "Scam call/SMS", description: "Report calls or texts claiming to be ZIVO support" },
  { type: "Social media scam", description: "Report fake ZIVO accounts or messages" },
];

export default function ScamPrevention() {
  return (
    <>
      <SEOHead
        title="Scam Prevention & Anti-Phishing | ZIVO Security"
        description="Learn how to protect yourself from phishing, scams, and impersonation. Report suspicious activity and stay safe with ZIVO."
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
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Scam Prevention & Anti-Phishing</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Protect yourself from phishing, impersonation, and social engineering attacks.
            </p>
          </div>

          {/* Critical Warning */}
          <Alert className="mb-8 border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-red-600 dark:text-red-400 font-bold">
              Beware of Phishing
            </AlertTitle>
            <AlertDescription className="text-red-600/90 dark:text-red-400/90">
              <strong>ZIVO will NEVER ask for your password, one-time codes, or full card numbers.</strong> 
              If anyone asks for these, it's a scam. Report it immediately.
            </AlertDescription>
          </Alert>

          {/* Official Communication Channels */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Official ZIVO Communication Channels
              </CardTitle>
              <CardDescription>
                ZIVO only contacts you through these verified channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {officialChannels.map((item) => (
                  <div key={item.channel} className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                    <item.icon className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <h4 className="font-semibold">{item.channel}</h4>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What We Never Ask For */}
          <Card className="mb-8 border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-5 h-5" />
                ZIVO Will NEVER Ask For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {neverAskFor.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Common Scam Types */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Common Scam Types to Watch For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {scamWarnings.map((scam) => (
                  <div key={scam.title} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <scam.icon className="w-5 h-5 text-amber-500" />
                      <h4 className="font-semibold">{scam.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{scam.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Anti-Impersonation Policy */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-primary" />
                Anti-Impersonation Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm">Any impersonation of ZIVO, its employees, or partners is strictly prohibited</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm">Fake agents, fake support, and fake promotional offers are scams</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm">ZIVO is not liable for communications that occur outside official channels</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm">Users assume risk when engaging with unverified parties claiming to represent ZIVO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report a Scam */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-primary" />
                Report a Scam or Phishing Attempt
              </CardTitle>
              <CardDescription>
                Help us protect the community by reporting suspicious activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                {reportOptions.map((option) => (
                  <div key={option.type} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                    <Flag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-medium text-sm">{option.type}</h4>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="mailto:security@hizivo.com?subject=Scam Report">
                    <Flag className="w-4 h-4 mr-2" />
                    Report a Scam
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:security@hizivo.com?subject=Phishing Email Report">
                    Forward Phishing Email
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Reports may result in account protection actions, investigation, and cooperation with authorities.
              </p>
            </CardContent>
          </Card>

          {/* Support Safety Rules */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                ZIVO Support Safety Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our support agents follow strict security protocols:
              </p>
              <div className="space-y-3">
                {[
                  "Cannot request sensitive credentials (passwords, full card numbers, CVVs)",
                  "Cannot reset accounts without proper identity verification",
                  "Cannot bypass security controls or two-factor authentication",
                  "All support actions are logged and auditable",
                ].map((rule) => (
                  <div key={rule} className="flex items-start gap-3">
                    <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Responsibility */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Your Responsibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                By using ZIVO, you acknowledge that:
              </p>
              <div className="space-y-3">
                {[
                  "You must protect your account credentials and not share them with anyone",
                  "You must verify the authenticity of communications claiming to be from ZIVO",
                  "ZIVO is not responsible for losses caused by user-shared secrets or credentials",
                  "You should enable two-factor authentication for additional protection",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Disclaimer */}
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Platform Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ZIVO is not responsible for losses caused by:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "User negligence or carelessness",
                  "Successful phishing attacks",
                  "Off-platform communications",
                  "Third-party impersonation",
                  "Shared credentials or passwords",
                  "Failure to verify communications",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30 mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Quick Safety Tips
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Always check the URL before entering credentials",
                "Enable two-factor authentication",
                "Never share your password with anyone",
                "Verify unexpected emails by contacting support directly",
                "Report suspicious activity immediately",
                "Keep your recovery email up to date",
              ].map((tip) => (
                <div key={tip} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Related security resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/security">Security Overview</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/account/privacy">Privacy Controls</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
