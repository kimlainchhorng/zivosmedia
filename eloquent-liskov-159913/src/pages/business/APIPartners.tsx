/**
 * APIPartners - Partner API & White-label Solutions Page
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Code2,
  Zap,
  Shield,
  Globe2,
  ArrowRight,
  Check,
  Clock,
  Users,
  DollarSign,
  Building2,
  Plane,
  Building,
  Car,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const apiFeatures = [
  {
    icon: Plane,
    title: "Flight Search API",
    description: "Access real-time flight inventory from 500+ airlines worldwide",
    status: "coming_soon",
  },
  {
    icon: Building,
    title: "Hotel Booking API",
    description: "Search and book from 1M+ hotel properties globally",
    status: "coming_soon",
  },
  {
    icon: Car,
    title: "Car Rental API",
    description: "Connect to major car rental providers in 150+ countries",
    status: "coming_soon",
  },
  {
    icon: Building2,
    title: "White-label Solution",
    description: "Fully branded booking experience for your platform",
    status: "coming_soon",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Fast Integration",
    description: "RESTful APIs with comprehensive documentation. Get started in hours, not weeks.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant, encrypted data transfer, and secure authentication.",
  },
  {
    icon: Globe2,
    title: "Global Coverage",
    description: "Access inventory from partners worldwide with multi-currency support.",
  },
  {
    icon: DollarSign,
    title: "Competitive Margins",
    description: "Flexible commission structures designed for partner success.",
  },
];

const useCases = [
  {
    title: "Travel Agencies",
    description: "Expand your offering with access to global inventory",
    icon: Users,
  },
  {
    title: "Corporate Platforms",
    description: "Integrate travel booking into your business tools",
    icon: Building2,
  },
  {
    title: "Fintech Apps",
    description: "Add travel rewards and booking to your financial products",
    icon: DollarSign,
  },
];

export default function APIPartners() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "api_waitlist",
        subject: "API Partner Waitlist",
        message: `Email: ${email}\nCompany: ${company}`,
      });
      if (error) throw error;
      toast({ title: "You're on the list!", description: "We'll notify you when our API becomes available." });
      setEmail("");
      setCompany("");
    } catch {
      toast({ title: "Failed to join waitlist", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>API & White-label Solutions | ZIVO Developer Platform</title>
        <meta
          name="description"
          content="Integrate ZIVO's travel booking capabilities into your platform. Flight, hotel, and car rental APIs with white-label options."
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-foreground text-foreground dark:bg-secondary dark:text-foreground">
                <Sparkles className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Build with ZIVO's
                <span className="bg-gradient-to-r from-primary bg-clip-text text-transparent">
                  {" "}Travel APIs
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8">
                Access our global travel inventory through powerful APIs. White-label solutions
                available for seamless brand integration.
              </p>

              {/* Waitlist Form */}
              <form
                onSubmit={handleWaitlistSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <Input
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-3">
                Be first to know when we launch
              </p>
            </div>
          </div>
        </section>

        {/* API Features */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">API Products</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive travel APIs designed for developers
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {apiFeatures.map((feature) => (
                <Card key={feature.title} className="relative">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Coming Soon
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Code Preview */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4">Developer Experience</Badge>
                <h2 className="text-3xl font-bold mb-4">
                  Built for Developers
                </h2>
                <p className="text-muted-foreground mb-6">
                  RESTful APIs with comprehensive documentation, SDKs for popular
                  languages, and sandbox environments for testing.
                </p>
                <ul className="space-y-3">
                  {[
                    "OpenAPI 3.0 specification",
                    "SDKs for JavaScript, Python, Ruby, Go",
                    "Webhook support for real-time updates",
                    "Rate limiting and usage analytics",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted rounded-xl p-6 font-mono text-sm overflow-x-auto border border-border">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-emerald-500">
{`// Search flights
const response = await zivo.flights.search({
  origin: "JFK",
  destination: "LAX",
  departureDate: "2024-03-15",
  passengers: { adults: 2 },
  cabinClass: "economy"
});

// Returns
{
  "offers": [
    {
      "id": "off_abc123",
      "total_amount": "299.00",
      "total_currency": "USD",
      "slices": [...],
      "passengers": [...]
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Partner with ZIVO</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Built for Your Industry</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {useCases.map((useCase) => (
                <Card key={useCase.title}>
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <useCase.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                    <CardDescription>{useCase.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join our waitlist to be notified when our API platform launches. Early
              partners get priority access and special pricing.
            </p>
            <form
              onSubmit={handleWaitlistSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
            >
              <Input
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                type="text"
                placeholder="Company name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                Join Waitlist
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-6">
              Questions? Contact us at{" "}
              <a href="mailto:partners@hizivo.com" className="text-primary hover:underline">
                partners@hizivo.com
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
