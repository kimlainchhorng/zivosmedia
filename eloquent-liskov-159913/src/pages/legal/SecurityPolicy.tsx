import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function SecurityPolicy() {
  return (
    <>
      <Helmet>
        <title>Security Policy | ZIVO</title>
        <meta name="description" content="ZIVO's security policy — how we protect your data, accounts, and transactions in 2026." />
        <link rel="canonical" href="https://hizivo.com/legal/security" />
      </Helmet>
      <main className="container mx-auto max-w-3xl py-10 px-4 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Security Policy
          </h1>
          <p className="text-muted-foreground">Last updated: 2026</p>
        </header>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Our commitments</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>ZIVO operates a defense-in-depth security program covering identity, data, payments, and infrastructure.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Encryption:</strong> TLS 1.2+ in transit, AES-256 at rest for sensitive data.</li>
              <li><strong>Authentication:</strong> OAuth 2.0, OTP, optional MFA, session fingerprinting.</li>
              <li><strong>Authorization:</strong> Row-Level Security on every user-scoped table.</li>
              <li><strong>Audit:</strong> Append-only logs on admin actions, payments, and role changes.</li>
              <li><strong>Backups:</strong> Hourly DB snapshots, 30-day retention, tested quarterly.</li>
              <li><strong>Vendors:</strong> Stripe, Supabase, Twilio, Duffel — all SOC 2 / PCI-DSS certified.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Threat model</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>We actively defend against: phishing, credential stuffing, payment fraud, GPS spoofing, account takeover, link-based attacks (punycode/IDN homographs), and clickjacking.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>GDPR (EU), CCPA/CPRA (California), PIPEDA (Canada), and applicable laws in KSA, UAE, and Cambodia. EU AI Act-aligned for our recommendation systems.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="text-sm">
            Report security issues to <a className="text-primary underline" href="mailto:security@hizivo.com">security@hizivo.com</a>. See our <Link className="text-primary underline" to="/legal/vdp">Vulnerability Disclosure Program</Link>.
          </CardContent>
        </Card>
      </main>
    </>
  );
}