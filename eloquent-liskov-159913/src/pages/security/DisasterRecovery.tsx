/**
 * Business Continuity & Disaster Recovery Page
 * Documents ZIVO's resilience, backup strategy, and recovery procedures
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Database, Clock, AlertTriangle, Server, Radio, TestTube, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COMPANY_INFO } from "@/config/legalContent";

export default function DisasterRecovery() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 safe-area-top z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/security">
              <Button variant="ghost" size="icon" aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-bold text-xl">Business Continuity & Disaster Recovery</h1>
              <p className="text-sm text-muted-foreground">
                Resilience, backups, and recovery procedures
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Overview */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Continuity Commitment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              ZIVO maintains comprehensive Business Continuity and Disaster Recovery plans to ensure 
              critical services remain available, bookings and payments are protected, and users 
              can access support during outages.
            </p>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-sm text-foreground">
                <strong>Important:</strong> Temporary service degradation during recovery operations 
                does not constitute liability. Recovery timelines are targets, not guarantees.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Continuity Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              Business Continuity Plan (BCP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our BCP ensures operational resilience across all service verticals:
            </p>
            <div className="grid gap-3">
              {[
                { label: "Critical Services", desc: "Core booking and payment flows prioritized" },
                { label: "Data Protection", desc: "User data and transaction records preserved" },
                { label: "Support Access", desc: "Customer support remains reachable during incidents" },
                { label: "Communication", desc: "Proactive user notification during outages" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant="outline" className="mt-0.5">{item.label}</Badge>
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disaster Recovery Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Disaster Recovery Plan (DRP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              ZIVO prepares for and can recover from various disaster scenarios:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Cloud infrastructure outages",
                "Database corruption or loss",
                "Cyberattacks and security incidents",
                "Accidental data deletion",
                "Third-party service failures",
                "Natural disasters affecting data centers",
              ].map((scenario) => (
                <div key={scenario} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-sm">{scenario}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Recovery procedures are documented, assigned to responsible teams, and tested periodically.
            </p>
          </CardContent>
        </Card>

        {/* Backup Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-500" />
              Backup Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Automated Backups</h4>
                <p className="text-sm text-muted-foreground">
                  Daily automated backups of all critical data and configurations
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Encryption</h4>
                <p className="text-sm text-muted-foreground">
                  All backups encrypted at rest and in transit using industry standards
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Off-Site Storage</h4>
                <p className="text-sm text-muted-foreground">
                  Backups stored in geographically separate locations
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Access Control</h4>
                <p className="text-sm text-muted-foreground">
                  Backup access restricted to authorized personnel only
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Backup restoration is prioritized by incident severity and business impact.
            </p>
          </CardContent>
        </Card>

        {/* RTO & RPO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-foreground" />
              Recovery Objectives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-lg">RTO</h4>
                <p className="text-sm text-muted-foreground mb-2">Recovery Time Objective</p>
                <p className="text-sm">
                  Target time to restore critical services after an incident
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-lg">RPO</h4>
                <p className="text-sm text-muted-foreground mb-2">Recovery Point Objective</p>
                <p className="text-sm">
                  Maximum acceptable data loss measured in time
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-sm">
                <strong>Important:</strong> Exact recovery timelines are targets, not guarantees. 
                Actual recovery time depends on incident severity, scope, and third-party factors.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Dependencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-foreground" />
              Third-Party Dependency Handling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If a third-party provider experiences an outage (payments, travel suppliers, cloud infrastructure):
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2" />
                <span>ZIVO may temporarily suspend affected services</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2" />
                <span>Users may experience delays or limited functionality</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2" />
                <span>ZIVO is not liable for third-party outages beyond our control</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2" />
                <span>Service restoration depends on third-party recovery</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Emergency Mode */}
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" />
              Emergency Mode Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              During declared emergencies, ZIVO may implement the following measures:
            </p>
            <div className="grid gap-3">
              {[
                { action: "Feature Reduction", desc: "Non-essential features may be temporarily disabled" },
                { action: "Access Restrictions", desc: "Admin and system access may be limited" },
                { action: "Change Freeze", desc: "All non-emergency changes may be suspended" },
                { action: "Centralized Communications", desc: "All updates channeled through official sources" },
              ].map((item) => (
                <div key={item.action} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <Badge variant="destructive" className="mt-0.5">{item.action}</Badge>
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Communication */}
        <Card>
          <CardHeader>
            <CardTitle>Incident Communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              During incidents, ZIVO may notify users via:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">In-App Messages</Badge>
              <Badge variant="secondary">Email Notifications</Badge>
              <Badge variant="secondary">Status Page</Badge>
              <Badge variant="secondary">Social Media</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Communications during incidents are informational and do not constitute admissions of fault or liability.
            </p>
          </CardContent>
        </Card>

        {/* Periodic Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-emerald-500" />
              Periodic Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              ZIVO periodically tests disaster recovery capabilities:
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Database className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Backup Restoration</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Radio className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Incident Response</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Emergency Access</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Test results inform continuous improvement of our recovery procedures.
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>
            For questions about our business continuity practices, contact{" "}
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="text-primary hover:underline">
              {COMPANY_INFO.supportEmail}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
