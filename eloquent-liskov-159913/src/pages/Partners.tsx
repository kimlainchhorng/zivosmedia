import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Handshake,
  Mail,
  Plane,
  Hotel,
  Car,
  MapPin,
  Ticket,
  CheckCircle2,
  TrendingUp,
  Shield,
} from "lucide-react";

export default function Partners() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Partners | ZIVO"
        description="Partner with ZIVO to reach qualified travel shoppers. We send ready-to-book traffic to airlines, hotels, car rental companies, and travel services."
        canonical="https://hizivo.com/partners"
      />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Handshake className="w-3 h-3 mr-1" />
              Partner Program
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Partners
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              ZIVO is a travel search and comparison platform that connects users with trusted travel partners worldwide.
            </p>
          </div>

          {/* We help travelers discover */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">We help travelers discover and compare:</h2>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-muted-foreground p-3 rounded-xl hover:bg-muted/40 transition-colors">
                <Plane className="w-5 h-5 text-primary" />
                Flights
              </li>
              <li className="flex items-center gap-3 text-muted-foreground p-3 rounded-xl hover:bg-muted/40 transition-colors">
                <Hotel className="w-5 h-5 text-primary" />
                Hotels & accommodations
              </li>
              <li className="flex items-center gap-3 text-muted-foreground p-3 rounded-xl hover:bg-muted/40 transition-colors">
                <Car className="w-5 h-5 text-primary" />
                Car rentals
              </li>
              <li className="flex items-center gap-3 text-muted-foreground p-3 rounded-xl hover:bg-muted/40 transition-colors">
                <MapPin className="w-5 h-5 text-primary" />
                Airport transfers
              </li>
              <li className="flex items-center gap-3 text-muted-foreground p-3 rounded-xl hover:bg-muted/40 transition-colors">
                <Ticket className="w-5 h-5 text-primary" />
                Activities & travel services
              </li>
            </ul>
          </div>

          {/* Important Disclosure */}
          <div className="mb-12 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-medium mb-2">
                  ZIVO does not sell travel products, issue tickets, or process payments.
                </p>
                <p className="text-muted-foreground">
                  All bookings are completed securely on our partners' websites.
                </p>
              </div>
            </div>
          </div>

          {/* How we work with partners */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">How we work with partners:</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                We send high-intent users who are actively searching and comparing
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                We do not interfere with partner checkout or pricing
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                We focus on transparency and compliance
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                We clearly disclose affiliate relationships
              </li>
            </ul>
          </div>

          {/* Traffic sources */}
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">Traffic sources used by ZIVO:</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-muted-foreground">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Organic search (SEO)
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Direct traffic
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Social media
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                Email notifications (opt-in only)
              </li>
            </ul>
            <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
              <p className="text-sm text-muted-foreground font-medium mb-2">We do NOT use:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Incentivized traffic</li>
                <li>- Trademark bidding</li>
                <li>- Spam or pop-ups</li>
              </ul>
            </div>
          </div>

          {/* Partner Description - Standard Answer */}
          <div className="mb-12 p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <h2 className="text-lg font-bold mb-4">About ZIVO (Partner Description)</h2>
            <p className="text-muted-foreground leading-relaxed">
              "ZIVO is a travel search and booking platform that compares flights, hotels, and car rentals 
              from licensed travel providers. ZIVO acts as a booking facilitator and sub-agent. 
              All bookings are fulfilled by authorized partners."
            </p>
          </div>

          {/* Launch Status */}
          <div className="mb-12 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Launch Status
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Yes, the site is live in soft-launch mode with real users and compliant traffic sources.
            </p>
          </div>

          {/* Contact CTA */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-teal-500/10 border border-primary/20 text-center mb-12">
            <p className="text-lg text-foreground mb-6">
              If you're interested in partnering with ZIVO, please contact us:
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-teal-400 gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-shadow"
              onClick={() => window.location.href = "mailto:kimlain@hizivo.com"}
            >
              <Mail className="w-5 h-5" />
              kimlain@hizivo.com
            </Button>
          </div>

          {/* === WAVE 13: Rich Partner Content === */}

          {/* Partner Network Stats */}
          <div className="mb-12 p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <h3 className="font-bold text-lg text-center mb-6">Our Partner Network</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { stat: "500+", label: "Airline partners", emoji: "✈️" },
                { stat: "1M+", label: "Hotel properties", emoji: "🏨" },
                { stat: "80+", label: "Car rental brands", emoji: "🚗" },
                { stat: "45+", label: "Countries covered", emoji: "🌍" },
              ].map(s => (
                <div key={s.label}>
                  <span className="text-xl">{s.emoji}</span>
                  <p className="text-xl font-bold text-primary mt-1">{s.stat}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Integration Types */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-4">Integration Options</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { type: "API Integration", desc: "Direct API connection for real-time availability and pricing.", badge: "Most Popular", emoji: "⚡" },
                { type: "Affiliate Network", desc: "Connect through major networks (CJ, Impact, Partnerize).", badge: "Easy Setup", emoji: "🔗" },
                { type: "White Label", desc: "Embedded booking widgets on ZIVO with your branding.", badge: "Premium", emoji: "🏷️" },
                { type: "Data Feed", desc: "Automated inventory feeds via XML/JSON for OTAs.", badge: "Flexible", emoji: "📊" },
              ].map(i => (
                <div key={i.type} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{i.emoji}</span>
                    <span className="font-bold text-sm">{i.type}</span>
                    <Badge variant="secondary" className="text-[9px] ml-auto">{i.badge}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{i.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why Partner with ZIVO */}
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-4">Why Partner with ZIVO?</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { benefit: "High-Intent Traffic", desc: "Users actively searching and ready to book", icon: TrendingUp },
                { benefit: "Transparent Reporting", desc: "Real-time dashboards with conversions", icon: CheckCircle2 },
                { benefit: "Compliance First", desc: "Full FTC disclosure, clean traffic only", icon: Shield },
              ].map(b => (
                <div key={b.benefit} className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all text-center">
                  <b.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-bold text-sm">{b.benefit}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partner FAQ */}
          <div>
            <h3 className="text-lg font-bold mb-4">Partner FAQ</h3>
            <div className="space-y-2">
              {[
                { q: "What commission model does ZIVO use?", a: "CPA and CPC models depending on vertical and partner preference." },
                { q: "How quickly can we get set up?", a: "Affiliate networks: 24-48 hours. Direct API: 1-2 weeks." },
                { q: "Does ZIVO do trademark bidding?", a: "No. We never bid on partner brand names in paid search." },
                { q: "What reporting do you provide?", a: "Real-time dashboard with CTR, conversion metrics, and revenue breakdowns." },
              ].map(f => (
                <div key={f.q} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <p className="text-sm font-bold">{f.q}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
