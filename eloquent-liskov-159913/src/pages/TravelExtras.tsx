/**
 * TRAVEL EXTRAS PAGE - /extras
 * EXCLUSIVE CENTRALIZED HUB for all travel add-on partner links
 * All partner links are consolidated here - NOT scattered on other pages
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Ticket, 
  Car, 
  Wifi, 
  Luggage, 
  Scale,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Shield,
  Clock,
  Globe,
  Headphones,
  Search,
  MapPin,
  Plane,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildOutboundURL } from "@/lib/outboundTracking";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalTrustBar from "@/components/shared/GlobalTrustBar";
import heroExtras from "@/assets/hero-extras.jpg";

// Import partner thumbnail images
import extrasActivities from "@/assets/extras-activities.jpg";
import extrasMuseums from "@/assets/extras-museums.jpg";
import extrasTransfers from "@/assets/extras-transfers.jpg";
import extrasEsim from "@/assets/extras-esim.jpg";
import extrasLuggage from "@/assets/extras-luggage.jpg";
import extrasAudiotours from "@/assets/extras-audiotours.jpg";
import extrasCompensation from "@/assets/extras-compensation.jpg";
import extrasRadar from "@/assets/extras-radar.jpg";
import extrasTickets from "@/assets/extras-tickets.jpg";

// ============================================
// EXTRAS PARTNERS REGISTRY - ALL PARTNERS
// Consolidated partner links - the ONLY place for extras CTAs
// ============================================
interface ExtrasPartner {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: LucideIcon;
  thumbnail: string;
  trackingUrl: string;
  gradient: string;
  borderHover: string;
}

const EXTRAS_PARTNERS: ExtrasPartner[] = [
  {
    id: 'tiqets',
    name: 'Tiqets',
    category: 'Museums & Attractions',
    description: 'Skip-the-line museum tickets',
    icon: Ticket,
    thumbnail: extrasMuseums,
    trackingUrl: 'https://tiqets.tpo.li/5fqrcQWZ',
    gradient: 'from-violet-500/10 to-purple-500/10',
    borderHover: 'hover:border-violet-500/50',
  },
  {
    id: 'kiwitaxi',
    name: 'KiwiTaxi',
    category: 'Airport Transfers',
    description: 'Fixed-price airport pickups',
    icon: Car,
    thumbnail: extrasTransfers,
    trackingUrl: 'https://kiwitaxi.tpo.li/Bj6zghJH',
    gradient: 'from-amber-500/10 to-orange-500/10',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    id: 'gettransfer',
    name: 'GetTransfer',
    category: 'Transfers Marketplace',
    description: 'Compare local transfer drivers',
    icon: Car,
    thumbnail: extrasTransfers,
    trackingUrl: 'https://gettransfer.tpo.li/FbrIguyh',
    gradient: 'from-amber-500/10 to-orange-500/10',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    id: 'intui',
    name: 'Intui.travel',
    category: 'Group Transfers',
    description: 'Shuttle & group transfer services',
    icon: Car,
    thumbnail: extrasTransfers,
    trackingUrl: 'https://intui.tpo.li/CgNTdSyh',
    gradient: 'from-amber-500/10 to-orange-500/10',
    borderHover: 'hover:border-amber-500/50',
  },
  {
    id: 'airalo',
    name: 'Airalo',
    category: 'eSIM',
    description: 'Instant eSIM for 190+ countries',
    icon: Wifi,
    thumbnail: extrasEsim,
    trackingUrl: 'https://airalo.tpo.li/zVRtp8Zt',
    gradient: 'from-cyan-500/10 to-blue-500/10',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    id: 'yesim',
    name: 'Yesim',
    category: 'eSIM',
    description: 'Budget-friendly travel eSIM',
    icon: Wifi,
    thumbnail: extrasEsim,
    trackingUrl: 'https://yesim.tpo.li/OpjeHJgH',
    gradient: 'from-cyan-500/10 to-blue-500/10',
    borderHover: 'hover:border-cyan-500/50',
  },
  {
    id: 'drimsim',
    name: 'Drimsim',
    category: 'SIM',
    description: 'Global SIM card with data',
    icon: Globe,
    thumbnail: extrasEsim,
    trackingUrl: 'https://drimsim.tpo.li/A9yKO5oA',
    gradient: 'from-sky-500/10 to-indigo-500/10',
    borderHover: 'hover:border-sky-500/50',
  },
  {
    id: 'radicalstorage',
    name: 'Radical Storage',
    category: 'Luggage Storage',
    description: 'Store bags from $5.90/day',
    icon: Luggage,
    thumbnail: extrasLuggage,
    trackingUrl: 'https://radicalstorage.tpo.li/4W0KR99h',
    gradient: 'from-purple-500/10 to-pink-500/10',
    borderHover: 'hover:border-purple-500/50',
  },
  {
    id: 'wegotrip',
    name: 'WeGoTrip',
    category: 'Audio Tours',
    description: 'Self-guided audio experiences',
    icon: Headphones,
    thumbnail: extrasAudiotours,
    trackingUrl: 'https://wegotrip.tpo.li/QSrOpIdV',
    gradient: 'from-rose-500/10 to-pink-500/10',
    borderHover: 'hover:border-rose-500/50',
  },
  {
    id: 'airhelp',
    name: 'AirHelp',
    category: 'Flight Compensation',
    description: 'Claim up to €600 for delays',
    icon: Scale,
    thumbnail: extrasCompensation,
    trackingUrl: 'https://airhelp.tpo.li/7Z5saPi2',
    gradient: 'from-red-500/10 to-rose-500/10',
    borderHover: 'hover:border-red-500/50',
  },
  {
    id: 'compensair',
    name: 'Compensair',
    category: 'Flight Compensation',
    description: 'Free flight compensation check',
    icon: Plane,
    thumbnail: extrasCompensation,
    trackingUrl: 'https://compensair.tpo.li/npsp8pm0',
    gradient: 'from-red-500/10 to-rose-500/10',
    borderHover: 'hover:border-red-500/50',
  },
  {
    id: 'searadar',
    name: 'Searadar',
    category: 'Travel Radar',
    description: 'Compare all travel options',
    icon: Search,
    thumbnail: extrasRadar,
    trackingUrl: 'https://searadar.tpo.li/iAbLlX9i',
    gradient: 'from-indigo-500/10 to-violet-500/10',
    borderHover: 'hover:border-indigo-500/50',
  },
  {
    id: 'ticketnetwork',
    name: 'TicketNetwork',
    category: 'Tickets Marketplace',
    description: 'Concerts, sports, live events',
    icon: Ticket,
    thumbnail: extrasTickets,
    trackingUrl: 'https://ticketnetwork.tpo.li/utk3u8Vr',
    gradient: 'from-fuchsia-500/10 to-pink-500/10',
    borderHover: 'hover:border-fuchsia-500/50',
  },
  {
    id: 'ektatraveling',
    name: 'EktaTraveling',
    category: 'Travel Services',
    description: 'Comprehensive travel solutions',
    icon: Globe,
    thumbnail: extrasRadar,
    trackingUrl: 'https://ektatraveling.tpo.li/ZEbsBsKY',
    gradient: 'from-teal-500/10 to-emerald-500/10',
    borderHover: 'hover:border-teal-500/50',
  },
];

export default function TravelExtras() {
  const [city, setCity] = useState('');

  return (
    <>
      <SEOHead
        title="Travel Extras - Tours, Transfers, eSIM & More | ZIVO"
        description="Enhance your trip with trusted travel partners. Book tours, airport transfers, eSIM, luggage storage, and more on partner websites."
        canonical="/extras"
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 pt-20">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={heroExtras}
                alt="Travel extras and services"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
            </div>
            
            <div className="relative container mx-auto px-4 py-16 sm:py-20">
              <div className="max-w-3xl mx-auto text-center">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Travel Add-Ons
                </Badge>
                
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                  ZIVO{" "}
                  <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                    Extras
                  </span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  Tours, transfers, eSIM, luggage storage, and travel services — book on trusted partner sites.
                </p>
                
                {/* Optional City Input */}
                <div className="max-w-sm mx-auto">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Traveling to (city)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10 h-12 bg-background/80 backdrop-blur-sm border-border/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Optional: helps us personalize your experience
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Global Trust Bar */}
          <GlobalTrustBar variant="compact" />

          {/* Partner Grid - All Partners */}
          <section className="py-12 sm:py-16">
            <div className="container mx-auto px-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
                <TooltipProvider>
                  {EXTRAS_PARTNERS.map((partner, index) => {
                    // Build the tracked outbound URL
                    const outboundUrl = buildOutboundURL(
                      partner.id,
                      partner.name,
                      'extras',
                      'extras',
                      partner.trackingUrl
                    );
                    
                    return (
                      <Tooltip key={partner.id}>
                        <TooltipTrigger asChild>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.preventDefault(); import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(outboundUrl)); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(outboundUrl));
                              }
                            }}
                            className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius)]"
                          >
                            <Card
                              className={cn(
                                "group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-border/50 h-full",
                                partner.borderHover,
                                "animate-in fade-in slide-in-from-bottom-4"
                              )}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <CardContent className="p-0 overflow-hidden">
                                {/* Thumbnail Image */}
                                <div className="relative h-28 overflow-hidden">
                                  <img
                                    src={partner.thumbnail}
                                    alt={partner.category}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                                  {/* Icon Badge */}
                                  <div className="absolute bottom-2 left-3 w-10 h-10 rounded-xl bg-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50">
                                    <partner.icon className="w-5 h-5 text-foreground/70" />
                                  </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-4">
                                  <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">
                                    {partner.category}
                                  </p>
                                  <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
                                    {partner.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                    {partner.description}
                                  </p>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full gap-2 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors touch-manipulation pointer-events-none"
                                    tabIndex={-1}
                                  >
                                    Explore
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>You will be redirected to a partner site.</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>
          </section>

          {/* Trust Indicators */}
          <section className="py-8 border-t border-border/50 bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Trusted partners</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Instant confirmation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-foreground" />
                  <span>Worldwide coverage</span>
                </div>
              </div>
            </div>
          </section>

          {/* Affiliate Disclosure Footer */}
          <section className="py-10 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  ZIVO may earn a commission when users book through partner links.
                  <br />
                  Bookings are completed on partner websites.
                </p>
              </div>
            </div>
          </section>

          {/* Back to Travel CTA */}
          <section className="py-8 border-t border-border bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <p className="text-sm text-muted-foreground">Looking for travel?</p>
                <div className="flex gap-2">
                  <Link to="/flights">
                    <Button variant="outline" size="sm" className="gap-2">
                      Flights <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                  <Link to="/hotels">
                    <Button variant="outline" size="sm" className="gap-2">
                      Hotels <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                  <Link to="/rent-car">
                    <Button variant="outline" size="sm" className="gap-2">
                      Cars <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
