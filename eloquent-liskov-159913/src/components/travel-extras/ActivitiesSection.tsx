import { Ticket, MapPin, Star, ExternalLink, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ACTIVITY_PARTNERS, 
  AFFILIATE_DISCLOSURE_TEXT,
  openPartnerLink 
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";

interface ActivitiesSectionProps {
  className?: string;
  destination?: string;
}

export default function ActivitiesSection({ className = '', destination }: ActivitiesSectionProps) {
  const handlePartnerClick = (partner: typeof ACTIVITY_PARTNERS[0]) => {
    trackAffiliateClick({
      flightId: `activity-${destination || 'general'}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: '',
      destination: destination || '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'activities_section',
      ctaType: 'cross_sell',
      serviceType: 'activities',
    });
    
    openPartnerLink(partner.trackingUrl, {
      partnerId: partner.id,
      partnerName: partner.name,
      product: 'activities',
      pageSource: 'activities-section',
    });
  };

  const activityCards = [
    {
      ...ACTIVITY_PARTNERS[0], // Tiqets
      tagline: 'Skip-the-Line',
      description: 'Book tickets to top attractions and museums. Skip the queues with mobile vouchers.',
      highlight: 'Most Popular',
    },
    {
      ...ACTIVITY_PARTNERS[1], // WeGoTrip
      tagline: 'Self-Guided Tours',
      description: 'Explore at your own pace with audio guides and unique walking tours.',
      highlight: 'Audio Guides',
    },
    {
      ...ACTIVITY_PARTNERS[2], // TicketNetwork
      tagline: 'Live Events',
      description: 'Get tickets to concerts, sports, theater, and live entertainment.',
      highlight: 'Sports & Concerts',
    },
  ];

  return (
    <section className={`py-10 sm:py-14 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
            <Ticket className="w-3 h-3 mr-1" />
            Things To Do
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {destination ? `Discover ${destination}` : 'Explore Activities & Tours'}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Book tours, attractions, and unique experiences from trusted partners.
          </p>
        </div>

        {/* Activity Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {activityCards.map((provider, index) => (
            <Card 
              key={provider.id}
              className="group cursor-pointer border-border/50 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 active:scale-[0.98] touch-manipulation"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handlePartnerClick(provider)}
            >
              {index === 0 && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground text-center py-1 text-xs font-medium">
                  Recommended
                </div>
              )}
              
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {provider.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-base group-hover:text-emerald-500 transition-all duration-200">
                        {provider.name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                        {provider.tagline}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {provider.description}
                </p>
                
                {/* Features */}
                <div className="space-y-1.5 mb-4">
                  {provider.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  size="sm"
                  className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground hover:opacity-90 touch-manipulation rounded-xl active:scale-[0.97] transition-all duration-200 min-h-[40px] shadow-sm"
                >
                  <Ticket className="w-4 h-4" />
                  Explore Activities
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>1000+ Cities</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-amber-500" />
            <span>Instant Tickets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-foreground" />
            <span>Verified Reviews</span>
          </div>
        </div>

        {/* Disclosure */}
        <p className="text-xs text-muted-foreground text-center mt-6 max-w-lg mx-auto">
          {AFFILIATE_DISCLOSURE_TEXT.short}
        </p>
      </div>
    </section>
  );
}
