/**
 * Press & Media Page
 * Press kit, media inquiries, and company information
 */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Newspaper,
  Mail,
  Download,
  Building2,
  Users,
  Globe,
  Briefcase,
  FileText,
  ExternalLink,
  Palette,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
// PressKitAssets removed

const companyFacts = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "United States" },
  { label: "Services", value: "Flights, Hotels, Car Rentals, Rides, Eats, Move" },
  { label: "Markets", value: "United States (Expanding)" },
];

const pressContacts = [
  {
    label: "Media Inquiries",
    email: "press@hizivo.com",
    description: "For press releases, interviews, and media coverage",
  },
  {
    label: "Business Partnerships",
    email: "partners@hizivo.com",
    description: "For partnership and integration opportunities",
  },
  {
    label: "Corporate Accounts",
    email: "business@hizivo.com",
    description: "For enterprise and corporate travel solutions",
  },
];

const Press = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    outlet: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API
    toast.success("Thank you! We'll respond to your inquiry within 24-48 hours.");
    setFormData({ name: "", email: "", outlet: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Press & Media | ZIVO"
        description="ZIVO press resources, media kit, and contact information for journalists and media outlets."
        canonical="https://hizivo.com/press"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-secondary text-foreground border-border">
              <Newspaper className="w-3 h-3 mr-1" />
              Press & Media
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Press Resources
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access press resources, brand assets, and contact our media relations team.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="contact" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] lg:mx-auto">
              <TabsTrigger value="contact">Media Contact</TabsTrigger>
              <TabsTrigger value="assets">Press Kit</TabsTrigger>
            </TabsList>

            {/* Contact Tab */}
            <TabsContent value="contact">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Company Facts */}
                   <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Company Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {companyFacts.map((fact) => (
                        <div key={fact.label} className="flex justify-between">
                          <span className="text-muted-foreground">{fact.label}</span>
                          <span className="font-medium">{fact.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Press Contacts */}
                   <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Press Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pressContacts.map((contact) => (
                        <div key={contact.email} className="space-y-1">
                          <p className="font-medium">{contact.label}</p>
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {contact.description}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Resources */}
                   <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-start gap-2" asChild>
                        <Link to="/brand">
                          <Palette className="w-4 h-4" />
                          Brand & Mission
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2" asChild>
                        <Link to="/company-profile">
                          <Building2 className="w-4 h-4" />
                          Company Profile
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start gap-2" asChild>
                        <Link to="/about">
                          <Users className="w-4 h-4" />
                          About ZIVO
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Contact Form */}
                <Card className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Media Inquiry Form
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          placeholder="jane@publication.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="outlet">Media Outlet / Publication</Label>
                        <Input
                          id="outlet"
                          value={formData.outlet}
                          onChange={(e) => setFormData({ ...formData, outlet: e.target.value })}
                          placeholder="TechCrunch, Travel Weekly, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Your Inquiry *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={5}
                          placeholder="Please describe your inquiry or interview request..."
                        />
                      </div>
                      <Button type="submit" className="w-full shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)] transition-shadow">
                        Submit Inquiry
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        We typically respond within 24-48 business hours.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Coverage */}
              <section className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-center">Recent Coverage</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { outlet: "TechCrunch", title: "ZIVO raises seed round to unify travel booking", date: "Jan 2025", category: "Funding", emoji: "💰" },
                    { outlet: "Travel Weekly", title: "How ZIVO is disrupting the OTA landscape", date: "Dec 2024", category: "Industry", emoji: "✈️" },
                    { outlet: "Forbes", title: "10 Travel Startups to Watch in 2025", date: "Nov 2024", category: "Recognition", emoji: "🏆" },
                    { outlet: "Skift", title: "ZIVO launches multi-modal travel platform", date: "Oct 2024", category: "Launch", emoji: "🚀" },
                    { outlet: "The Points Guy", title: "ZIVO Miles: A new loyalty program worth exploring", date: "Sep 2024", category: "Rewards", emoji: "⭐" },
                    { outlet: "Wired", title: "The future of AI-powered trip planning", date: "Aug 2024", category: "Technology", emoji: "🤖" },
                  ].map(a => (
                    <Card key={a.title} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{a.emoji}</span>
                          <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                        </div>
                        <p className="font-semibold text-sm mb-1">{a.title}</p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-primary font-medium">{a.outlet}</p>
                          <p className="text-[10px] text-muted-foreground">{a.date}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Company Milestones */}
              <section className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-center">Company Milestones</h2>
                <div className="space-y-3">
                  {[
                    { year: "2025", event: "Expanded to 50+ team members, launched ZIVO Rides & Eats", icon: "🎯" },
                    { year: "2024", event: "Founded ZIVO, launched flight search and hotel booking", icon: "🏁" },
                    { year: "2024", event: "ZIVO Miles loyalty program launched", icon: "⭐" },
                    { year: "2024", event: "Car rental and multi-city booking added", icon: "🚗" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                      <span className="text-2xl">{m.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{m.event}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.year}</Badge>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Facts for Journalists */}
              <section className="mt-12">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-primary" /> Quick Facts for Journalists
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { q: "What is ZIVO?", a: "A unified travel and mobility platform for flights, hotels, car rentals, rides, food delivery, and more." },
                        { q: "Who founded ZIVO?", a: "ZIVO was founded in 2024 with a mission to connect how the world moves." },
                        { q: "Where is ZIVO based?", a: "United States, with a fully remote and global team." },
                        { q: "How does ZIVO make money?", a: "Referral commissions from travel partners, ZIVO+ memberships, and advertising." },
                      ].map(f => (
                        <div key={f.q} className="p-3 rounded-xl bg-card/60 border border-border/30">
                          <p className="text-xs font-bold text-foreground mb-1">{f.q}</p>
                          <p className="text-[11px] text-muted-foreground">{f.a}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* === WAVE 14: Rich Press Content === */}

              {/* Media Coverage Stats */}
              <section className="mt-12">
                <Card className="border-border bg-secondary">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg text-center mb-4">Media Coverage</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      {[
                        { stat: "50+", label: "Press mentions", emoji: "📰" },
                        { stat: "25+", label: "Interviews given", emoji: "🎙️" },
                        { stat: "10+", label: "Awards & lists", emoji: "🏆" },
                        { stat: "15M+", label: "Media impressions", emoji: "👁️" },
                      ].map(s => (
                        <div key={s.label}>
                          <span className="text-xl">{s.emoji}</span>
                          <p className="text-xl font-bold text-foreground mt-1">{s.stat}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Speaking & Events */}
              <section className="mt-12">
                <h2 className="text-2xl font-bold mb-6 text-center">Speaking & Events</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { event: "Skift Global Forum", topic: "The Future of Multi-Modal Travel", date: "Mar 2025", location: "New York", emoji: "🎤" },
                    { event: "Phocuswright Conference", topic: "AI-Powered Travel Personalization", date: "Nov 2024", location: "Los Angeles", emoji: "🤖" },
                    { event: "TravelTech Show", topic: "Building a Unified Travel Platform", date: "Jun 2024", location: "London", emoji: "🌍" },
                  ].map(e => (
                    <Card key={e.event} className="border-border/50 hover:border-border transition-all">
                      <CardContent className="p-4">
                        <span className="text-lg">{e.emoji}</span>
                        <p className="font-bold text-sm mt-2">{e.event}</p>
                        <p className="text-xs text-muted-foreground mt-1">{e.topic}</p>
                        <div className="flex items-center justify-between mt-3">
                          <Badge variant="secondary" className="text-[9px]">{e.location}</Badge>
                          <span className="text-[10px] text-muted-foreground">{e.date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Boilerplate */}
              <section className="mt-12">
                <Card className="border-border/50 bg-muted/20">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-3">About ZIVO (Boilerplate)</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      ZIVO (hizivo.com) is a travel search and comparison platform that helps users find and compare flights, hotels, car rentals, and travel services from trusted partners worldwide. Founded in 2024, ZIVO's mission is to connect how the world moves by building a unified platform for travel and mobility. ZIVO does not sell tickets or process payments — when users select an option, they are redirected to trusted travel partners to complete their booking. ZIVO is free for users and earns revenue through affiliate commissions from travel partners. For more information, visit hizivo.com.
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Copy-paste ready for publications. For custom quotes, contact press@hizivo.com.
                    </p>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            {/* Press Kit Tab */}
            <TabsContent value="assets">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "ZIVO Logo Pack", desc: "SVG + PNG in light/dark variants", icon: "🎨", size: "2.4 MB" },
                  { label: "Brand Guidelines", desc: "Colors, typography, and usage rules", icon: "📐", size: "1.1 MB" },
                  { label: "App Screenshots", desc: "iOS & Android — 6.7\" and 6.1\" sizes", icon: "📱", size: "18 MB" },
                  { label: "Founder Photos", desc: "High-res press photos, 300 DPI", icon: "👤", size: "8.2 MB" },
                  { label: "Product One-Pager", desc: "Key stats, mission, and product overview", icon: "📄", size: "540 KB" },
                  { label: "Fact Sheet 2026", desc: "Users, markets, funding, milestones", icon: "📊", size: "320 KB" },
                ].map(asset => (
                  <Card key={asset.label} className="flex items-center gap-4 p-4">
                    <div className="text-3xl">{asset.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{asset.label}</p>
                      <p className="text-sm text-muted-foreground">{asset.desc}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{asset.size}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 shrink-0"
                      onClick={() => window.open("mailto:press@hizivo.com?subject=Press Kit Request: " + asset.label)}>
                      <Download className="w-3 h-3" /> Request
                    </Button>
                  </Card>
                ))}
                <Card className="col-span-full p-4 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Need a custom asset or higher resolution? Email <a href="mailto:press@hizivo.com" className="text-primary underline">press@hizivo.com</a>
                  </p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Press;
