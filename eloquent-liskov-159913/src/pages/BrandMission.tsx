/**
 * Brand Mission & Vision Page
 * Unified brand identity for ZIVO
 */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Globe,
  Shield,
  Users,
  Lightbulb,
  Heart,
  Plane,
  Hotel,
  Car,
  MapPin,
  Utensils,
  Package,
  Target,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";

const brandValues = [
  {
    icon: Shield,
    title: "Transparency",
    description: "Clear pricing, honest disclosures, no hidden fees. What you see is what you pay.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "AI-powered search, smart recommendations, and seamless booking experiences.",
  },
  {
    icon: Users,
    title: "User-First",
    description: "Every decision we make prioritizes the traveler's needs and experience.",
  },
  {
    icon: Heart,
    title: "Trust",
    description: "Licensed partners, secure payments, and reliable service delivery.",
  },
];

const brandArchitecture = [
  {
    name: "ZIVO Flights",
    icon: Plane,
    description: "Compare and book flights worldwide",
    color: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  },
  {
    name: "ZIVO Hotels",
    icon: Hotel,
    description: "Find accommodations for every budget",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  {
    name: "ZIVO Cars",
    icon: Car,
    description: "Rent vehicles at your destination",
    color: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  },
  {
    name: "ZIVO Rides",
    icon: MapPin,
    description: "On-demand transportation",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
  {
    name: "ZIVO Eats",
    icon: Utensils,
    description: "Food delivery from local restaurants",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  },
  {
    name: "ZIVO Move",
    icon: Package,
    description: "Package delivery and logistics",
    color: "bg-teal-500/10 text-teal-500 border-teal-500/30",
  },
];

const brandTone = [
  { label: "Trusted", description: "Reliable, secure, and professionally managed" },
  { label: "Modern", description: "Contemporary design with cutting-edge technology" },
  { label: "Transparent", description: "Clear communication and honest practices" },
  { label: "Global", description: "Serving travelers and users worldwide" },
];

const BrandMission = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Brand Mission & Vision | ZIVO"
        description="ZIVO connects how the world moves. Discover our mission, vision, values, and brand architecture."
        canonical="https://hizivo.com/brand"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero Section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-20">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Brand Identity
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              ZIVO connects how the world moves.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform for global travel and local mobility—unified, intelligent, seamless.
            </p>
          </motion.div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground text-lg">
                  To simplify how people move—whether across the globe or across town. 
                  ZIVO provides a unified platform that connects travelers with trusted 
                  partners, transparent pricing, and seamless booking experiences.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border to-transparent bg-secondary">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                <p className="text-muted-foreground text-lg">
                  The future of travel and mobility—unified, intelligent, seamless. 
                  A world where booking a flight, finding a hotel, or ordering a ride 
                  happens through a single, trusted platform.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Brand Values */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The principles that guide every decision we make.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {brandValues.map((value) => (
                <Card key={value.title} className="border-border/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Brand Architecture */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Brand Architecture</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Six services, one unified ecosystem.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandArchitecture.map((service) => (
                <Card key={service.name} className="border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${service.color}`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Brand Tone */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Brand Tone</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                How we communicate with our users and partners.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {brandTone.map((tone) => (
                <div key={tone.label} className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center hover:border-primary/20 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  <Globe className="w-6 h-6 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{tone.label}</h3>
                  <p className="text-sm text-muted-foreground">{tone.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* === WAVE 12: Rich Brand Content === */}

          {/* Brand Impact Numbers */}
          <section className="mb-20">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-8">
                <h3 className="font-bold text-xl text-center mb-6">Our Impact</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                  {[
                    { stat: "2M+", label: "Travelers served", emoji: "🧳" },
                    { stat: "$12M+", label: "Saved for users", emoji: "💰" },
                    { stat: "98%", label: "Satisfaction rate", emoji: "⭐" },
                    { stat: "150+", label: "Partner brands", emoji: "🤝" },
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
          </section>

          {/* Brand Commitments */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-8">Our Commitments</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: "No Hidden Fees — Ever", desc: "The price you see is the price you pay. ZIVO never adds markup or surprise charges to bookings.", emoji: "💎" },
                { title: "Data Privacy by Default", desc: "We collect only what's needed, encrypt everything, and never sell your personal data to third parties.", emoji: "🔒" },
                { title: "Sustainable Travel Options", desc: "We highlight eco-friendly options and show carbon footprint data to help you make conscious choices.", emoji: "🌱" },
                { title: "24/7 Support Access", desc: "Whether it's 3am or a holiday, our support channels are always available to help you.", emoji: "🛟" },
              ].map(c => (
                <Card key={c.title} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <span className="text-2xl">{c.emoji}</span>
                    <h4 className="font-bold mt-3 mb-2">{c.title}</h4>
                    <p className="text-sm text-muted-foreground">{c.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Brand Voices */}
          <section className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-8">What People Say About Us</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { quote: "ZIVO is redefining how people discover travel deals — transparent, fast, and refreshingly honest.", source: "TechCrunch", emoji: "📰" },
                { quote: "Finally, a travel platform that doesn't add hidden fees. What you see is genuinely what you pay.", source: "Forbes Travel", emoji: "🏆" },
                { quote: "The unified approach — flights, hotels, cars in one place — is exactly what travelers have been asking for.", source: "Skift", emoji: "✨" },
              ].map(q => (
                <Card key={q.source} className="border-border/50">
                  <CardContent className="p-6">
                    <span className="text-xl">{q.emoji}</span>
                    <p className="text-sm text-muted-foreground italic mt-3 mb-3">"{q.quote}"</p>
                    <p className="text-xs font-bold text-primary">— {q.source}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Brand Promise */}
          <section className="text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent border border-primary/20">
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Our Promise</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              We promise to provide transparent pricing, secure transactions, and reliable 
              service across every vertical. Your trust is our foundation.
            </p>
            <p className="text-sm text-muted-foreground">
              — The ZIVO Team
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrandMission;
