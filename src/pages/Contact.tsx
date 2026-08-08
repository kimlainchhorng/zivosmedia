/**
 * Public contact page.
 *
 * Deliberately unauthenticated. The existing support surfaces -- /support and
 * the ticket pages -- sit behind ProtectedRoute, so anyone who is not a
 * logged-in customer (a payment-processor reviewer, a regulator, a customer who
 * cannot get into their account, a card issuer chasing a dispute) hits a login
 * wall when they try to reach us. "The merchant could not be contacted" is a
 * finding against the account, so this page must never require a session.
 *
 * Everything here renders from COMPANY_INFO, so it cannot drift from the Terms,
 * the footer, or the structured data.
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Mail, LifeBuoy, Scale, CreditCard, Building2 } from "lucide-react";

import BusinessIdentity from "@/components/legal/BusinessIdentity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPANY_INFO } from "@/config/legalContent";

const CONTACT_ROUTES = [
  {
    icon: LifeBuoy,
    title: "Customer support",
    description:
      "Bookings, rides, orders, deliveries, and anything that went wrong with a service you used.",
    email: COMPANY_INFO.supportEmail,
  },
  {
    icon: CreditCard,
    title: "Billing and refunds",
    description:
      "Charges you do not recognise, refund status, and payment or payout questions.",
    email: COMPANY_INFO.billingEmail,
  },
  {
    icon: Scale,
    title: "Legal and privacy",
    description:
      "Terms, privacy requests, data deletion, arbitration opt-out, and formal notices.",
    email: COMPANY_INFO.legalEmail,
  },
] as const;

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 safe-area-top z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-bold text-xl">Contact ZIVO</h1>
              <p className="text-sm text-muted-foreground">{COMPANY_INFO.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-muted-foreground mb-8">
          You can reach us without signing in. We answer during {COMPANY_INFO.supportHours}.
        </p>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {CONTACT_ROUTES.map((route) => (
            <Card key={route.email}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <route.icon className="h-5 w-5 text-primary" />
                  {route.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{route.description}</p>
                <a
                  href={`mailto:${route.email}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline break-all"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {route.email}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Business details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessIdentity />
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mt-8">
          Before disputing a charge with your bank, please contact us first — most billing issues are
          resolved faster directly. See our{" "}
          <Link to="/legal/refunds" className="text-primary hover:underline">
            Refund Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
