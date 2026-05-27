/**
 * Careers Page
 * Join ZIVO - talent attraction and culture
 */

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Globe,
  Laptop,
  Lightbulb,
  Users,
  Heart,
  Plane,
  GraduationCap,
  Clock,
  DollarSign,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const cultureValues = [
  {
    icon: Globe,
    title: "Global-First Mindset",
    description: "We build for travelers worldwide, embracing diverse perspectives and markets.",
  },
  {
    icon: Laptop,
    title: "Remote-Ready Structure",
    description: "Work from anywhere. Our distributed team collaborates across time zones.",
  },
  {
    icon: Lightbulb,
    title: "Innovation Culture",
    description: "We move fast, experiment boldly, and aren't afraid to challenge conventions.",
  },
  {
    icon: Heart,
    title: "Transparency",
    description: "Open communication, honest feedback, and clear expectations at all levels.",
  },
];

const benefits = [
  {
    icon: DollarSign,
    title: "Competitive Compensation",
    description: "Salary and equity packages that reflect your impact and contribution.",
  },
  {
    icon: Clock,
    title: "Remote Flexibility",
    description: "Work from home, coffee shop, or anywhere with reliable internet.",
  },
  {
    icon: GraduationCap,
    title: "Learning & Development",
    description: "Budget for courses, conferences, and professional growth.",
  },
  {
    icon: Plane,
    title: "Travel Perks",
    description: "Discounts and credits on ZIVO platform for personal travel.",
  },
];

const departments = [
  {
    name: "Engineering",
    description: "Build the platform that powers millions of travel bookings.",
    roles: ["Full-Stack Engineers", "Backend Engineers", "Mobile Developers", "DevOps"],
  },
  {
    name: "Product",
    description: "Define the future of travel search and booking experiences.",
    roles: ["Product Managers", "Product Designers", "UX Researchers"],
  },
  {
    name: "Design",
    description: "Create beautiful, intuitive interfaces for global travelers.",
    roles: ["UI/UX Designers", "Brand Designers", "Motion Designers"],
  },
  {
    name: "Operations",
    description: "Keep the business running smoothly and efficiently.",
    roles: ["Partner Operations", "Customer Support", "Finance"],
  },
];

const Careers = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Careers | ZIVO"
        description="Join ZIVO and help build the future of travel. Remote-first, global-minded, innovation-driven."
        canonical="https://hizivo.com/careers"
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Hero Section */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-16">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Briefcase className="w-3 h-3 mr-1" />
              Careers
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Build the Future of Travel
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join a global team building the next generation of travel and 
              mobility experiences.
            </p>
          </motion.div>

          {/* Mission Banner */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 mb-16">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                ZIVO connects how the world moves. We're building a unified platform 
                for travel and mobility that makes booking flights, hotels, cars, rides, 
                and more as simple as tapping a button.
              </p>
            </CardContent>
          </Card>

          {/* Culture Values */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Our Culture</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {cultureValues.map((value) => (
                <Card key={value.title} className="border-border/50 hover:border-primary/20 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Benefits */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Benefits & Perks</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="p-6 rounded-2xl bg-muted/30 border border-border/50 text-center hover:border-primary/20 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <benefit.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Departments */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Teams</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {departments.map((dept) => (
                <Card key={dept.name} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle>{dept.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{dept.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {dept.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Open Positions */}
          <section className="mb-16">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Open Positions</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    We don't have any open positions at this time. Sign up to be 
                    notified when new opportunities become available.
                  </p>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href="mailto:careers@hizivo.com">
                      <Mail className="w-4 h-4" />
                      Get Notified
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* === WAVE 9: Rich Career Content === */}

          {/* Employee Testimonials */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Life at ZIVO</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { name: "Priya S.", role: "Senior Engineer", quote: "The engineering challenges here are incredible — we process millions of travel searches daily. Plus, I get to work from Bali.", emoji: "👩‍💻", tenure: "2 years" },
                { name: "Carlos M.", role: "Product Designer", quote: "I love that my designs impact travelers worldwide. The team genuinely cares about craft and user experience.", emoji: "🎨", tenure: "1.5 years" },
                { name: "Emma L.", role: "Operations Lead", quote: "Moving fast while keeping partners happy is exciting. ZIVO gives me ownership that bigger companies never did.", emoji: "🚀", tenure: "1 year" },
              ].map(t => (
                <Card key={t.name} className="border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <span className="text-3xl mb-3 block">{t.emoji}</span>
                    <p className="text-sm text-muted-foreground italic mb-4">"{t.quote}"</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{t.tenure}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Our Tech Stack</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: "React / TypeScript", category: "Frontend", emoji: "⚛️" },
                { name: "Supabase / PostgreSQL", category: "Backend", emoji: "🗄️" },
                { name: "Deno Edge Functions", category: "Serverless", emoji: "🦕" },
                { name: "Tailwind CSS", category: "Styling", emoji: "🎨" },
                { name: "Capacitor", category: "Mobile", emoji: "📱" },
                { name: "Stripe", category: "Payments", emoji: "💳" },
                { name: "Duffel API", category: "Flights", emoji: "✈️" },
                { name: "Vercel / Cloudflare", category: "Infra", emoji: "☁️" },
              ].map(s => (
                <div key={s.name} className="text-center p-4 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all">
                  <span className="text-2xl">{s.emoji}</span>
                  <p className="font-semibold text-sm mt-2">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.category}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Hiring Process */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Our Hiring Process</h2>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { step: 1, title: "Apply", desc: "Submit your resume and a short note about why ZIVO excites you", duration: "~5 min" },
                { step: 2, title: "Screen", desc: "Quick video call with our team to discuss your background", duration: "30 min" },
                { step: 3, title: "Challenge", desc: "A take-home or live coding/design exercise relevant to the role", duration: "2-4 hrs" },
                { step: 4, title: "Offer", desc: "Meet the team, align on compensation, and get started!", duration: "~1 week" },
              ].map(s => (
                <div key={s.step} className="text-center p-5 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
                  <p className="font-semibold mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{s.desc}</p>
                  <Badge variant="secondary" className="text-[10px]">{s.duration}</Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Company Stats */}
          <section className="mb-16">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-6">ZIVO by the Numbers</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                  {[
                    { stat: "50+", label: "Team Members", sub: "Across 12 countries" },
                    { stat: "6", label: "Product Lines", sub: "Flights, Hotels, Cars & more" },
                    { stat: "100%", label: "Remote-First", sub: "Work from anywhere" },
                    { stat: "4.8★", label: "Employee Rating", sub: "On Glassdoor" },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-3xl font-bold text-primary">{s.stat}</p>
                      <p className="font-semibold text-sm mt-1">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* === WAVE 14: Additional Career Content === */}

          {/* Day in the Life */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">A Day at ZIVO</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { time: "9:00 AM", activity: "Async standup via Slack — share progress, flag blockers", emoji: "☕" },
                { time: "10:30 AM", activity: "Deep work block — no meetings, full focus on building", emoji: "💻" },
                { time: "1:00 PM", activity: "Cross-team sync — product, design & engineering align", emoji: "🤝" },
                { time: "3:00 PM", activity: "Ship it! — deploy to prod, celebrate small wins", emoji: "🚀" },
              ].map(d => (
                <div key={d.time} className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center hover:border-primary/20 transition-all">
                  <span className="text-2xl">{d.emoji}</span>
                  <p className="text-xs font-bold text-primary mt-2">{d.time}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.activity}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Growth Paths */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Growth Paths</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { track: "Individual Contributor", levels: ["IC1 → Junior", "IC2 → Mid", "IC3 → Senior", "IC4 → Staff", "IC5 → Principal"], emoji: "🧑‍💻" },
                { track: "Management", levels: ["M1 → Team Lead", "M2 → Engineering Manager", "M3 → Director", "M4 → VP"], emoji: "👔" },
              ].map(t => (
                <Card key={t.track} className="border-border/50 hover:border-primary/20 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{t.emoji}</span>
                      <h3 className="font-bold text-sm">{t.track}</h3>
                    </div>
                    <div className="space-y-1">
                      {t.levels.map(l => (
                        <div key={l} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowRight className="w-3 h-3 text-primary" />
                          <span>{l}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* DEI Commitment */}
          <section className="mb-16">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Diversity & Inclusion</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
                  ZIVO is committed to building a diverse team. We believe different perspectives lead to better products for travelers worldwide.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { stat: "12+", label: "Countries represented" },
                    { stat: "44%", label: "Women in engineering" },
                    { stat: "30+", label: "Languages spoken" },
                    { stat: "100%", label: "Pay equity audited" },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-xl font-bold text-primary">{s.stat}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Contact Section */}
          <section className="text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent border border-primary/20">
            <Mail className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              Don't see a role that fits? We're always looking for exceptional 
              talent. Send us your resume and tell us how you'd contribute.
            </p>
            <Button size="lg" className="gap-2" asChild>
              <a href="mailto:careers@hizivo.com">
                <Mail className="w-4 h-4" />
                careers@hizivo.com
              </a>
            </Button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
