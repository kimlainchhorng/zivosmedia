import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Users, Cookie, Bell, Trash2, Brain } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { isAutoRepairSoftwareHost, ZIVO_MEDIA_ORIGIN, ZIVO_SOFTWARE_ORIGIN } from "@/config/autoRepairDomain";

const LEGAL_PRIVACY_PATH = "/legal/privacy";

function ZivoSoftwarePrivacyMark() {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#101412] shadow-[0_16px_34px_rgba(17,20,18,0.2)]">
      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-md bg-[#48e7af]" />
      <span className="absolute bottom-2 left-2 h-2 w-2 rounded-sm bg-[#35a8ff]/80" />
      <svg viewBox="0 0 44 44" aria-hidden="true" className="relative h-8 w-8">
        <defs>
          <linearGradient id="zivoSoftwarePrivacyMark" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#48e7af" />
            <stop offset="1" stopColor="#35a8ff" />
          </linearGradient>
        </defs>
        <path d="M10 8h26v7.2H22.4L36 15.3 16.1 36H8l20-20.8H10V8Z" fill="url(#zivoSoftwarePrivacyMark)" />
        <path d="M13.2 28.8h20.9V36H6.8l6.4-7.2Z" fill="#f8fffc" />
      </svg>
    </span>
  );
}

function ZivoSoftwarePrivacy() {
  const lastUpdated = "June 4, 2026";
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      copy: "ZIVO Software may process account details, business profile information, employee/team access records, customer records, vehicle or service details, appointments, bookings, invoices, payments, expenses, inventory, reports, and support communications.",
    },
    {
      icon: Eye,
      title: "How We Use Information",
      copy: "We use information to provide dashboards, setup flows, bookings, work orders, invoices, customer history, team permissions, reporting, authentication, fraud prevention, support, and service reliability.",
    },
    {
      icon: Users,
      title: "Business-Controlled Data",
      copy: "A business owner or authorized workspace administrator controls much of the customer, employee, and operational data entered into a workspace. Customers and staff should contact the business directly for many record changes unless ZIVO is required to assist.",
    },
    {
      icon: Lock,
      title: "Security",
      copy: "We use authentication, role-based access, platform monitoring, and infrastructure safeguards to help protect software accounts and business records. No system is perfect, so workspace owners must also manage passwords, team roles, and device access responsibly.",
    },
    {
      icon: Globe,
      title: "Service Providers",
      copy: "We may use infrastructure, authentication, analytics, storage, payment, email, and support providers to operate ZIVO Software. We do not sell business customer records for third-party marketing.",
    },
    {
      icon: Trash2,
      title: "Retention and Requests",
      copy: "We keep information for as long as needed to provide the software, comply with law, prevent abuse, resolve disputes, and maintain business records. Account owners may request access, correction, export, or deletion where applicable.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#101412]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f8f6]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/business" className="flex items-center gap-3">
            <ZivoSoftwarePrivacyMark />
            <span>
              <span className="block text-base font-black uppercase tracking-[0.2em]">ZIVO</span>
              <span className="block text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#138f68]">Software</span>
            </span>
          </Link>
          <Button asChild variant="outline" className="rounded-lg border-black/15 bg-white text-[#101412]">
            <Link to="/business">Back to software</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#138f68]">Privacy</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal sm:text-5xl">ZIVO Software Privacy Policy</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f6b65]">
              This policy explains how ZIVO LLC handles information for ZIVO Software business workspaces on zivosoftware.com.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#5f6b65]">Last updated: {lastUpdated}</p>
          </div>
          <div className="rounded-[1.2rem] border border-black/10 bg-[#101412] p-6 text-white shadow-[0_24px_70px_rgba(17,20,18,0.18)]">
            <Shield className="h-8 w-8 text-[#48e7af]" />
            <h2 className="mt-6 text-2xl font-black">Business data, handled for operations</h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              ZIVO Software focuses on the records operators need to run daily work: team access, customers, service activity, revenue, and reports.
            </p>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap gap-2">
          <Badge variant="outline" className="border-[#138f68] text-[#138f68]">Business workspaces</Badge>
          <Badge variant="outline" className="border-[#138f68] text-[#138f68]">Role-based access</Badge>
          <Badge variant="outline" className="border-[#138f68] text-[#138f68]">No sale of customer records</Badge>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#101412] text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-xl font-black">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5f6b65]">{item.copy}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Your Choices</h2>
          <p className="mt-3 text-sm leading-7 text-[#5f6b65]">
            You can sign out, update account information, manage team access, and contact support for privacy requests. Business workspace owners are responsible for responding to many customer and employee requests tied to their own records.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-lg bg-[#101412] text-white hover:bg-black">
              <Link to="/login?redirect=%2Fbusiness">Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-lg border-black/15 bg-white">
              <Link to="/legal/terms">Terms of Service</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

const PrivacyPolicy = () => {
  const lastUpdated = "July 26, 2026";
  const companyName = "ZIVO LLC";
  const isZivoSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const canonicalOrigin = isZivoSoftwareDomain ? ZIVO_SOFTWARE_ORIGIN : ZIVO_MEDIA_ORIGIN;
  const canonicalUrl = canonicalOrigin + LEGAL_PRIVACY_PATH;

  if (isZivoSoftwareDomain) {
    return (
      <>
        <SEOHead
          title="Privacy Policy – ZIVO Software"
          description="Privacy terms for ZIVO Software business workspaces and operations tools."
          canonical={canonicalUrl}
        />
        <ZivoSoftwarePrivacy />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy – ZIVO"
        description="Read ZIVO's privacy policy. Learn how we collect, use, and protect your personal data across our travel, social, and business services."
        canonical={canonicalUrl}
      />
      {/* Header */}
      <header className="sticky top-0 safe-area-top z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-rides flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Compliance Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline" className="border-primary text-primary">CCPA Compliant</Badge>
          <Badge variant="outline" className="border-primary text-primary">Privacy by Design</Badge>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              At ZIVO, we take your privacy seriously. This Privacy Policy explains how {companyName} ("ZIVO," "we," "us," or "our")
              collects, uses, shares, and protects your personal information when you use our ride-hailing, food delivery,
              car rental, flight booking, and hotel reservation services.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This policy applies to all ZIVO services, including our mobile applications, websites, and any other platforms
              where we collect personal information.
            </p>
          </CardContent>
        </Card>

        {/* Quick Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Database, label: "Data We Collect", count: "7 types" },
            { icon: Lock, label: "Security Measures", count: "Enterprise-grade" },
            { icon: Globe, label: "Data Regions", count: "EU, US, APAC" },
            { icon: Trash2, label: "Data Deletion", count: "Within 30 days" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <item.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Privacy Sections */}
        <Accordion type="single" collapsible className="space-y-4">
          {/* Data Minimization - NEW */}
          <AccordionItem value="data-minimization" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-semibold">Data Minimization</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                ZIVO collects only the information necessary to provide travel services and comply with legal obligations.
              </p>
              <p>
                We do not collect excessive data or information unrelated to providing our services. Our data collection practices
                are regularly reviewed to ensure we maintain the minimum data footprint necessary for operations.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Third-Party Data Sharing - NEW */}
          <AccordionItem value="third-party-sharing" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-amber-500" />
                </div>
                <span className="font-semibold">Third-Party Data Sharing</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                User data is shared only with licensed travel providers strictly for booking fulfillment.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hotels receive your reservation details to confirm your booking</li>
                <li>Airlines receive passenger information required for ticketing</li>
                <li>Car rental companies receive driver information for rental fulfillment</li>
                <li>Payment processors (Stripe) receive payment data for transaction processing</li>
              </ul>
              <p className="font-medium text-foreground">
                We do not sell, rent, or trade your personal information to third parties for their marketing purposes.
              </p>
            </AccordionContent>
          </AccordionItem>
          {/* Section 1: Information We Collect */}
          <AccordionItem value="collection" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Information We Collect</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">1.1 Information You Provide</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, phone number, password, profile photo</li>
                <li><strong>Payment Information:</strong> Credit/debit card numbers, billing address, payment history</li>
                <li><strong>Identity Verification:</strong> Driver's license, passport, government ID (for drivers/car rentals)</li>
                <li><strong>Communication:</strong> Messages with drivers, support tickets, feedback and reviews</li>
                <li><strong>Preferences:</strong> Saved addresses, dietary preferences, accessibility needs</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">1.2 Information Collected Automatically</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Location Data:</strong> Precise GPS location during trips/deliveries; approximate location for nearby services</li>
                <li><strong>Device Information:</strong> Device type, operating system, unique device identifiers, IP address</li>
                <li><strong>Usage Data:</strong> App features used, pages viewed, search queries, booking history</li>
                <li><strong>Trip Data:</strong> Pickup/drop-off locations, routes, duration, fare information</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">1.3 Information from Third Parties</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Social Login:</strong> If you sign in via Google, Facebook, or Apple, we receive profile information</li>
                <li><strong>Background Checks:</strong> For drivers, we receive verification results from screening partners</li>
                <li><strong>Partners:</strong> Restaurants, hotels, and airlines may share booking and service information</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">1.4 Service-Specific Data</h4>
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="p-3 bg-rides/10 rounded-lg">
                  <p className="font-medium text-rides">Rides</p>
                  <p className="text-sm">Trip routes, driver preferences, safety incident reports</p>
                </div>
                <div className="p-3 bg-eats/10 rounded-lg">
                  <p className="font-medium text-eats">Eats</p>
                  <p className="text-sm">Order history, dietary restrictions, favorite restaurants</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="font-medium text-primary">Car Rental</p>
                  <p className="text-sm">License details, rental history, damage reports</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="font-medium text-foreground">Flights & Hotels</p>
                  <p className="text-sm">Passport details, travel history, loyalty programs</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: How We Use Information */}
          <AccordionItem value="usage" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">How We Use Your Information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">2.1 Providing Services</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Connect you with drivers, restaurants, hotels, and other service providers</li>
                <li>Process bookings, payments, and refunds</li>
                <li>Enable real-time tracking of rides and deliveries</li>
                <li>Send booking confirmations and trip receipts</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.2 Safety & Security</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Verify user identities and prevent fraud</li>
                <li>Monitor for suspicious activity and security threats</li>
                <li>Enable safety features like trip sharing and emergency assistance</li>
                <li>Investigate incidents and resolve disputes</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.3 Improving Services</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Analyze usage patterns to improve features</li>
                <li>Develop new products and services</li>
                <li>Train machine learning models (using anonymized data)</li>
                <li>Conduct research and surveys</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.4 Communications</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Send service updates and notifications</li>
                <li>Promotional offers (with your consent)</li>
                <li>Respond to customer support inquiries</li>
                <li>Important legal and safety notices</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">2.5 Legal Purposes</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Comply with legal obligations and court orders</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect the rights, property, and safety of ZIVO and users</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Information Sharing */}
          <AccordionItem value="sharing" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">How We Share Information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <h4 className="font-semibold text-foreground">3.1 With Service Providers</h4>
              <p>We share information with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Drivers:</strong> Your name, pickup/drop-off locations, phone number (masked)</li>
                <li><strong>Restaurants:</strong> Order details and delivery instructions</li>
                <li><strong>Hotels & Airlines:</strong> Booking and passenger information</li>
                <li><strong>Car Rental Owners:</strong> Rental details and driver's license information</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.2 With Business Partners</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Payment processors (Stripe, PayPal) for transaction processing</li>
                <li>Cloud service providers (AWS, Google Cloud) for data storage</li>
                <li>Analytics providers for usage analysis</li>
                <li>Advertising and marketing partners such as Meta, Google Ads, and TikTok (and X) only when you consent to marketing cookies or similar tracking</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.3 Mobile Information and SMS Choices</h4>
              <p>
                We use a mobile number to send a one-time verification code only when a user requests it. Verifying a phone number does
                not enroll a person in marketing or recurring SMS.
              </p>
              <p className="font-medium text-foreground">
                ZIVO does not share mobile phone numbers or SMS opt-in consent with third parties or affiliates for their own marketing
                or promotional purposes.
              </p>

              <h4 className="font-semibold text-foreground mt-6">3.4 For Legal Reasons</h4>
              <p>We may disclose information to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Comply with applicable laws, regulations, or legal processes</li>
                <li>Respond to lawful requests from law enforcement</li>
                <li>Protect our rights, property, or safety</li>
                <li>Investigate fraud, security issues, or terms violations</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.5 Business Transfers</h4>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred
                to the acquiring entity. We will notify you of any such transfer and any choices you may have.
              </p>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-semibold text-foreground">We Do NOT Sell Your Personal Data</p>
                <p className="text-sm mt-2">
                  ZIVO does not sell, rent, or trade your personal information to third parties for their
                  marketing purposes. We may share limited audience or conversion signals for targeted advertising
                  only with your consent and only as described in this policy, the Cookie Policy, and the Do Not Sell
                  or Share page.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Data Security */}
          <AccordionItem value="security" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Data Security</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                We implement industry-standard security measures to protect your personal information:
              </p>

              <h4 className="font-semibold text-foreground mt-4">Technical Safeguards</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Encryption:</strong> TLS 1.3 for data in transit; AES-256 for data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication for employees</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
                <li><strong>Tokenization:</strong> Payment card data is tokenized and stored by PCI-compliant processors</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Organizational Measures</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Regular security audits and penetration testing</li>
                <li>Employee security training and background checks</li>
                <li>Incident response procedures and data breach notification protocols</li>
                <li>Vendor security assessments</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Your Role</h4>
              <p>
                You can help protect your account by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication</li>
                <li>Logging out of shared devices</li>
                <li>Reporting suspicious activity immediately</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Cookies */}
          <AccordionItem value="cookies" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cookie className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Cookies & Tracking Technologies</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Keep you logged in and remember your preferences</li>
                <li>Understand how you use our services</li>
                <li>Personalize content and recommendations</li>
                <li>Measure optional advertising and marketing campaigns when you consent</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Types of Cookies</h4>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Essential Cookies</p>
                  <p className="text-sm">Required for basic functionality. Cannot be disabled.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Functional Cookies</p>
                  <p className="text-sm">Remember preferences and enhance features.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Analytics Cookies</p>
                  <p className="text-sm">Help us understand usage patterns. Can be disabled.</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">Marketing & Advertising Cookies</p>
                  <p className="text-sm">Consent-based Meta, Google Ads, TikTok, X, and campaign attribution pixels. Can be disabled.</p>
                </div>
              </div>

              <p className="text-sm mt-4">
                Marketing and advertising cookies are optional. You can reject them, withdraw consent, or use
                Do Not Sell or Share controls where applicable.
              </p>

              <h4 className="font-semibold text-foreground mt-6">Managing Cookies</h4>
              <p>
                You can control cookies through your browser settings or our cookie preference controls.
                Note that disabling essential cookies may affect functionality.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai-automated-decisions" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">AI & Automated Decisions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                We use AI, machine learning, and automated systems to rank feed, reels, and search results;
                personalize recommendations; detect fraud, spam, abuse, and security threats; moderate content;
                calculate pricing estimates; route support requests; measure ad relevance; and provide AI assistance.
              </p>
              <p>
                Our legal bases include contract, legitimate interests, consent where required, and legal obligation.
                We may use de-identified or aggregated data to improve AI systems where permitted and subject to
                your privacy choices.
              </p>
              <p>
                Significant decisions such as account suspension, payout holds, content removal, booking risk review,
                or payment risk review may include automated signals. You can request information about automated decisions affecting you and request human review or submit an appeal where available.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Your Rights */}
          <AccordionItem value="rights" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Your Privacy Rights</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                Depending on your location, you may have the following rights regarding your personal information:
              </p>

              <h4 className="font-semibold text-foreground mt-4">All Users May Request:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access to their data:</strong> Request a copy of your personal information</li>
                <li><strong>Data correction:</strong> Update inaccurate or incomplete information</li>
                <li><strong>Data deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                <li><strong>Opt-out of marketing:</strong> Unsubscribe from promotional communications</li>
                <li><strong>Data portability:</strong> Receive your data in a structured, machine-readable format</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">GDPR Rights (EU/EEA Users)</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Right to restrict processing</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
                <li>Right to lodge a complaint with a supervisory authority</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">CCPA Rights (California Residents)</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Right to know what personal information we collect and share</li>
                <li>Right to delete personal information</li>
                <li>Right to opt out of sale or sharing of personal information for targeted advertising</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Exercising Your Rights</h4>
              <p>
                To exercise your rights, contact us at privacy@zivosmedia.com or use the privacy settings in your
                account. We will respond within 30 days (or as required by law).
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: Data Retention */}
          <AccordionItem value="retention" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trash2 className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Data Retention</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>We retain your information for as long as necessary to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide our services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain business records</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Retention Periods</h4>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Active account data</span>
                  <span className="text-primary">While account is active</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Trip/booking history</span>
                  <span className="text-primary">7 years</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Payment records</span>
                  <span className="text-primary">7 years (legal requirement)</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Support tickets</span>
                  <span className="text-primary">3 years</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span>Location data</span>
                  <span className="text-primary">90 days (anonymized after)</span>
                </div>
              </div>

              <h4 className="font-semibold text-foreground mt-6">Account Deletion</h4>
              <p>
                When you delete your account, we will remove or anonymize your personal data within 30 days,
                except where retention is required by law or for legitimate business purposes.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 8: International Transfers */}
          <AccordionItem value="international" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">International Data Transfers</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                ZIVO operates globally, and your data may be transferred to and processed in countries other
                than your country of residence.
              </p>

              <h4 className="font-semibold text-foreground mt-4">Transfer Safeguards</h4>
              <p>When transferring data internationally, we use:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
                <li>Data Processing Agreements with all vendors</li>
                <li>Adequacy decisions where applicable</li>
                <li>Additional technical and organizational measures</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Data Centers</h4>
              <p>We store data in secure data centers located in:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>United States (primary)</li>
                <li>European Union (for EU users)</li>
                <li>Singapore (for APAC users)</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Section 9: Children */}
          <AccordionItem value="children" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Children's Privacy</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                ZIVO is not intended for children under 13 years of age, or under 16 where local law requires
                a higher digital consent age. Limited personal accounts may be available to teens where
                permitted by law, but travel booking, rides, delivery ordering, car rental, payments, gifts,
                subscriptions, live streaming, paid content, business tools, and payout features require users
                to be at least 18 or the age of legal majority.
              </p>
              <p className="mt-4">
                If we learn that we have collected information from a child under the permitted age, we will
                delete it promptly. If you believe we have collected information from a child, please contact
                us at privacy@zivosmedia.com.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Section 10: Updates */}
          <AccordionItem value="updates" className="border border-border rounded-lg px-4 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Policy Updates</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-4 pb-6">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Posting a notice on our website and app</li>
                <li>Sending you an email notification</li>
                <li>Displaying an in-app banner</li>
              </ul>
              <p className="mt-4">
                We encourage you to review this policy periodically. Continued use of our services after changes
                constitutes acceptance of the updated policy.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Contact Us</h3>
            <p className="text-muted-foreground mb-4">
              If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> privacy@zivosmedia.com</p>
              <p><strong>Support:</strong> support@zivosmedia.com</p>
              <p><strong>Data Protection Officer:</strong> dpo@zivosmedia.com</p>
              <p><strong>Address:</strong> {companyName}, 123 Innovation Drive, Wilmington, DE 19801, USA</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/legal/terms">
                <Button variant="outline" size="sm">Terms of Service</Button>
              </Link>
              <Link to="/legal/refunds">
                <Button variant="outline" size="sm">Refund Policy</Button>
              </Link>
              <Link to="/help">
                <Button variant="outline" size="sm">Help Center</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
