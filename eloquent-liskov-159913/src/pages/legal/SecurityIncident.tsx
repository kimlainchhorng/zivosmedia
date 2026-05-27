/**
 * Security Incident Response Policy Page
 * Legal page explaining how ZIVO handles security incidents
 */

import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, AlertTriangle, Lock, Bell, 
  UserX, Scale, Clock, CheckCircle2, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { COMPANY_INFO } from "@/config/legalContent";

const responseSteps = [
  {
    step: 1,
    title: "Detection & Containment",
    description: "Upon detecting a potential security incident, ZIVO will immediately work to contain the threat and prevent further unauthorized access.",
  },
  {
    step: 2,
    title: "Investigation",
    description: "Our security team will investigate the scope and nature of the incident, including what data may have been affected and how the incident occurred.",
  },
  {
    step: 3,
    title: "Notification",
    description: "If required by law or if we determine users may be at risk, we will notify affected users and relevant authorities within the legally required timeframe.",
  },
  {
    step: 4,
    title: "Remediation",
    description: "We will take steps to address the vulnerability that led to the incident and implement measures to prevent similar incidents in the future.",
  },
  {
    step: 5,
    title: "Documentation",
    description: "All incidents are documented for regulatory compliance and to improve our security practices over time.",
  },
];

const protectiveActions = [
  {
    icon: Lock,
    title: "Forced Password Resets",
    description: "ZIVO may require affected users to reset their passwords to prevent unauthorized account access.",
  },
  {
    icon: UserX,
    title: "Account Suspension",
    description: "We may temporarily suspend accounts that we believe have been compromised, to protect users while we investigate.",
  },
  {
    icon: Bell,
    title: "User Notifications",
    description: "We will notify users of incidents that may affect them, providing guidance on protective steps they should take.",
  },
  {
    icon: Shield,
    title: "Enhanced Monitoring",
    description: "Following an incident, we may implement additional monitoring to detect and prevent related threats.",
  },
];

export default function SecurityIncident() {
  return (
    <>
      <SEOHead
        title="Security Incident Response Policy | ZIVO Legal"
        description="Learn how ZIVO responds to security incidents, protects user data, and notifies affected parties."
      />
      <Header />

      <main className="min-h-screen pt-20 pb-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Link */}
          <div className="mb-6">
            <Link to="/legal/terms" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Terms
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Security Incident Response Policy</h1>
                <p className="text-muted-foreground">
                  Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                ZIVO takes the security of our users' data seriously. This policy outlines how we respond to security incidents, 
                including data breaches, unauthorized access, and other security events. Our goal is to minimize impact to users 
                and maintain transparency about our security practices.
              </p>
            </CardContent>
          </Card>

          {/* Investigation Commitment */}
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Our Commitment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                ZIVO will investigate all suspected security incidents promptly and thoroughly. We maintain:
              </p>
              <ul className="space-y-2">
                {[
                  "24/7 security monitoring capabilities",
                  "Documented incident response procedures",
                  "Trained security response team",
                  "Coordinate with payment providers and partners",
                  "Relationships with law enforcement and security researchers",
                  "Report incidents to authorities when applicable",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Response Steps */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Incident Response Process</h2>
            <div className="space-y-4">
              {responseSteps.map((item) => (
                <div key={item.step} className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* User Notifications */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                User Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                When required by applicable law, or when we determine that users may be at risk, we will notify affected users of security incidents. Notifications may include:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Description of the incident and data affected</li>
                <li>Steps we've taken to address the incident</li>
                <li>Recommended protective actions for users</li>
                <li>Contact information for questions</li>
              </ul>
              <p className="text-sm">
                We aim to notify affected users within 72 hours of confirming a breach that poses risk to their data, 
                as required by GDPR and other applicable regulations.
              </p>
            </CardContent>
          </Card>

          {/* Protective Actions */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Protective Actions We May Take</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {protectiveActions.map((action) => (
                <Card key={action.title}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <action.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{action.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Liability Notice */}
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Legal Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                While ZIVO implements industry-standard security measures and responds promptly to incidents, 
                this policy does not constitute an admission of liability for any security incident.
              </p>
              <p>
                ZIVO's liability for security incidents is limited as set forth in our Terms of Service. 
                We encourage users to take their own security precautions, including using strong passwords, 
                enabling two-factor authentication, and monitoring their accounts for suspicious activity.
              </p>
            </CardContent>
          </Card>

          {/* User Responsibilities */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Role in Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>Users can help protect their accounts by:</p>
              <ul className="space-y-2">
                {[
                  "Using strong, unique passwords for your ZIVO account",
                  "Enabling two-factor authentication",
                  "Not sharing your login credentials with others",
                  "Reporting suspicious activity immediately",
                  "Keeping your contact information up to date so we can reach you",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Report a Security Concern</h3>
              <p className="text-muted-foreground mb-6">
                If you believe you've discovered a security vulnerability or your account has been compromised, contact us immediately:
              </p>
              <a 
                href="mailto:security@hizivo.com"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Mail className="w-5 h-5" />
                security@hizivo.com
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}
