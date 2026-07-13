/**
 * Data Protection & Encryption Policy Page
 * Documentation for encryption, isolation, and breach impact reduction
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, Database, Lock, Key, Eye, Download,
  Server, Layers, Clock, Trash2, CheckCircle2, ShieldCheck,
  AlertTriangle, FileKey, Binary, HardDrive, Users, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const dataSegments = [
  { segment: "User profiles", isolation: "Separated from payment records" },
  { segment: "Payment data", isolation: "Isolated, tokenized storage" },
  { segment: "Booking data", isolation: "Segmented by service vertical" },
  { segment: "Admin data", isolation: "Isolated from customer data" },
  { segment: "Test data", isolation: "Strictly separated from production" },
];

const encryptedDataTypes = [
  "Personal identifiers (names, DOB)",
  "Contact details (email, phone)",
  "Booking references",
  "Travel document numbers",
  "Internal support notes",
  "Session tokens",
];

const keyManagement = [
  { practice: "Secure storage", description: "Keys stored in hardware security modules" },
  { practice: "Periodic rotation", description: "Automatic key rotation schedule" },
  { practice: "Access restriction", description: "Not accessible to frontend systems" },
  { practice: "Audit logging", description: "All key access is logged" },
];

const transitProtections = [
  { protection: "TLS 1.2+ encryption", status: "Enforced" },
  { protection: "Secure headers (HSTS, CSP)", status: "Active" },
  { protection: "Certificate validation", status: "Required" },
  { protection: "Perfect forward secrecy", status: "Enabled" },
  { protection: "Unencrypted connections", status: "Blocked" },
];

const maskingExamples = [
  { field: "Email", original: "john.doe@gmail.com", masked: "jo***@gmail.com" },
  { field: "Phone", original: "555-123-4567", masked: "***-***-4567" },
  { field: "Card", original: "4242424242424242", masked: "••••••••••••4242" },
  { field: "SSN", original: "123-45-6789", masked: "***-**-6789" },
];

const accessRules = [
  { rule: "Users access only their own data", icon: Users },
  { rule: "Staff access only what they need", icon: Eye },
  { rule: "Admin privileges limited and logged", icon: ShieldCheck },
  { rule: "Temporary access expires automatically", icon: Clock },
  { rule: "Role-based access control (RBAC)", icon: Layers },
];

const queryProtections = [
  "Parameterized queries only (no SQL injection)",
  "No dynamic SQL from user input",
  "Query rate limiting applied",
  "Suspicious queries automatically blocked",
  "Query patterns monitored for anomalies",
];

const retentionPolicies = [
  { data: "Active session tokens", retention: "24 hours", action: "Auto-expire" },
  { data: "Inactive accounts", retention: "2 years", action: "Anonymization" },
  { data: "Booking records", retention: "7 years", action: "Legal retention" },
  { data: "Support logs", retention: "1 year", action: "Purged" },
  { data: "Security logs", retention: "7 years", action: "Archived" },
];

const breachContainment = [
  { action: "Account isolation", description: "Compromised accounts immediately quarantined" },
  { action: "Token revocation", description: "All session tokens invalidated" },
  { action: "Scope identification", description: "Affected data scope mapped" },
  { action: "Lateral movement blocked", description: "No cross-system access possible" },
];

export default function DataProtection() {
  return (
    <>
      <SEOHead
        title="Data Protection & Encryption | ZIVO Security"
        description="Learn how ZIVO protects your data with encryption at rest and in transit, data isolation, tokenization, and breach impact reduction."
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
              <FileKey className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Data Protection & Encryption</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              How ZIVO ensures that even in the event of unauthorized access, 
              the impact is minimal and your sensitive data remains protected.
            </p>
          </div>

          {/* Encryption Status Banner */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <Lock className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700 dark:text-green-400">At Rest</p>
              <p className="text-xs text-muted-foreground">AES-256 Encryption</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700 dark:text-green-400">In Transit</p>
              <p className="text-xs text-muted-foreground">TLS 1.2+ Enforced</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <Key className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700 dark:text-green-400">Key Management</p>
              <p className="text-xs text-muted-foreground">HSM Protected</p>
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="isolation" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
              <TabsTrigger value="isolation" className="text-xs md:text-sm">Isolation</TabsTrigger>
              <TabsTrigger value="encryption" className="text-xs md:text-sm">Encryption</TabsTrigger>
              <TabsTrigger value="access" className="text-xs md:text-sm">Access Control</TabsTrigger>
              <TabsTrigger value="retention" className="text-xs md:text-sm">Retention</TabsTrigger>
            </TabsList>

            {/* Data Isolation Tab */}
            <TabsContent value="isolation">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Data Segmentation & Isolation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      ZIVO isolates data by role and purpose. No single system exposes all data, 
                      limiting the impact of any potential breach.
                    </p>
                    <div className="space-y-3">
                      {dataSegments.map((item) => (
                        <div key={item.segment} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{item.segment}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.isolation}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Breach Blast-Radius Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      If a breach occurs, our architecture limits the damage:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {breachContainment.map((item) => (
                        <div key={item.action} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <p className="font-medium text-sm">{item.action}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Encryption Tab */}
            <TabsContent value="encryption">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-primary" />
                      Encryption at Rest
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      ZIVO encrypts sensitive data at rest using AES-256 encryption:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 mb-6">
                      {encryptedDataTypes.map((type) => (
                        <div key={type} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                          <Lock className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{type}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold mb-3">Key Management</h4>
                    <div className="space-y-2">
                      {keyManagement.map((item) => (
                        <div key={item.practice} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Key className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{item.practice}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Encryption in Transit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      All data in transit is protected. Unencrypted connections are blocked.
                    </p>
                    <div className="space-y-2">
                      {transitProtections.map((item) => (
                        <div key={item.protection} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{item.protection}</span>
                          </div>
                          <Badge variant={item.status === "Blocked" ? "destructive" : "outline"} className="text-xs">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Binary className="w-5 h-5 text-primary" />
                      Tokenization & Data Masking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      ZIVO uses tokenization for payment data and masks sensitive fields in logs and UI:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Field</th>
                            <th className="text-left py-2 font-medium text-muted-foreground">Original</th>
                            <th className="text-left py-2 font-medium">Displayed As</th>
                          </tr>
                        </thead>
                        <tbody>
                          {maskingExamples.map((item) => (
                            <tr key={item.field} className="border-b border-border/50">
                              <td className="py-2 font-medium">{item.field}</td>
                              <td className="py-2 text-muted-foreground line-through">{item.original}</td>
                              <td className="py-2 font-mono text-primary">{item.masked}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Access Control Tab */}
            <TabsContent value="access">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Least-Privilege Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      Access is granted on a need-to-know basis. No user or system has more 
                      access than required for their function.
                    </p>
                    <div className="space-y-3">
                      {accessRules.map((item) => (
                        <div key={item.rule} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{item.rule}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      Download & Export Restrictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {[
                        "No bulk export without explicit approval",
                        "All exports logged and reviewed",
                        "Sensitive data excluded by default",
                        "Export permissions are role-specific",
                        "Time-limited export access",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm">
                          <Lock className="w-4 h-4 text-primary shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      Database Query Protection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {queryProtections.map((protection) => (
                        <div key={protection} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{protection}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Retention Tab */}
            <TabsContent value="retention">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-primary" />
                    Data Retention & Auto-Purge
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    ZIVO minimizes stored data. Data is retained only as legally required, 
                    and old data is automatically purged or anonymized.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Data Type</th>
                          <th className="text-left py-2 font-medium">Retention</th>
                          <th className="text-left py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retentionPolicies.map((item) => (
                          <tr key={item.data} className="border-b border-border/50">
                            <td className="py-3">{item.data}</td>
                            <td className="py-3">
                              <Badge variant="outline">{item.retention}</Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">{item.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Automatic Cleanup</p>
                        <p className="text-sm text-muted-foreground">
                          Expired sessions, old logs, and orphaned data are automatically 
                          purged according to retention schedules. Deleted accounts are 
                          fully anonymized after the retention period.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Key Principles Summary */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Data Protection Principles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: "Minimize", desc: "Collect and store only what's necessary" },
                  { title: "Encrypt", desc: "Protect data at rest and in transit" },
                  { title: "Isolate", desc: "Segment data to limit breach impact" },
                  { title: "Restrict", desc: "Enforce least-privilege access" },
                  { title: "Monitor", desc: "Detect and respond to anomalies" },
                  { title: "Purge", desc: "Delete data when no longer needed" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong className="text-amber-600">Notice:</strong> While ZIVO implements 
                industry-standard protections, no system is 100% secure. Users should also 
                protect their own credentials and devices. ZIVO is not liable for breaches 
                caused by user negligence.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Related security resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link to="/security/zero-trust">Zero-Trust Architecture</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/security/monitoring">Real-Time Monitoring</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/privacy-security">Privacy & Data Handling</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
