/**
 * Company Profile Page
 * Executive profile for banks, partners, investors, and press
 */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Users,
  Mail,
  ExternalLink,
  Briefcase,
  Target,
  TrendingUp,
  Shield,
  Plane,
  Hotel,
  Car,
  MapPin,
  Utensils,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";

const companyInfo = [
  { label: "Legal Name", value: "ZIVO LLC" },
  { label: "Trading As", value: "ZIVO / Hizovo" },
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "United States" },
  { label: "Website", value: "hizivo.com" },
  { label: "Industry", value: "Travel Technology / Mobility" },
];

const businessModel = [
  {
    title: "Commission-Based Revenue",
    description: "ZIVO earns commissions from partner bookings. Users pay partner prices with no added fees.",
  },
  {
    title: "Affiliate Partnerships",
    description: "Strategic partnerships with airlines, hotels, and car rental providers worldwide.",
  },
  {
    title: "No Direct Ticket Sales",
    description: "ZIVO facilitates bookings through licensed travel partners who handle fulfillment.",
  },
  {
    title: "Mobility Expansion",
    description: "Growing into local services including rides, food delivery, and logistics.",
  },
];

const services = [
  { name: "ZIVO Flights", icon: Plane, status: "Live" },
  { name: "ZIVO Hotels", icon: Hotel, status: "Live" },
  { name: "ZIVO Cars", icon: Car, status: "Live" },
  { name: "ZIVO Rides", icon: MapPin, status: "Launching" },
  { name: "ZIVO Eats", icon: Utensils, status: "Launching" },
  { name: "ZIVO Move", icon: Package, status: "Roadmap" },
];

const leadership = [
  {
    title: "Founder & CEO",
    name: "Kimlain",
    email: "kimlain@hizivo.com",
  },
  {
    title: "Chief Technology Officer",
    name: "To be announced",
    email: null,
  },
  {
    title: "Chief Operating Officer",
    name: "To be announced",
    email: null,
  },
];

const contacts = [
  { label: "General Business", email: "kimlain@hizivo.com" },
  { label: "Press & Media", email: "press@hizivo.com" },
  { label: "Investor Relations", email: "investors@hizivo.com" },
  { label: "Partnerships", email: "partners@hizivo.com" },
  { label: "Support", email: "info@hizivo.com" },
];

const CompanyProfile = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Company Profile | ZIVO"
        description="ZIVO LLC company profile - Travel & Mobility Ecosystem. Overview for banks, partners, investors, and press."
        canonical="https://hizivo.com/company-profile"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Building2 className="w-3 h-3 mr-1" />
              Company Profile
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              ZIVO LLC
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Travel & Mobility Ecosystem
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Company Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Company Overview */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Company Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {companyInfo.map((info) => (
                      <div key={info.label} className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{info.label}</span>
                        <span className="font-medium">{info.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground">
                    ZIVO is a global travel search and comparison platform that helps travelers 
                    find and compare flights, hotels, car rentals, and travel services from 
                    trusted partners worldwide. Founded in 2024, ZIVO is building a unified 
                    travel and mobility ecosystem powered by AI.
                  </p>
                </CardContent>
              </Card>

              {/* Business Model */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Business Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {businessModel.map((item) => (
                    <div key={item.title} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <h4 className="font-semibold mb-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Services */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Services Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {services.map((service) => (
                      <div key={service.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:bg-muted/50 transition-all duration-200">
                        <service.icon className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {service.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Global Vision */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Global Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Super-App for Travel & Mobility</h4>
                      <p className="text-sm text-muted-foreground">
                        Unified platform combining global travel (flights, hotels, cars) with 
                        local mobility (rides, food, logistics).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">AI-Powered Personalization</h4>
                      <p className="text-sm text-muted-foreground">
                        Smart recommendations, dynamic pricing insights, and automated 
                        trip planning.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold">Global Expansion</h4>
                      <p className="text-sm text-muted-foreground">
                        Initial focus on United States with planned expansion to LATAM, 
                        Europe, and APAC markets.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Leadership & Contacts */}
            <div className="space-y-6">
              {/* Leadership */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Leadership
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {leadership.map((leader) => (
                    <div key={leader.title} className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                      <p className="text-sm text-muted-foreground">{leader.title}</p>
                      <p className="font-semibold">{leader.name}</p>
                      {leader.email && (
                        <a href={`mailto:${leader.email}`} className="text-sm text-primary hover:underline">
                          {leader.email}
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.email}>
                      <p className="text-sm text-muted-foreground">{contact.label}</p>
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <Link to="/brand">
                      Brand & Mission
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <Link to="/investors">
                      Investor Relations
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <Link to="/press">
                      Press & Media
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <Link to="/strategic-partnerships">
                      Strategic Partnerships
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* === WAVE 12: Rich Company Content === */}

          {/* Key Metrics */}
          <Card className="mt-12 border-primary/20 bg-primary/5">
            <CardContent className="p-8">
              <h3 className="font-bold text-xl text-center mb-6">Company Highlights</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                {[
                  { stat: "2024", label: "Founded", emoji: "🏢" },
                  { stat: "6", label: "Product verticals", emoji: "🚀" },
                  { stat: "500+", label: "Partner integrations", emoji: "🤝" },
                  { stat: "30+", label: "Countries served", emoji: "🌍" },
                ].map(s => (
                  <div key={s.label}>
                    <span className="text-2xl">{s.emoji}</span>
                    <p className="text-2xl font-bold text-primary mt-2">{s.stat}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company Timeline */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-center mb-6">Company Timeline</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { date: "Q1 2024", event: "ZIVO LLC founded", desc: "Company established in the United States", icon: "🏢" },
                { date: "Q3 2024", event: "Flights & Hotels launch", desc: "Core travel search platform goes live", icon: "✈️" },
                { date: "Q1 2025", event: "Car rentals added", desc: "Third vertical expands platform scope", icon: "🚗" },
                { date: "Q2 2025", event: "AI-powered features", desc: "Smart recommendations & trip planning", icon: "🤖" },
              ].map(t => (
                <Card key={t.date} className="border-border/50 hover:border-primary/20 transition-all">
                  <CardContent className="p-5">
                    <span className="text-2xl">{t.icon}</span>
                    <Badge variant="secondary" className="text-[10px] ml-2">{t.date}</Badge>
                    <h4 className="font-bold text-sm mt-3">{t.event}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Competitive Advantages */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-center mb-6">Competitive Advantages</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { advantage: "Unified Ecosystem", desc: "Single platform for flights, hotels, cars, rides, food, and logistics — unlike fragmented competitors", icon: Globe },
                { advantage: "AI-First Architecture", desc: "Machine learning powers every search, recommendation, and pricing insight", icon: TrendingUp },
                { advantage: "Zero-Fee Model", desc: "Users never pay extra fees — ZIVO earns from partner commissions only", icon: Target },
                { advantage: "Global from Day One", desc: "Built for international scale with multi-currency and multi-language support", icon: Shield },
              ].map(a => (
                <Card key={a.advantage} className="border-border/50 hover:border-primary/20 hover:shadow-sm transition-all">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <a.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{a.advantage}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{a.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompanyProfile;
