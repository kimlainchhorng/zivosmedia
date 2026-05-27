/**
 * CorporateTravel Page
 * Placeholder for B2B corporate travel offering
 */

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { 
  Building2, Users, FileText, CreditCard, 
  BarChart3, Clock, Shield, ArrowRight,
  CheckCircle, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  {
    icon: CreditCard,
    title: "Centralized Billing",
    description: "One invoice for all company travel. Simplified expense management and reconciliation.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Add travelers, set approval workflows, and manage travel policies centrally.",
  },
  {
    icon: FileText,
    title: "Travel Policy Compliance",
    description: "Enforce company travel policies automatically with booking restrictions and approvals.",
  },
  {
    icon: BarChart3,
    title: "Reporting & Analytics",
    description: "Track spending, identify savings opportunities, and generate expense reports.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Dedicated account manager and priority support for your business travelers.",
  },
  {
    icon: Shield,
    title: "Duty of Care",
    description: "Real-time traveler tracking and emergency support when your team is on the road.",
  },
];

const BENEFITS = [
  "Save up to 20% on corporate travel",
  "Dedicated account manager",
  "Custom travel policies",
  "Priority 24/7 support",
  "Detailed expense reporting",
  "Integration with expense tools",
];

export default function CorporateTravel() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const message = `Company: ${data.get("company") || ""}\nName: ${data.get("name") || ""}\nEmail: ${data.get("email") || ""}\nSize: ${data.get("size") || ""}\nMessage: ${data.get("message") || ""}`;
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "corporate_lead",
        subject: "Corporate Travel Inquiry",
        message,
      });
      if (error) throw error;
      toast.success("Thanks for your interest! We'll be in touch soon.");
      form.reset();
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>ZIVO for Business - Corporate Travel Management | ZIVO</title>
        <meta 
          name="description" 
          content="Streamline your company's travel with ZIVO for Business. Centralized booking, expense management, and dedicated support for corporate travelers." 
        />
      </Helmet>

      <NavBar />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero */}
        <section className="py-20 to-background relative overflow-hidden bg-secondary">
          <div className="absolute top-0 right-0 w-1/2 h-full to-transparent bg-secondary" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm mb-6">
                  <Building2 className="w-4 h-4" />
                  Coming Soon
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  ZIVO for Business
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Streamline your company's travel with centralized booking, 
                  expense management, and dedicated support. Save time and money 
                  on every business trip.
                </p>

                <ul className="space-y-2 mb-8">
                  {BENEFITS.slice(0, 4).map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="gap-2 bg-foreground hover:bg-foreground">
                  <a href="#waitlist">
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              <div className="hidden lg:block">
                <div className="relative">
                  <div className="w-full aspect-square rounded-3xl border border-border flex items-center justify-center bg-secondary">
                    <Building2 className="w-32 h-32 text-foreground/50" />
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Everything You Need for Business Travel
              </h2>
              <p className="text-muted-foreground">
                Powerful tools to manage your company's travel program
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="p-6 rounded-2xl border border-border bg-card hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist Form */}
        <section id="waitlist" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Join the Waitlist</h2>
                <p className="text-muted-foreground">
                  Be the first to know when ZIVO for Business launches. 
                  Get early access and exclusive rates.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Work Email</Label>
                  <Input id="email" type="email" placeholder="john@company.com" required />
                </div>
                
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" placeholder="Acme Inc." required />
                </div>
                
                <div>
                  <Label htmlFor="size">Company Size</Label>
                  <select
                    id="size"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    required
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="message">Tell us about your travel needs (optional)</Label>
                  <Textarea 
                    id="message" 
                    placeholder="e.g., Monthly travel volume, current pain points..."
                    rows={3}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Join Waitlist"}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  We'll only contact you about ZIVO for Business. No spam.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-8 text-center">FAQ</h2>
              
              <div className="space-y-4">
                {[
                  {
                    q: "When will ZIVO for Business launch?",
                    a: "We're planning to launch in Q2 2024. Join the waitlist to get early access.",
                  },
                  {
                    q: "What's the minimum company size?",
                    a: "ZIVO for Business will be available for companies of all sizes, from small teams to enterprises.",
                  },
                  {
                    q: "Will there be a free trial?",
                    a: "Yes, we'll offer a free trial period so you can test all features before committing.",
                  },
                ].map((faq, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
