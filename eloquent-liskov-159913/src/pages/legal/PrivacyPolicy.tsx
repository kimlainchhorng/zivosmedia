import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Users, Cookie, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const PrivacyPolicy = () => {
  const lastUpdated = "March 13, 2026";
  const companyName = "ZIVO LLC";

  return (
    <div className="min-h-screen bg-background">
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
                <li>Marketing partners (with your consent)</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.3 For Legal Reasons</h4>
              <p>We may disclose information to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Comply with applicable laws, regulations, or legal processes</li>
                <li>Respond to lawful requests from law enforcement</li>
                <li>Protect our rights, property, or safety</li>
                <li>Investigate fraud, security issues, or terms violations</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">3.4 Business Transfers</h4>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred 
                to the acquiring entity. We will notify you of any such transfer and any choices you may have.
              </p>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-semibold text-foreground">We Do NOT Sell Your Personal Data</p>
                <p className="text-sm mt-2">
                  ZIVO does not sell, rent, or trade your personal information to third parties for their 
                  marketing purposes. We share data only as described in this policy.
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
              </div>

              <p className="text-sm mt-4">
                ZIVO does not use advertising or tracking cookies. We do not track users across apps or websites.
              </p>

              <h4 className="font-semibold text-foreground mt-6">Managing Cookies</h4>
              <p>
                You can control cookies through your browser settings or our cookie preference controls. 
                Note that disabling essential cookies may affect functionality.
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
                <li>Right to opt-out of sale of personal information (we don't sell data)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>

              <h4 className="font-semibold text-foreground mt-6">Exercising Your Rights</h4>
              <p>
                To exercise your rights, contact us at privacy@hizivo.com or use the privacy settings in your 
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
                ZIVO services are not intended for children under 18 years of age. We do not knowingly collect 
                personal information from children under 18.
              </p>
              <p className="mt-4">
                If we learn that we have collected information from a child under 18, we will delete it promptly. 
                If you believe we have collected information from a child, please contact us at privacy@zivo.com.
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
              <p><strong>Email:</strong> privacy@zivo.com</p>
              <p><strong>Data Protection Officer:</strong> dpo@zivo.com</p>
              <p><strong>Address:</strong> {companyName}, 123 Innovation Drive, Wilmington, DE 19801, USA</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/terms-of-service">
                <Button variant="outline" size="sm">Terms of Service</Button>
              </Link>
              <Link to="/refund-policy">
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
