/**
 * Security Operations Page
 * Ongoing protection, daily/weekly/monthly security tasks
 */

import { Link } from "react-router-dom";
import {
  ArrowLeft, Shield, Clock, Calendar, CalendarDays, Users,
  AlertTriangle, GitBranch, Megaphone, TrendingUp, CheckCircle2,
  Activity, CreditCard, Bot, Key, Database, UserX, Lock,
  RefreshCw, TestTube, FileCheck, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const dailyTasks = [
  { task: "Failed login spike detection", icon: AlertTriangle },
  { task: "Payment failure anomaly monitoring", icon: CreditCard },
  { task: "Admin activity review", icon: Users },
  { task: "API traffic spike detection", icon: Activity },
  { task: "Bot detection alerts review", icon: Bot },
];

const weeklyTasks = [
  { task: "Audit log review", icon: FileCheck },
  { task: "Fraud report analysis", icon: AlertTriangle },
  { task: "High-risk credential rotation (if needed)", icon: Key },
  { task: "Backup success verification", icon: Database },
  { task: "Support escalation review", icon: Users },
];

const monthlyTasks = [
  { task: "Dependency security updates", icon: RefreshCw },
  { task: "Access review (remove unused staff access)", icon: UserX },
  { task: "Environment variable audit", icon: Lock },
  { task: "Account recovery flow testing", icon: TestTube },
  { task: "Backup restore test (sample)", icon: Database },
];

const accessRules = [
  "No shared admin accounts",
  "No permanent elevated access",
  "Remove access immediately when staff leave",
  "Enforce least-privilege always",
  "Role-based access control (RBAC) enforced",
];

const incidentDrills = [
  { scenario: "Account takeover", description: "Simulate compromised user account and response" },
  { scenario: "Payment fraud", description: "Test fraud detection and transaction reversal" },
  { scenario: "Data exposure", description: "Practice breach containment and notification" },
];

const changeManagementRules = [
  "Security review required before deployment",
  "Secrets never pushed to frontend code",
  "Production configuration verified",
  "Rollback plan documented and ready",
  "Audit trail for all changes",
];

export default function SecurityOperations() {
  return (
    <>
      <SEOHead
        title="Security Operations | ZIVO"
        description="Learn about ZIVO's ongoing security operations including daily monitoring, weekly reviews, incident drills, and continuous improvement practices."
      />
      <Header />

      <main className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/security" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all duration-200">
              <ArrowLeft className="w-4 h-4" />
              Back to Security
            </Link>
          </div>

          {/* Header */}
          <div className="text-center py-8 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Security Operations</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ongoing protection through disciplined operations, routine checks, and fast incident response.
            </p>
          </div>

          {/* Operations Overview */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <Clock className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold">Daily</h3>
              <p className="text-sm text-muted-foreground">Continuous monitoring</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
              <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold">Weekly</h3>
              <p className="text-sm text-muted-foreground">Review & analysis</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary border border-border text-center">
              <CalendarDays className="w-6 h-6 text-foreground mx-auto mb-2" />
              <h3 className="font-semibold">Monthly</h3>
              <p className="text-sm text-muted-foreground">Deep audits</p>
            </div>
          </div>

          {/* Daily Security Operations */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-500" />
                Daily Security Operations
              </CardTitle>
              <CardDescription>
                Automated monitoring and manual review performed every day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {dailyTasks.map((item) => (
                  <div key={item.task} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <item.icon className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{item.task}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Suspicious activity is escalated immediately for investigation.
              </p>
            </CardContent>
          </Card>

          {/* Weekly Security Tasks */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Weekly Security Tasks
              </CardTitle>
              <CardDescription>
                Regular review and maintenance performed each week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {weeklyTasks.map((item) => (
                  <div key={item.task} className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <item.icon className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-sm">{item.task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Security Tasks */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-foreground" />
                Monthly Security Tasks
              </CardTitle>
              <CardDescription>
                Deep audits and system-wide reviews performed monthly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {monthlyTasks.map((item) => (
                  <div key={item.task} className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border">
                    <item.icon className="w-4 h-4 text-foreground shrink-0" />
                    <span className="text-sm">{item.task}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Access & Role Hygiene */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Access & Role Hygiene
              </CardTitle>
              <CardDescription>
                Strict access control rules to minimize security risks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accessRules.map((rule) => (
                  <div key={rule} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Incident Drills */}
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <TestTube className="w-5 h-5" />
                Incident Response Drills
              </CardTitle>
              <CardDescription>
                Regular simulations to ensure rapid incident response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidentDrills.map((drill) => (
                  <div key={drill.scenario} className="p-4 rounded-lg bg-background border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{drill.scenario}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{drill.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Goal:</strong> Response in minutes, not days. Regular drills ensure our team is prepared for real incidents.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Management */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Change Management
              </CardTitle>
              <CardDescription>
                Security-first approach to all platform changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {changeManagementRules.map((rule) => (
                  <div key={rule} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Public Security Communication */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                Public Security Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { text: "Security page kept up to date", link: "/security" },
                  { text: "Clear support contact available", link: "/contact" },
                  { text: "Scam & phishing warnings visible", link: "/security/scams" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                    <Link to={item.link} className="text-xs text-primary hover:underline">
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Continuous Improvement */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Continuous Improvement
              </CardTitle>
              <CardDescription>
                Security controls evolve based on emerging threats and requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { factor: "New Threats", description: "Adapt to emerging attack vectors" },
                  { factor: "User Behavior", description: "Learn from usage patterns" },
                  { factor: "Partner Requirements", description: "Meet compliance needs" },
                  { factor: "Regulatory Updates", description: "Stay ahead of legal changes" },
                ].map((item) => (
                  <div key={item.factor} className="p-3 rounded-lg bg-background border border-border">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Eye className="w-3 h-3 text-primary" />
                      {item.factor}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Related security resources:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/security">Security Overview</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/security/trust">Trust & Certification</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/security/scams">Scam Prevention</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
