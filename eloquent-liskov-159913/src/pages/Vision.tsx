/**
 * Vision - The Future of Travel with ZIVO
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Globe,
  Leaf,
  Brain,
  Plane,
  Car,
  Building2,
  ArrowRight,
  Mail,
  Rocket,
  Users,
  Shield,
  Zap,
} from "lucide-react";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const visionSections = [
  {
    icon: Brain,
    title: "AI That Understands You",
    subtitle: "Personalized Travel Intelligence",
    description: "Our AI learns your preferences, anticipates your needs, and crafts personalized recommendations that feel like they were made just for you. From suggesting the perfect departure time to finding hidden gem destinations, ZIVO's AI becomes your personal travel advisor.",
    features: [
      "Smart price predictions",
      "Personalized destination matching",
      "Intelligent rebooking assistance",
      "Natural language trip planning",
    ],
    color: "violet",
  },
  {
    icon: Zap,
    title: "Seamless Journeys",
    subtitle: "One App for Everything",
    description: "Imagine booking your flight, hotel, and airport transfer in one flow. Then ordering food to your gate. And finally, getting a ride home when you land. ZIVO is building the first truly unified travel and mobility platform.",
    features: [
      "Unified booking experience",
      "Cross-service continuity",
      "Real-time trip management",
      "Instant rebooking across services",
    ],
    color: "sky",
  },
  {
    icon: Globe,
    title: "Global Reach",
    subtitle: "Travel Without Borders",
    description: "We're expanding our partner network to cover every corner of the globe. From budget airlines to luxury carriers, from boutique hotels to major chains—ZIVO will be your gateway to worldwide travel.",
    features: [
      "200+ airlines worldwide",
      "1M+ hotel properties",
      "Regional payment methods",
      "Multi-language support",
    ],
    color: "emerald",
  },
  {
    icon: Leaf,
    title: "Sustainable Travel",
    subtitle: "Better for the Planet",
    description: "We're committed to making sustainable travel choices accessible. Track your carbon footprint, discover eco-friendly options, and offset your impact—all built into your booking experience.",
    features: [
      "Carbon footprint tracking",
      "Eco-certified accommodations",
      "Sustainable transport options",
      "Offset programs integration",
    ],
    color: "teal",
  },
];

const upcomingFeatures = [
  { name: "Mobile Apps", status: "Q2 2025", icon: Rocket },
  { name: "AI Trip Planner v2", status: "Q3 2025", icon: Brain },
  { name: "Group Booking Tools", status: "Q3 2025", icon: Users },
  { name: "Corporate Portal", status: "Q4 2025", icon: Building2 },
  { name: "Multi-city Booking", status: "2026", icon: Plane },
  { name: "Travel Insurance", status: "2026", icon: Shield },
];

const Vision = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmittingNewsletter(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "newsletter_signup",
        subject: "Vision page newsletter signup",
        message: `Email: ${email}`,
      });
      if (error) throw error;
      setSubscribed(true);
      setEmail("");
      toast.success("Subscribed!", { description: "We'll keep you in the loop on new launches." });
    } catch (err: any) {
      toast.error(err?.message || "Could not subscribe. Please try again.");
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 rounded-full font-medium">
              Our Vision
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              The Future of Travel
              <br />
              <span className="text-accent-foreground">with ZIVO</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're building the most intelligent, seamless, and sustainable 
              travel platform in the world. Here's where we're heading.
            </p>
          </motion.div>
        </section>

        {/* Vision Sections */}
        <section className="container mx-auto px-4 mb-20">
          <div className="space-y-24">
            {visionSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-4">
                    <section.icon className="w-4 h-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {section.subtitle}
                    </span>
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight mb-4">{section.title}</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {section.description}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {section.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <Card className="aspect-video bg-secondary border-border">
                    <CardContent className="h-full flex items-center justify-center">
                      <section.icon className="w-24 h-24 text-muted-foreground/40" />
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Upcoming Features */}
        <section className="container mx-auto px-4 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What's Coming</h2>
            <p className="text-muted-foreground">
              Features and capabilities on our roadmap
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {upcomingFeatures.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:border-primary/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <feature.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{feature.name}</p>
                      <p className="text-sm text-muted-foreground">{feature.status}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* === WAVE 15: Rich Vision Content === */}

        {/* Vision Metrics */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Our 2026 Goals</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { goal: "10M+", label: "Monthly searches", emoji: "🔍" },
                { goal: "50+", label: "Partner airlines", emoji: "✈️" },
                { goal: "30+", label: "Countries live", emoji: "🌍" },
                { goal: "4.8★", label: "App Store rating", emoji: "⭐" },
              ].map(g => (
                <div key={g.label} className="text-center p-5 rounded-2xl border border-border bg-secondary">
                  <span className="text-2xl">{g.emoji}</span>
                  <p className="text-xl font-bold text-foreground mt-2">{g.goal}</p>
                  <p className="text-[10px] text-muted-foreground">{g.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Innovation Pipeline */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Innovation Pipeline</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { innovation: "Voice Search", desc: "Book flights and hotels using natural voice commands", timeline: "2025", emoji: "🎙️" },
                { innovation: "AR Navigation", desc: "Augmented reality wayfinding in airports and cities", timeline: "2026", emoji: "👓" },
                { innovation: "Predictive Pricing", desc: "ML models that predict optimal booking windows", timeline: "2025", emoji: "📈" },
                { innovation: "Travel Wallet", desc: "Unified payment wallet with multi-currency support", timeline: "2025", emoji: "💳" },
                { innovation: "Social Trips", desc: "Plan and book group trips with friends in real-time", timeline: "2026", emoji: "👥" },
                { innovation: "Carbon Dashboard", desc: "Track and offset your travel carbon footprint", timeline: "2025", emoji: "🌱" },
              ].map(i => (
                <Card key={i.innovation} className="border-border hover:border-foreground/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{i.emoji}</span>
                      <span className="font-bold text-sm">{i.innovation}</span>
                      <Badge variant="secondary" className="text-[9px] ml-auto">{i.timeline}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{i.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Core Beliefs */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <Card className="border-border bg-secondary">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold tracking-tight text-center mb-6">What We Believe</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { belief: "Travel should be accessible to everyone", emoji: "🌏" },
                    { belief: "Technology should simplify, not complicate", emoji: "✨" },
                    { belief: "Transparency builds lasting trust", emoji: "🤝" },
                    { belief: "Sustainability is not optional", emoji: "🌱" },
                  ].map(b => (
                    <div key={b.belief} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <span className="text-xl">{b.emoji}</span>
                      <p className="text-sm font-medium">{b.belief}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Join the Journey */}
        <section className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-border bg-secondary">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Join the Journey</h2>
              <p className="text-muted-foreground mb-6">
                Be the first to know about new features and exclusive early access.
              </p>

              {subscribed ? (
                <div className="p-4 rounded-xl bg-background border border-border text-foreground">
                  Thanks for joining! We'll keep you updated.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-3 max-w-md mx-auto">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 rounded-xl"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={submittingNewsletter} className="h-12 px-6 gap-2">
                    {submittingNewsletter ? "Subscribing…" : "Subscribe"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Vision;
