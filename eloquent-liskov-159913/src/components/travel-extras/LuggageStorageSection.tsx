import { Luggage, MapPin, Shield, Clock, ExternalLink, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LUGGAGE_PARTNERS, 
  AFFILIATE_DISCLOSURE_TEXT,
  openPartnerLink 
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";

interface LuggageStorageSectionProps {
  className?: string;
  destination?: string;
}

export default function LuggageStorageSection({ className = '', destination }: LuggageStorageSectionProps) {
  const partner = LUGGAGE_PARTNERS[0]; // Radical Storage
  
  const handleClick = () => {
    trackAffiliateClick({
      flightId: `luggage-${destination || 'general'}`,
      airline: partner.name,
      airlineCode: 'LUGGAGE',
      origin: destination || '',
      destination: destination || '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'luggage_section',
      ctaType: 'cross_sell',
      serviceType: 'luggage',
    });
    
    openPartnerLink(partner.trackingUrl);
  };

  const benefits = [
    { icon: DollarSign, label: '$5.90/day flat rate', color: 'text-emerald-500' },
    { icon: MapPin, label: '400+ cities worldwide', color: 'text-sky-500' },
    { icon: Shield, label: 'Up to $3,000 insurance', color: 'text-amber-500' },
    { icon: Clock, label: 'Flexible hours', color: 'text-purple-500' },
  ];

  return (
    <section className={`py-10 sm:py-14 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Card 
            className="overflow-hidden border-border/50 hover:border-border hover:shadow-xl hover:transition-all duration-200 cursor-pointer group active:scale-[0.99] touch-manipulation rounded-2xl"
            onClick={handleClick}
          >
            {/* Top Banner */}
            <div className="text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm bg-foreground">
              <Luggage className="w-4 h-4" />
              <span className="font-medium">Travel Extras • Luggage Storage</span>
            </div>
            
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform bg-secondary">
                  <Luggage className="w-10 h-10 text-foreground" />
                </div>
                
                <div className="flex-1 text-center sm:text-left">
                  <Badge className="mb-2 bg-secondary text-foreground border-border">
                    Radical Storage
                  </Badge>
                  <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                    Store Your Bags, Explore Freely
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Don't let heavy luggage slow you down. Store bags securely at local shops, hotels, and stations while you explore.
                  </p>
                  
                  {/* Benefits Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {benefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <benefit.icon className={`w-4 h-4 ${benefit.color} shrink-0`} />
                        <span className="text-muted-foreground">{benefit.label}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    size="lg"
                    className="gap-2 text-primary-foreground hover:opacity-90 touch-manipulation rounded-xl active:scale-[0.97] transition-all duration-200 shadow-md bg-foreground"
                  >
                    <Luggage className="w-5 h-5" />
                    Find Storage Near You
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Disclosure */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            {AFFILIATE_DISCLOSURE_TEXT.short}
          </p>
        </div>
      </div>
    </section>
  );
}
