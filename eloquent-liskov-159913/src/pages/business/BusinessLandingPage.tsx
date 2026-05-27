/**
 * ZIVO FOR BUSINESS - B2B Landing Page
 * /business
 * 
 * Enterprise travel booking platform with team management,
 * centralized billing, and transparent partner pricing.
 */

import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Plane,
  Hotel,
  Car,
  FileText,
  DollarSign,
  TrendingUp,
  Shield,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Calendar,
  Receipt,
  Clock,
  Globe,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  BUSINESS_FEATURES,
  HIGH_VALUE_ROUTES,
  B2B_REVENUE_ADVANTAGES,
  CORPORATE_COMPLIANCE,
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
} from "@/config/b2bTravelConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  Users,
  LayoutDashboard: BarChart3,
  History: Clock,
  PieChart: BarChart3,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Shield,
};

export default function BusinessLandingPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    companySize: "",
    industry: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const message = `Company: ${formData.companyName}\nContact: ${formData.contactName}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nSize: ${formData.companySize}\nIndustry: ${formData.industry}\nMessage: ${formData.message}`;
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "business_inquiry",
        subject: `Business Inquiry - ${formData.companyName}`,
        message,
      });
      if (error) throw error;
      toast.success("Thank you! Our business team will contact you within 24 hours.");
      setFormData({ companyName: "", contactName: "", email: "", phone: "", companySize: "", industry: "", message: "" });
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>ZIVO for Business | Corporate Travel Management</title>
        <meta
          name="description"
          content="Manage flights, hotels, and car rentals for your team with transparent pricing and trusted partners. Request a business account today."
        />
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-16">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
                  <Briefcase className="w-3 h-3 mr-1" />
                  Enterprise Travel
                </Badge>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 leading-tight">
                  ZIVO for{" "}
                  <span className="text-primary">Business Travel</span>
                </h1>

                <p className="text-lg text-muted-foreground mb-8 max-w-xl">
                  Manage flights, hotels, and car rentals for your team with transparent 
                  pricing and trusted partners. Simplify corporate travel booking.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => document.getElementById("request-form")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Request Business Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2" asChild>
                    <Link to="/business/dashboard">
                      View Demo Dashboard
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Trusted Partners
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    No Hidden Fees
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    24/7 Support
                  </div>
                </div>
              </div>

              {/* Visual element */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <Card className="border-primary/20 shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <Plane className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold">Flight Booking</p>
                              <p className="text-xs text-muted-foreground">300+ airlines</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-amber-500/20 shadow-lg ml-8">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                              <Hotel className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="font-semibold">Hotels</p>
                              <p className="text-xs text-muted-foreground">Corporate rates</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-4 mt-8">
                      <Card className="border-border shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <Car className="w-5 h-5 text-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold">Car Rentals</p>
                              <p className="text-xs text-muted-foreground">All major providers</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-emerald-500/20 shadow-lg ml-4">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <BarChart3 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-semibold">Analytics</p>
                              <p className="text-xs text-muted-foreground">Track spending</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Account Features */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-3xl font-bold mb-4">
                Everything Your Business Needs
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful tools to manage your corporate travel program efficiently
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {BUSINESS_FEATURES.map((feature) => {
                const Icon = ICON_MAP[feature.icon] || Building2;
                return (
                  <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
              {/* Invoice feature */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                    <Receipt className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Invoices & Receipts</h3>
                  <p className="text-sm text-muted-foreground">
                    Downloadable invoices and receipts for easy expense reporting
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {CORPORATE_COMPLIANCE.invoiceDisclaimer}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Team Travel Management */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4">Team Management</Badge>
                <h2 className="text-3xl font-bold mb-6">
                  Manage Your Team's Travel
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Admin Adds Team Members</h4>
                      <p className="text-sm text-muted-foreground">
                        Easily add travelers with their profiles, preferences, and travel documents
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Plane className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Travelers Book Using Company Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Team members book travel with company payment and policy compliance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Admin Views Trips and Invoices</h4>
                      <p className="text-sm text-muted-foreground">
                        Complete visibility into all company travel and financial documents
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="relative">
                <Card className="shadow-2xl border-primary/10">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Acme Corp Dashboard</span>
                      </div>
                      <Badge>Business</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">24</p>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-sm text-muted-foreground">Bookings</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">$45K</p>
                        <p className="text-sm text-muted-foreground">This Month</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-emerald-500">18%</p>
                        <p className="text-sm text-muted-foreground">Savings</p>
                      </div>
                    </div>
                    <Button className="w-full" asChild>
                      <Link to="/business/dashboard">
                        View Full Dashboard
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Business Routes */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Popular Routes</Badge>
              <h2 className="text-3xl font-bold mb-4">
                Top Business Travel Routes
              </h2>
              <p className="text-muted-foreground">
                Frequently booked routes by our corporate clients
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {HIGH_VALUE_ROUTES.slice(0, 10).map((route) => (
                <Link
                  key={`${route.origin}-${route.destination}`}
                  to={`/flights?origin=${route.origin}&destination=${route.destination}`}
                  className="group"
                >
                  <Card className="hover:border-primary/50 hover:shadow-md transition-all group-hover:bg-primary/5">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="font-bold text-lg">{route.origin}</span>
                        <Plane className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform" />
                        <span className="font-bold text-lg">{route.destination}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {route.category === "domestic" ? "Domestic" : "International"}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* B2B Revenue Advantages */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Why Business Travel</Badge>
              <h2 className="text-3xl font-bold mb-4">
                The Business Advantage
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Corporate accounts provide consistent, high-value bookings
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {B2B_REVENUE_ADVANTAGES.map((advantage) => {
                const Icon = ICON_MAP[advantage.icon] || TrendingUp;
                return (
                  <Card key={advantage.title} className="text-center">
                    <CardContent className="p-6">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-3xl font-bold text-primary mb-1">{advantage.stat}</p>
                      <p className="text-sm text-muted-foreground mb-3">{advantage.statLabel}</p>
                      <h3 className="font-semibold mb-2">{advantage.title}</h3>
                      <p className="text-sm text-muted-foreground">{advantage.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Request Business Account Form */}
        <section id="request-form" className="py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <Badge className="mb-4 bg-primary/10 text-primary">Get Started</Badge>
                <h2 className="text-3xl font-bold mb-4">
                  Request a Business Account
                </h2>
                <p className="text-muted-foreground">
                  Fill out the form below and our team will reach out within 24 hours
                </p>
              </div>

              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input
                          id="companyName"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Acme Inc."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactName">Contact Name *</Label>
                        <Input
                          id="contactName"
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          placeholder="John Smith"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Work Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@acme.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companySize">Company Size *</Label>
                        <Select
                          value={formData.companySize}
                          onValueChange={(v) => setFormData({ ...formData, companySize: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPANY_SIZE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                          value={formData.industry}
                          onValueChange={(v) => setFormData({ ...formData, industry: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRY_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="message">Tell us about your travel needs</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Monthly travel volume, current challenges, special requirements..."
                        rows={4}
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Request Business Account"}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      By submitting, you agree to our{" "}
                      <Link to="/terms" className="underline">Terms</Link> and{" "}
                      <Link to="/privacy" className="underline">Privacy Policy</Link>.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Compliance Disclaimer */}
        <section className="py-8 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground text-center">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <p>{CORPORATE_COMPLIANCE.mainDisclaimer}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
