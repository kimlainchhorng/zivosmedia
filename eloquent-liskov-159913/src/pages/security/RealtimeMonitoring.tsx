/**
 * Real-Time Security Monitoring Page
 * Documentation for monitoring, alerts, and incident response
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, Activity, Bell, AlertTriangle, Lock,
  Eye, Zap, Clock, FileText, Radio, Server, Ban, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Info, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const monitoredActivities = [
  { activity: "Suspicious login behavior", icon: Eye },
  { activity: "Multiple failed login attempts", icon: XCircle },
  { activity: "New device or location access", icon: Server },
  { activity: "Abnormal booking patterns", icon: Activity },
  { activity: "API abuse or traffic spikes", icon: Zap },
  { activity: "Admin privilege changes", icon: ShieldAlert },
];

const alertTriggers = [
  { trigger: "Possible account takeover", severity: "high" },
  { trigger: "Payment fraud indicators", severity: "high" },
  { trigger: "Data access anomalies", severity: "medium" },
  { trigger: "Bot or scraping activity", severity: "medium" },
  { trigger: "Admin misuse patterns", severity: "critical" },
  { trigger: "Key or token misuse", severity: "critical" },
];

const severityLevels = [
  { 
    level: "Low", 
    color: "bg-blue-500", 
    description: "Unusual but non-critical activity",
    response: "Logged for review within 24 hours",
    icon: Info
  },
  { 
    level: "Medium", 
    color: "bg-amber-500", 
    description: "Suspicious behavior requiring review",
    response: "Investigated within 4 hours",
    icon: AlertCircle
  },
  { 
    level: "High", 
    color: "bg-orange-500", 
    description: "Confirmed or likely breach",
    response: "Immediate containment initiated",
    icon: AlertTriangle
  },
  { 
    level: "Critical", 
    color: "bg-red-500", 
    description: "Active compromise or data risk",
    response: "All-hands response activated",
    icon: XCircle
  },
];

const containmentActions = [
  { action: "Force logouts", description: "Terminate all active sessions" },
  { action: "Disable sessions", description: "Prevent new authentications" },
  { action: "Lock accounts", description: "Suspend account access" },
  { action: "Pause payments", description: "Hold financial transactions" },
  { action: "Restrict admin access", description: "Limit privileged operations" },
  { action: "Block IPs/regions", description: "Geographic access controls" },
];

const responseWorkflow = [
  { step: 1, name: "Detect", description: "Identify suspicious activity via monitoring systems", icon: Eye },
  { step: 2, name: "Contain", description: "Isolate affected systems and limit damage", icon: Lock },
  { step: 3, name: "Investigate", description: "Analyze root cause and scope of incident", icon: Activity },
  { step: 4, name: "Mitigate", description: "Remove threat and patch vulnerabilities", icon: Shield },
  { step: 5, name: "Recover", description: "Restore normal operations safely", icon: RefreshCw },
  { step: 6, name: "Document", description: "Record findings and lessons learned", icon: FileText },
];

const logRetentionPolicies = [
  { type: "Authentication logs", retention: "2 years" },
  { type: "Security incident logs", retention: "7 years" },
  { type: "Admin action logs", retention: "5 years" },
  { type: "API access logs", retention: "1 year" },
  { type: "Payment audit logs", retention: "7 years" },
];

export default function RealtimeMonitoring() {
  return (
    <>
      <SEOHead
        title="Real-Time Security Monitoring | ZIVO Security"
        description="Learn how ZIVO monitors for threats 24/7, responds to incidents, and protects your data with automated alerts and rapid containment."
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
              <Radio className="w-7 h-7 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <h1 className="text-3xl font-bold">Real-Time Security Monitoring</h1>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                24/7 Active
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Continuous threat detection, automated alerts, and rapid incident response 
              to protect your account and data.
            </p>
          </div>

          {/* Live Status Banner */}
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">All Systems Operational</p>
                <p className="text-sm text-muted-foreground">Security monitoring active • No current incidents</p>
              </div>
            </div>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="monitoring" className="mb-12">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
              <TabsTrigger value="monitoring" className="text-xs md:text-sm">Monitoring</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs md:text-sm">Alerts</TabsTrigger>
              <TabsTrigger value="response" className="text-xs md:text-sm">Response</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs md:text-sm">Compliance</TabsTrigger>
            </TabsList>

            {/* Monitoring Tab */}
            <TabsContent value="monitoring">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Continuous Security Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    ZIVO continuously monitors all platform activity to detect threats before 
                    they can cause harm. Our systems run 24/7 without interruption.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {monitoredActivities.map((item) => (
                      <div key={item.activity} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{item.activity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Real-Time Analysis</p>
                        <p className="text-sm text-muted-foreground">
                          Events are analyzed within milliseconds. Anomalies trigger immediate 
                          evaluation against threat patterns.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Automated Security Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      Alerts are triggered automatically and notify authorized security 
                      personnel immediately for rapid response.
                    </p>
                    <div className="space-y-2">
                      {alertTriggers.map((item) => (
                        <div key={item.trigger} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className={`w-4 h-4 ${
                              item.severity === 'critical' ? 'text-red-500' :
                              item.severity === 'high' ? 'text-orange-500' : 'text-amber-500'
                            }`} />
                            <span className="text-sm">{item.trigger}</span>
                          </div>
                          <Badge variant={
                            item.severity === 'critical' ? 'destructive' :
                            item.severity === 'high' ? 'default' : 'secondary'
                          } className="text-xs">
                            {item.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Incident Severity Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {severityLevels.map((level) => (
                        <div key={level.level} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                          <div className={`w-10 h-10 rounded-lg ${level.color}/20 flex items-center justify-center shrink-0`}>
                            <level.icon className={`w-5 h-5 ${level.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{level.level}</span>
                              <span className={`w-3 h-3 rounded-full ${level.color}`} />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{level.description}</p>
                            <p className="text-xs text-primary">{level.response}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Response Tab */}
            <TabsContent value="response">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      Automated Containment Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      When high-risk activity is detected, ZIVO may take immediate action 
                      without user notice to protect the platform.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 mb-4">
                      {containmentActions.map((item) => (
                        <div key={item.action} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Ban className="w-4 h-4 text-destructive" />
                            <span className="font-medium text-sm">{item.action}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm">
                          <strong className="text-amber-600">Notice:</strong> Containment actions 
                          may occur automatically without prior notice. This is to ensure rapid 
                          protection of all users.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      Incident Response Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {responseWorkflow.map((step, index) => (
                        <div key={step.step} className="flex gap-4 pb-6 last:pb-0">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary z-10">
                              <step.icon className="w-5 h-5 text-primary" />
                            </div>
                            {index < responseWorkflow.length - 1 && (
                              <div className="w-0.5 h-full bg-primary/20 mt-2" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="pt-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-primary">Step {step.step}</span>
                            </div>
                            <h4 className="font-semibold">{step.name}</h4>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Breach Notification Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      In the event of a data breach, ZIVO follows legal notification 
                      requirements and industry best practices.
                    </p>
                    <ul className="space-y-3 mb-4">
                      {[
                        "Legal notification requirements are evaluated",
                        "Users are notified when required by law",
                        "Regulators are notified where mandated",
                        "Notification timing follows legal standards",
                        "Affected users receive guidance on protective steps",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-muted-foreground italic">
                      No admission of liability is implied by breach notifications.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      Post-Incident Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { action: "Root cause analysis", desc: "Identify how the incident occurred" },
                        { action: "Controls strengthened", desc: "Improve defenses based on findings" },
                        { action: "Policy updates", desc: "Revise procedures as needed" },
                        { action: "Recurrence prevention", desc: "Implement safeguards" },
                      ].map((item) => (
                        <div key={item.action} className="p-3 rounded-lg bg-muted/50">
                          <p className="font-medium text-sm">{item.action}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Security Log Retention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Security logs are tamper-resistant, time-stamped, and retained per 
                      legal requirements for investigations and audits.
                    </p>
                    <div className="space-y-2">
                      {logRetentionPolicies.map((policy) => (
                        <div key={policy.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">{policy.type}</span>
                          <Badge variant="outline">{policy.retention}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Links */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Related security resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <Link to="/security/zero-trust">Zero-Trust Architecture</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/security/scale-protection">Fraud Protection</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/security/report">Report an Incident</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
