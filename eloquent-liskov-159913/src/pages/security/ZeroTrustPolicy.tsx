/**
 * Zero-Trust Security Policy Page
 * Advanced security documentation for enterprise transparency
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, Lock, Eye, Server, Key, Database,
  UserX, AlertTriangle, RefreshCw, HardDrive, Scan,
  CheckCircle2, XCircle, Clock, Fingerprint, Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const zeroTrustPrinciples = [
  {
    icon: Fingerprint,
    title: "Verify Explicitly",
    description: "Every request is authenticated and authorized based on all available data points including user identity, location, device, and request context.",
  },
  {
    icon: Lock,
    title: "Least Privilege Access",
    description: "Access is granted on a just-in-time and just-enough-access basis. No user or system has more permissions than absolutely necessary.",
  },
  {
    icon: AlertTriangle,
    title: "Assume Breach",
    description: "We design systems assuming attackers may already be present. This drives segmentation, encryption, and continuous monitoring.",
  },
];

const dlpControls = [
  { control: "PII masking in logs", status: "active", description: "Sensitive data automatically redacted" },
  { control: "URL parameter sanitization", status: "active", description: "No PII in URLs or query strings" },
  { control: "Payment data isolation", status: "active", description: "Card data never touches ZIVO servers" },
  { control: "Short-lived tokens", status: "active", description: "Access tokens expire quickly" },
  { control: "Export audit logging", status: "active", description: "All data exports are tracked" },
  { control: "Bulk export restrictions", status: "active", description: "Rate limits on data extraction" },
];

const atoProtections = [
  {
    threat: "Credential Stuffing",
    protection: "Rate limiting, CAPTCHA, breach password detection",
  },
  {
    threat: "Session Hijacking",
    protection: "Secure cookies, token binding, session fingerprinting",
  },
  {
    threat: "Phishing",
    protection: "2FA encouragement, login anomaly detection",
  },
  {
    threat: "Brute Force",
    protection: "Progressive delays, account lockout, IP blocking",
  },
  {
    threat: "Device Compromise",
    protection: "New device verification, forced re-authentication",
  },
];

const insiderControls = [
  "Staff cannot access raw payment data",
  "Bulk PII exports require approval",
  "Payout changes trigger audit alerts",
  "Audit logs are immutable and tamper-evident",
  "All admin actions require authentication",
  "Privileged access is time-limited",
];

const breachContainment = [
  { phase: "Detection", action: "Automated alerts on anomalous activity" },
  { phase: "Isolation", action: "Affected systems quarantined automatically" },
  { phase: "Invalidation", action: "All sessions terminated, tokens revoked" },
  { phase: "Rotation", action: "Credentials and keys rotated" },
  { phase: "Investigation", action: "Forensic analysis initiated" },
  { phase: "Recovery", action: "Clean restoration from verified backups" },
];

export default function ZeroTrustPolicy() {
  return (
    <>
      <SEOHead
        title="Zero-Trust Security | ZIVO Enterprise Security"
        description="Learn about ZIVO's Zero-Trust security model, data loss prevention, account protection, and breach containment strategies."
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
            <h1 className="text-3xl font-bold mb-3">Zero-Trust Security Model</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade security controls protecting against modern threats, insider abuse, 
              and data breaches.
            </p>
          </div>

          {/* Zero-Trust Principles */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Core Principles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {zeroTrustPrinciples.map((principle) => (
                <Card key={principle.title}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <principle.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground">{principle.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Tabbed Content */}
          <Tabs defaultValue="dlp" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
              <TabsTrigger value="dlp" className="text-xs md:text-sm">DLP</TabsTrigger>
              <TabsTrigger value="ato" className="text-xs md:text-sm">ATO Protection</TabsTrigger>
              <TabsTrigger value="insider" className="text-xs md:text-sm">Insider Threats</TabsTrigger>
              <TabsTrigger value="breach" className="text-xs md:text-sm">Breach Response</TabsTrigger>
              <TabsTrigger value="keys" className="text-xs md:text-sm">Key Management</TabsTrigger>
            </TabsList>

            {/* DLP Tab */}
            <TabsContent value="dlp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Data Loss Prevention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    ZIVO implements strict data minimization and loss prevention controls to protect 
                    sensitive information from unauthorized access or extraction.
                  </p>
                  <div className="space-y-3">
                    {dlpControls.map((item) => (
                      <div key={item.control} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{item.control}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ATO Protection Tab */}
            <TabsContent value="ato">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-primary" />
                    Account Takeover Protection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Multiple layers of defense protect user accounts from unauthorized access 
                    and credential-based attacks.
                  </p>
                  <div className="space-y-4">
                    {atoProtections.map((item) => (
                      <div key={item.threat} className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="font-medium">{item.threat}</p>
                            <p className="text-sm text-muted-foreground mt-1">{item.protection}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insider Threats Tab */}
            <TabsContent value="insider">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Insider Threat Protection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Even trusted staff operate under strict controls. All administrative actions 
                    are logged, audited, and subject to principle of least privilege.
                  </p>
                  <ul className="space-y-3">
                    {insiderControls.map((control) => (
                      <li key={control} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span>{control}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm">
                      <strong className="text-amber-600">Note:</strong> All admin actions are logged 
                      to immutable audit trails. Attempts to disable logging or access unauthorized 
                      data trigger immediate alerts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Breach Response Tab */}
            <TabsContent value="breach">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Breach Containment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    If a security incident is suspected, automated containment procedures activate 
                    immediately. These actions may occur without notice to minimize damage.
                  </p>
                  <div className="space-y-4">
                    {breachContainment.map((item, index) => (
                      <div key={item.phase} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 p-3 rounded-lg bg-muted/50">
                          <p className="font-medium">{item.phase}</p>
                          <p className="text-sm text-muted-foreground">{item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Key Management Tab */}
            <TabsContent value="keys">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    Key & Secret Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Cryptographic keys and secrets are managed with strict security controls 
                    to prevent unauthorized access or exposure.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Secure Storage</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Secrets stored only in encrypted environment vaults, never in code
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Automatic Rotation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Keys are rotated regularly; compromised keys revoked immediately
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Backup Protection</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Encrypted backups with restricted access and off-site storage
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Scan className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">Continuous Monitoring</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Vulnerability scanning and dependency monitoring in real-time
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm">
                      <strong className="text-destructive">Ransomware Policy:</strong> ZIVO does not 
                      negotiate with attackers. We maintain tested backup and recovery procedures.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* API Hardening */}
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                API & Backend Hardening
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Authentication Required", desc: "All APIs require valid authentication" },
                  { label: "Rate Limiting", desc: "Per-IP and per-user request limits" },
                  { label: "Webhook Validation", desc: "Signature verification on all webhooks" },
                  { label: "Replay Prevention", desc: "Nonce and timestamp validation" },
                  { label: "Admin IP Allowlists", desc: "Admin APIs restricted by IP" },
                  { label: "Auto-Blocking", desc: "Suspicious traffic blocked automatically" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Have security concerns?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link to="/security/report">Report a Vulnerability</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/legal/security-incident">Incident Response Policy</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
