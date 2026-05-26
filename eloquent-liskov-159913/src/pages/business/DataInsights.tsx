/**
 * B2B Data Insights Page
 * Anonymized travel intelligence offering
 */

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  TrendingUp,
  Globe,
  Shield,
  Zap,
  Building,
  Plane,
  Hotel,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

const insightCategories = [
  {
    icon: TrendingUp,
    title: "Demand Trends",
    description: "Popular routes and seasonal booking patterns across regions",
  },
  {
    icon: BarChart3,
    title: "Pricing Signals",
    description: "Price movement indicators and competitive positioning data",
  },
  {
    icon: Globe,
    title: "Regional Insights",
    description: "Geographic demand distribution and emerging market trends",
  },
  {
    icon: Zap,
    title: "Booking Windows",
    description: "Lead time patterns and optimal pricing window intelligence",
  },
];

const useCases = [
  { icon: Plane, title: "Airlines", description: "Route planning and pricing optimization" },
  { icon: Hotel, title: "Hotels", description: "Demand forecasting and rate strategy" },
  { icon: Building, title: "Tourism Boards", description: "Destination marketing insights" },
  { icon: Users, title: "Travel Agencies", description: "Market opportunity identification" },
];

export default function DataInsights() {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    useCase: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Request submitted! We'll be in touch soon.");
    setFormData({ company: '', name: '', email: '', useCase: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Travel Intelligence for Business – ZIVO"
        description="Anonymized travel data and insights for airlines, hotels, and tourism businesses."
        canonical="https://hizivo.com/business/insights"
      />
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden pb-16">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                <BarChart3 className="w-3 h-3 mr-1" />
                B2B Data Platform
              </Badge>

              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Travel Intelligence for Business
              </h1>

              <p className="text-lg text-muted-foreground mb-6">
                Actionable travel insights powered by aggregated, anonymized platform data. 
                Make smarter decisions with real-time demand intelligence.
              </p>

              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-sm px-4 py-1">
                B2B Data API – Coming 2025
              </Badge>
            </div>
          </div>
        </section>

        {/* Insight Categories */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Available Insights</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {insightCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title} className="text-center hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Who Uses ZIVO Data</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <div
                    key={useCase.title}
                    className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{useCase.title}</h3>
                      <p className="text-sm text-muted-foreground">{useCase.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Privacy & Trust */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gradient-to-r from-emerald-500/10 border-emerald-500/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-3">Privacy-First Data</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        All data insights are anonymized and aggregated
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        No individual user data is ever shared
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Data is derived from aggregate platform activity
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        GDPR and CCPA compliant
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Request Access Form */}
        <section className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <Lock className="w-10 h-10 mx-auto text-primary mb-3" />
                  <h3 className="text-xl font-bold mb-2">Request Early Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Join the waitlist for our B2B data API launching in 2025
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="useCase">How would you use ZIVO data?</Label>
                    <Textarea
                      id="useCase"
                      value={formData.useCase}
                      onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                      placeholder="Describe your use case..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full gap-2">
                    Request Access <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
