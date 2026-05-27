/**
 * Roadmap - Public product roadmap page
 */

import { Helmet } from "react-helmet-async";
import {
  Sparkles,
  Rocket,
  Calendar,
  CheckCircle2,
  Clock,
  Lightbulb,
  Smartphone,
  Brain,
  Globe2,
  Users,
  CreditCard,
  Plane,
  Building2,
  Car,
  Gift,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type RoadmapStatus = "completed" | "in_progress" | "coming_soon" | "planned";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  status: RoadmapStatus;
  category: string;
  quarter?: string;
  votes?: number;
}

const statusConfig: Record<RoadmapStatus, { label: string; color: string }> = {
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  coming_soon: {
    label: "Coming Soon",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  planned: {
    label: "Planned",
    color: "bg-muted text-muted-foreground",
  },
};

const roadmapItems: RoadmapItem[] = [
  // Now - In Progress
  {
    id: "miles-expansion",
    title: "ZIVO Miles Expansion",
    description: "Earn and redeem miles across all travel categories with enhanced rewards",
    icon: Gift,
    status: "in_progress",
    category: "Rewards",
    quarter: "Q1 2024",
  },
  {
    id: "corporate-portal",
    title: "Corporate Travel Portal",
    description: "Full-featured business travel management with policy controls and reporting",
    icon: Building2,
    status: "in_progress",
    category: "Business",
    quarter: "Q1 2024",
  },
  {
    id: "multi-currency",
    title: "Multi-Currency Support",
    description: "Book and pay in your local currency with real-time exchange rates",
    icon: CreditCard,
    status: "in_progress",
    category: "Global",
    quarter: "Q1 2024",
  },

  // Next - Coming Soon
  {
    id: "mobile-apps",
    title: "Mobile App Enhancements",
    description: "Enhanced mobile experience with offline access and push notifications",
    icon: Smartphone,
    status: "coming_soon",
    category: "Platform",
    quarter: "Q2 2024",
    votes: 342,
  },
  {
    id: "ai-trip-planner",
    title: "AI Trip Planner",
    description: "Get personalized trip recommendations powered by AI",
    icon: Brain,
    status: "coming_soon",
    category: "Features",
    quarter: "Q2 2024",
    votes: 256,
  },
  {
    id: "group-discounts",
    title: "Group Booking Discounts",
    description: "Automatic discounts for group travel with 6+ travelers",
    icon: Users,
    status: "coming_soon",
    category: "Pricing",
    quarter: "Q2 2024",
    votes: 189,
  },

  // Future - Planned
  {
    id: "multi-city",
    title: "Multi-City Booking",
    description: "Book complex multi-city itineraries in a single transaction",
    icon: Plane,
    status: "planned",
    category: "Features",
    votes: 423,
  },
  {
    id: "car-subscriptions",
    title: "Car Rental Subscriptions",
    description: "Monthly car rental plans for frequent travelers",
    icon: Car,
    status: "planned",
    category: "Products",
    votes: 156,
  },
  {
    id: "global-expansion",
    title: "APAC & LATAM Expansion",
    description: "Localized experience for Asia-Pacific and Latin America",
    icon: Globe2,
    status: "planned",
    category: "Global",
    votes: 234,
  },
  {
    id: "travel-chat",
    title: "In-App Travel Chat",
    description: "Real-time support and travel assistance via chat",
    icon: MessageSquare,
    status: "planned",
    category: "Support",
    votes: 178,
  },
];

const completedItems: RoadmapItem[] = [
  {
    id: "flight-search",
    title: "Real-Time Flight Search",
    description: "Search and compare flights from 500+ airlines",
    icon: Plane,
    status: "completed",
    category: "Features",
  },
  {
    id: "hotel-booking",
    title: "Hotel Booking",
    description: "Book from 1M+ hotel properties worldwide",
    icon: Building2,
    status: "completed",
    category: "Features",
  },
  {
    id: "miles-program",
    title: "ZIVO Miles Program",
    description: "Earn miles on every booking",
    icon: Gift,
    status: "completed",
    category: "Rewards",
  },
];

export default function Roadmap() {
  const groupedItems = {
    now: roadmapItems.filter((i) => i.status === "in_progress"),
    next: roadmapItems.filter((i) => i.status === "coming_soon"),
    future: roadmapItems.filter((i) => i.status === "planned"),
  };

  return (
    <>
      <Helmet>
        <title>Product Roadmap | ZIVO</title>
        <meta
          name="description"
          content="See what's coming next at ZIVO. Our public roadmap shows features we're building and what's planned for the future."
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative py-16 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-2xl mx-auto text-center">
              <Badge className="mb-4">
                <Rocket className="w-3 h-3 mr-1" />
                Product Roadmap
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                What We're Building
              </h1>
              <p className="text-lg text-muted-foreground">
                A look at what's in progress, coming soon, and planned for the future.
                Your feedback shapes our priorities.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap Sections */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4">
            {/* Now - In Progress */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Now</h2>
                  <p className="text-muted-foreground">Currently in development</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedItems.now.map((item) => (
                  <RoadmapCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Next - Coming Soon */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Next</h2>
                  <p className="text-muted-foreground">Coming in the next quarter</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedItems.next.map((item) => (
                  <RoadmapCard key={item.id} item={item} showVotes />
                ))}
              </div>
            </div>

            {/* Future - Planned */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Future</h2>
                  <p className="text-muted-foreground">On our long-term roadmap</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {groupedItems.future.map((item) => (
                  <RoadmapCard key={item.id} item={item} compact showVotes />
                ))}
              </div>
            </div>

            {/* Recently Completed */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Recently Shipped</h2>
                  <p className="text-muted-foreground">Features we've launched</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {completedItems.map((item) => (
                   <div
                    key={item.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* === WAVE 9: Rich Roadmap Content === */}

        {/* Development Stats */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Development Velocity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { stat: "47", label: "Features Shipped", sub: "Last 6 months", emoji: "🚀" },
                { stat: "12", label: "In Progress", sub: "Active sprint", emoji: "⚡" },
                { stat: "98.5%", label: "Uptime", sub: "Last 90 days", emoji: "✅" },
                { stat: "2.3s", label: "Avg Load Time", sub: "Global P95", emoji: "⏱️" },
              ].map(s => (
                <div key={s.label} className="text-center p-5 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                  <span className="text-2xl">{s.emoji}</span>
                  <p className="text-2xl font-bold text-primary mt-2">{s.stat}</p>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Requested Features */}
        <section className="py-12 sm:py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">Most Requested by Community</h2>
            <div className="space-y-3">
              {[
                { feature: "Flexible date search across ±3 days", votes: 523, status: "Under Review", emoji: "📅" },
                { feature: "Price alerts via WhatsApp", votes: 412, status: "Planned", emoji: "💬" },
                { feature: "Dark mode improvements", votes: 387, status: "In Progress", emoji: "🌙" },
                { feature: "Apple Pay & Google Pay for all services", votes: 356, status: "Coming Soon", emoji: "📱" },
                { feature: "Saved itinerary sharing", votes: 298, status: "Under Review", emoji: "🔗" },
                { feature: "Airport lounge access with ZIVO+", votes: 267, status: "Planned", emoji: "🛋️" },
              ].map(f => (
                <div key={f.feature} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                  <span className="text-xl">{f.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{f.feature}</p>
                    <p className="text-[10px] text-muted-foreground">{f.votes} community votes</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{f.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Changelog Preview */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">Recent Changelog</h2>
            <div className="space-y-4">
              {[
                { version: "v3.2.0", date: "Feb 20, 2025", changes: ["Multi-city flight search", "Hotel price comparison widget", "Improved mobile booking flow", "Bug fixes & performance improvements"] },
                { version: "v3.1.0", date: "Feb 5, 2025", changes: ["ZIVO Rides real-time tracking", "New fare calendar for flights", "Push notification preferences", "Car rental insurance options"] },
                { version: "v3.0.0", date: "Jan 15, 2025", changes: ["Complete UI redesign", "ZIVO Miles loyalty program", "AI Trip Planner beta", "Dark mode support"] },
              ].map(v => (
                <Card key={v.version} className="border-border/50 hover:border-primary/20 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-primary/10 text-primary border-primary/20">{v.version}</Badge>
                      <span className="text-xs text-muted-foreground">{v.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {v.changes.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* === WAVE 15: Additional Roadmap Content === */}

        {/* Tech Architecture Preview */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">Behind the Build</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { metric: "99.9%", label: "Target Uptime SLA", detail: "Multi-region failover", emoji: "🛡️" },
                { metric: "<200ms", label: "API Response Time", detail: "Edge-cached globally", emoji: "⚡" },
                { metric: "CI/CD", label: "Continuous Delivery", detail: "Ship multiple times/day", emoji: "🔄" },
              ].map(m => (
                <div key={m.label} className="text-center p-5 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                  <span className="text-2xl">{m.emoji}</span>
                  <p className="text-xl font-bold text-primary mt-2">{m.metric}</p>
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Principles */}
        <section className="py-12 sm:py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">How We Decide What to Build</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { principle: "User Impact First", desc: "We prioritize features that directly improve the traveler experience over internal tooling.", emoji: "👤" },
                { principle: "Data-Driven Decisions", desc: "Every feature is validated with usage analytics and A/B testing before full rollout.", emoji: "📊" },
                { principle: "Community Voted", desc: "Top community-requested features get prioritized in our quarterly planning.", emoji: "🗳️" },
                { principle: "Security by Default", desc: "Every new feature undergoes security review before shipping to production.", emoji: "🔒" },
              ].map(p => (
                <div key={p.principle} className="p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{p.emoji}</span>
                    <span className="font-bold text-sm">{p.principle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quarterly Themes */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-8">2025 Quarterly Themes</h2>
            <div className="grid sm:grid-cols-4 gap-3">
              {[
                { quarter: "Q1", theme: "Foundation", focus: "Performance, reliability, search accuracy", emoji: "🏗️", active: true },
                { quarter: "Q2", theme: "Expansion", focus: "Mobile apps, new markets, partner growth", emoji: "🌱", active: false },
                { quarter: "Q3", theme: "Intelligence", focus: "AI trip planning v2, price predictions", emoji: "🧠", active: false },
                { quarter: "Q4", theme: "Enterprise", focus: "Corporate portal, group tools, API", emoji: "🏢", active: false },
              ].map(q => (
                <div key={q.quarter} className={`text-center p-4 rounded-xl border ${q.active ? "border-primary/30 bg-primary/5" : "border-border/50"} transition-all`}>
                  <Badge variant={q.active ? "default" : "secondary"} className="text-[9px] mb-2">{q.quarter}</Badge>
                  <p className="font-bold text-sm">{q.theme}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{q.focus}</p>
                  <span className="text-xl mt-2 block">{q.emoji}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feedback CTA */}
        <section className="py-12 sm:py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Have a Feature Request?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              We build ZIVO based on your feedback. Let us know what features would make
              your travel experience better.
            </p>
            <Button asChild className="gap-2 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)] transition-shadow">
              <Link to="/feedback">
                <Lightbulb className="w-4 h-4" />
                Submit Feedback
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function RoadmapCard({
  item,
  compact = false,
  showVotes = false,
}: {
  item: RoadmapItem;
  compact?: boolean;
  showVotes?: boolean;
}) {
  const status = statusConfig[item.status];

  if (compact) {
    return (
      <Card className="hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </p>
              {showVotes && item.votes && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{item.votes} votes</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <item.icon className="w-5 h-5 text-primary" />
          </div>
          <Badge className={cn("shrink-0", status.color)}>{status.label}</Badge>
        </div>
        <CardTitle className="text-lg mt-3">{item.title}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <Badge variant="outline">{item.category}</Badge>
          {item.quarter && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {item.quarter}
            </span>
          )}
          {showVotes && item.votes && (
            <span className="text-muted-foreground flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {item.votes}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
