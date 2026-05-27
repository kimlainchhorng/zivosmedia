/**
 * Security Vulnerability Report Page
 * Responsible disclosure program for security researchers
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Shield, Bug, Mail, CheckCircle2, 
  AlertTriangle, Clock, Gift, FileText, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const inScopeItems = [
  "Authentication and session management",
  "Authorization and access control",
  "Data exposure vulnerabilities",
  "Injection flaws (SQL, XSS, etc.)",
  "Business logic vulnerabilities",
  "API security issues",
  "Cryptographic weaknesses",
];

const outOfScopeItems = [
  "Social engineering attacks",
  "Physical security issues",
  "Denial of service attacks",
  "Spam or phishing attempts",
  "Issues in third-party services",
  "Vulnerabilities requiring physical access",
];

const guidelines = [
  "Do not access, modify, or delete user data",
  "Do not perform actions that could harm users",
  "Avoid automated scanning that degrades service",
  "Report vulnerabilities promptly after discovery",
  "Give us reasonable time to fix before disclosure",
  "Do not publicly disclose without our approval",
];

export default function SecurityReport() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    severity: "",
    title: "",
    description: "",
    steps: "",
    impact: "",
    agreeToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreeToTerms) {
      toast.error("Please agree to the responsible disclosure terms");
      return;
    }

    setIsSubmitting(true);
    try {
      const message = `Severity: ${form.severity}\nTitle: ${form.title}\nDescription: ${form.description}\nSteps: ${form.steps}\nImpact: ${form.impact}\nReporter: ${form.name} <${form.email}>`;
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "security_report",
        subject: form.title || "Security Vulnerability Report",
        message,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Report submitted successfully");
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEOHead
          title="Report Submitted | ZIVO Security"
          description="Thank you for reporting a security vulnerability to ZIVO."
          noIndex
        />
        <Header />
        <main className="min-h-screen pt-20 pb-16 bg-background">
          <div className="container mx-auto px-4 max-w-2xl text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Report Received</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Thank you for helping keep ZIVO secure. Our security team will review your report 
              and respond within 48 hours.
            </p>
            <div className="p-4 rounded-lg bg-muted/50 border border-border text-left mb-8 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>You'll receive a confirmation email</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Our team will triage and investigate the report</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>We'll keep you updated on our progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Valid reports may be eligible for recognition</span>
                </li>
              </ul>
            </div>
            <Button asChild>
              <Link to="/security">Back to Security</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Report a Vulnerability | ZIVO Security"
        description="Report security vulnerabilities to ZIVO responsibly. We work with security researchers to keep our platform safe."
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

          {/* Header */}
          <div className="text-center py-8 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bug className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Report a Vulnerability</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Help us keep ZIVO secure. We appreciate responsible disclosure and work closely 
              with security researchers.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Guidelines Sidebar */}
            <div className="space-y-6">
              {/* Our Commitment */}
              <Card className="hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Our Commitment
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• No legal action for good-faith research</p>
                  <p>• Prompt acknowledgment (within 48h)</p>
                  <p>• Regular updates on remediation</p>
                  <p>• Credit in our security hall of fame</p>
                </CardContent>
              </Card>

              {/* In Scope */}
              <Card className="hover:border-green-500/20 hover:shadow-sm transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                    In Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    {inScopeItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Out of Scope */}
              <Card className="hover:border-amber-500/20 hover:shadow-sm transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="w-4 h-4" />
                    Out of Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <ul className="space-y-1">
                    {outOfScopeItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Report Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Submit a Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Contact Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Severity */}
                    <div className="space-y-2">
                      <Label htmlFor="severity">Severity</Label>
                      <Select
                        value={form.severity}
                        onValueChange={(v) => setForm(f => ({ ...f, severity: v }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical - System compromise</SelectItem>
                          <SelectItem value="high">High - Significant data exposure</SelectItem>
                          <SelectItem value="medium">Medium - Limited impact</SelectItem>
                          <SelectItem value="low">Low - Minimal risk</SelectItem>
                          <SelectItem value="informational">Informational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Vulnerability Title</Label>
                      <Input
                        id="title"
                        placeholder="Brief description of the issue"
                        value={form.title}
                        onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Detailed description of the vulnerability"
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Steps to Reproduce */}
                    <div className="space-y-2">
                      <Label htmlFor="steps">Steps to Reproduce</Label>
                      <Textarea
                        id="steps"
                        placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                        rows={4}
                        value={form.steps}
                        onChange={(e) => setForm(f => ({ ...f, steps: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Impact */}
                    <div className="space-y-2">
                      <Label htmlFor="impact">Potential Impact</Label>
                      <Textarea
                        id="impact"
                        placeholder="What could an attacker do with this vulnerability?"
                        rows={3}
                        value={form.impact}
                        onChange={(e) => setForm(f => ({ ...f, impact: e.target.value }))}
                      />
                    </div>

                    {/* Terms Agreement */}
                    <div className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/20 transition-all duration-200">
                      <h4 className="font-medium mb-3">Responsible Disclosure Guidelines</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                        {guidelines.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={form.agreeToTerms}
                          onCheckedChange={(checked) => 
                            setForm(f => ({ ...f, agreeToTerms: checked as boolean }))
                          }
                        />
                        <Label htmlFor="terms" className="text-sm cursor-pointer">
                          I agree to follow the responsible disclosure guidelines and understand 
                          that this report will be handled confidentially.
                        </Label>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Alternative Contact */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  Prefer email? Send reports directly to{" "}
                  <a href="mailto:security@hizivo.com" className="text-primary hover:underline">
                    security@hizivo.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
