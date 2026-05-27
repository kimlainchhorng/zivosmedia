import { useState } from "react";
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Star, 
  Clock, 
  Users,
  Sparkles,
  ArrowRight,
  Camera,
  Utensils,
  Mountain,
  Waves,
  Building,
  Ticket,
  ExternalLink,
  Heart,
  TrendingUp,
  Zap,
  Globe,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  AFFILIATE_LINKS, 
  AFFILIATE_DISCLOSURE_TEXT, 
  openAffiliateLink,
  ACTIVITY_PARTNERS,
  openPartnerLink
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";
import { Link } from "react-router-dom";

const ThingsToDo = () => {
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "all", label: "All", icon: Sparkles },
    { id: "tours", label: "Tours", icon: Compass },
    { id: "attractions", label: "Attractions", icon: Ticket },
    { id: "outdoor", label: "Outdoor", icon: Mountain },
    { id: "food", label: "Food & Drink", icon: Utensils },
  ];

  // Featured experiences will be sourced from a real activities API
  // (Tiqets/Viator/etc.); empty until that integration ships so we never
  // display fabricated tours and prices.
  const featuredExperiences: Array<{
    id: number; title: string; location: string; category: string;
    rating: number; reviews: number; duration: string; priceFrom: number;
    image: string; badge: string; instant: boolean;
  }> = [];

  // Same as above — populated from a real activities feed once available.
  const popularActivities: Array<{
    id: number; title: string; location: string; category: string;
    rating: number; reviews: number; duration: string; priceFrom: number;
    image: string;
  }> = [];

  const handleBookActivity = () => {
    openAffiliateLink("activities");
  };

  const handlePartnerClick = (partner: typeof ACTIVITY_PARTNERS[0]) => {
    trackAffiliateClick({
      flightId: `activity-${partner.id}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: '',
      destination: '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'things_to_do_page',
      ctaType: 'result_card',
      serviceType: 'activities',
    });
    openPartnerLink(partner.trackingUrl);
  };

  // Partner descriptions for UI
  const activityPartnerCards = [
    {
      ...ACTIVITY_PARTNERS[0], // Tiqets
      tagline: 'Skip-the-Line Tickets',
      description: 'Museums, attractions & landmarks. Instant mobile tickets.',
      highlight: 'Skip the lines',
    },
    {
      ...ACTIVITY_PARTNERS[1], // WeGoTrip
      tagline: 'Audio Guides & Tours',
      description: 'Self-guided tours with audio narration. Explore at your pace.',
      highlight: 'Self-paced',
    },
    {
      ...ACTIVITY_PARTNERS[2], // TicketNetwork  
      tagline: 'Live Events & Shows',
      description: 'Concerts, sports, theater & live entertainment tickets.',
      highlight: 'Live events',
    },
  ];

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <Header />

      <main className="pt-16 sm:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 lg:py-28 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-radial via-transparent to-transparent opacity-60" />
          <div className="absolute top-1/3 left-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full blur-3xl bg-secondary" />
          <div className="absolute bottom-0 right-0 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-gradient-to-tl from-teal-500/12 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Badge className="mb-4 sm:mb-6 text-foreground border-border px-4 py-2 text-sm font-semibold bg-secondary">
                <Compass className="w-4 h-4 mr-2" />
                Powered by {AFFILIATE_LINKS.activities.name}
              </Badge>
              <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                Discover Amazing{" "}
                <span className="text-accent-foreground">
                  Things To Do
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Book tours, attractions, and unique experiences worldwide with instant confirmation.
              </p>
            </div>

            {/* Search Card */}
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <Card className="p-4 sm:p-6 lg:p-8 border-0 bg-gradient-to-br from-card/95 to-card shadow-2xl backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      placeholder="Where are you going?" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 sm:h-14 rounded-xl text-base bg-muted/30 border-border/50 focus:border-border" 
                    />
                  </div>
                  <div className="relative flex-1 sm:max-w-[200px]">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="date" 
                      className="pl-12 h-12 sm:h-14 rounded-xl bg-muted/30 border-border/50 focus:border-border" 
                    />
                  </div>
                  <Button 
                    onClick={handleBookActivity}
                    className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl text-primary-foreground shadow-lg hover:opacity-90 touch-manipulation active:scale-[0.98] bg-foreground"
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    Search Activities
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                {/* Affiliate Notice */}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {AFFILIATE_DISCLOSURE_TEXT.short}{" "}
                  <Link to="/affiliate-disclosure" className="text-foreground hover:underline">Learn more</Link>
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Featured Experiences — hidden until real activities feed exists */}
        {featuredExperiences.length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6 sm:mb-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Featured Experiences</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Hand-picked top-rated activities</p>
              </div>
              <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              {featuredExperiences.map((exp, index) => (
                <Card 
                  key={exp.id}
                  className="overflow-hidden border-0 bg-gradient-to-br from-card/90 to-card shadow-xl group cursor-pointer hover:shadow-2xl hover:transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={handleBookActivity}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={exp.image}
                      alt={exp.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="text-primary-foreground border-0 shadow-lg text-xs bg-foreground">
                        <Zap className="w-3 h-3 mr-1" />
                        {exp.badge}
                      </Badge>
                      {exp.instant && (
                        <Badge className="bg-emerald-500/90 text-primary-foreground border-0 shadow-lg text-xs">
                          Instant Confirm
                        </Badge>
                      )}
                    </div>
                    <button type="button" className="absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-secondary transition-all touch-manipulation">
                      <Heart className="h-4 w-4 text-primary-foreground" />
                    </button>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs text-primary-foreground/80 flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" />
                        {exp.location}
                      </p>
                      <h3 className="font-bold text-primary-foreground text-base sm:text-lg line-clamp-2">{exp.title}</h3>
                    </div>
                  </div>

                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-sm">{exp.rating}</span>
                        <span className="text-xs text-muted-foreground">({exp.reviews.toLocaleString()})</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {exp.duration}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">From</span>
                        <p className="text-2xl font-bold text-accent-foreground">
                          ${exp.priceFrom}
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        className="gap-1.5 text-primary-foreground rounded-xl touch-manipulation bg-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookActivity();
                        }}
                      >
                        Book Now
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Category Tabs & Popular Activities — hidden until real data exists */}
        {popularActivities.length > 0 && (
        <section className="py-10 sm:py-16 lg:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 mb-6 sm:mb-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Popular Activities</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Explore by category</p>
              </div>
              <Tabs value={category} onValueChange={setCategory}>
                <TabsList className="bg-background/80 p-1 sm:p-1.5 rounded-xl">
                  {categories.map((cat) => (
                    <TabsTrigger 
                      key={cat.id} 
                      value={cat.id} 
                      className="gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:data-[state=active]:data-[state=active]:data-[state=active]:text-primary-foreground touch-manipulation bg-foreground"
                    >
                      <cat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{cat.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {popularActivities
                .filter(act => category === "all" || act.category === category)
                .map((activity, index) => (
                <Card 
                  key={activity.id}
                  className="overflow-hidden border-0 bg-card shadow-lg group cursor-pointer hover:shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={handleBookActivity}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <button type="button" aria-label="Save to favorites" className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-secondary transition-all touch-manipulation">
                      <Heart className="h-3.5 w-3.5 text-primary-foreground" />
                    </button>
                  </div>

                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3" />
                      {activity.location}
                    </p>
                    <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2 group-hover:text-foreground transition-colors">
                      {activity.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-foreground">{activity.rating}</span>
                        <span>({activity.reviews.toLocaleString()})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.duration}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">From </span>
                        <span className="text-lg font-bold text-foreground">${activity.priceFrom}</span>
                      </div>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs rounded-xl border-border text-foreground hover:bg-secondary touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookActivity();
                        }}
                      >
                        View
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA to explore more */}
            <div className="text-center mt-10">
              <Button 
                size="lg"
                onClick={handleBookActivity}
                className="gap-2 text-primary-foreground shadow-lg rounded-xl touch-manipulation bg-foreground"
              >
                <Globe className="w-5 h-5" />
                Explore All Activities on Tiqets
                <ExternalLink className="w-4 h-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                {AFFILIATE_DISCLOSURE_TEXT.short}
              </p>
            </div>
          </div>
        </section>
        )}

        {/* Booking Partners Section */}
        <section className="py-10 sm:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-secondary text-foreground border-border">
                <Sparkles className="w-3 h-3 mr-1" />
                Trusted Partners
              </Badge>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
                Book From Our Partners
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Compare activities and tickets from top travel platforms
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {activityPartnerCards.map((partner, index) => (
                <Card 
                  key={partner.id}
                  className="group cursor-pointer border-border/50 hover:border-border hover:shadow-lg hover:transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handlePartnerClick(partner)}
                >
                  {index === 0 && (
                    <div className="text-primary-foreground text-center py-1 text-xs font-medium bg-foreground">
                      Most Popular
                    </div>
                  )}
                  
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-secondary">
                        {partner.logo}
                      </div>
                      <div>
                        <h3 className="font-bold text-base group-hover:text-foreground transition-colors">
                          {partner.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] border-border text-foreground">
                          {partner.tagline}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {partner.description}
                    </p>
                    
                    {/* Features */}
                    <div className="space-y-1.5 mb-4">
                      {partner.features.slice(0, 3).map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      size="sm"
                      className="w-full gap-2 text-primary-foreground hover:opacity-90 touch-manipulation bg-foreground"
                    >
                      <Ticket className="w-4 h-4" />
                      Browse Tickets
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6 max-w-lg mx-auto">
              {AFFILIATE_DISCLOSURE_TEXT.short}
            </p>
          </div>
        </section>

        {/* Why Book With Us */}
        <section className="py-10 sm:py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">Why Book Activities Through ZIVO?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: Zap, title: "Instant Confirmation", desc: "Get your tickets immediately" },
                { icon: Star, title: "Best Price Guarantee", desc: "Competitive prices worldwide" },
                { icon: Users, title: "Trusted Reviews", desc: "Millions of verified reviews" },
                { icon: Globe, title: "24/7 Support", desc: "Help when you need it" },
              ].map((feature, i) => (
                <Card key={i} className="p-5 sm:p-6 text-center bg-gradient-to-br from-card to-muted/30 border-0">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-secondary">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-bold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Affiliate Disclosure Banner */}
        <section className="py-6 bg-secondary border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
              <ExternalLink className="w-5 h-5 text-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                {AFFILIATE_DISCLOSURE_TEXT.detailed}{" "}
                <Link to="/affiliate-disclosure" className="text-foreground hover:underline font-medium">View full disclosure</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ThingsToDo;