import { Wifi, Globe, Smartphone, Zap, ExternalLink, Check, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ESIM_PARTNERS, 
  AFFILIATE_DISCLOSURE_TEXT,
  openPartnerLink 
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";

interface TravelEsimSectionProps {
  className?: string;
}

export default function TravelEsimSection({ className = '' }: TravelEsimSectionProps) {
  const handlePartnerClick = (partner: typeof ESIM_PARTNERS[0]) => {
    trackAffiliateClick({
      flightId: `esim-${partner.id}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: '',
      destination: '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'esim_section',
      ctaType: 'cross_sell',
      serviceType: 'esim',
    });
    
    openPartnerLink(partner.trackingUrl, {
      partnerId: partner.id,
      partnerName: partner.name,
      product: 'esim',
      pageSource: 'esim-section',
    });
  };

  const esimCards = [
    {
      ...ESIM_PARTNERS[0], // Airalo
      tagline: 'Most Popular',
      description: 'Instant eSIM for 190+ countries. Download and connect in minutes.',
      highlight: 'From $4.50',
    },
    {
      ...ESIM_PARTNERS[1], // Drimsim
      tagline: 'Pay As You Go',
      description: 'Global SIM with flexible data packages. No commitment needed.',
      highlight: 'Free SIM Card',
    },
    {
      ...ESIM_PARTNERS[2], // Yesim
      tagline: 'Budget Friendly',
      description: 'Affordable regional plans with unlimited top-ups.',
      highlight: 'From $3.99',
    },
  ];

  return (
    <section className={`py-10 sm:py-14 bg-gradient-to-b from-transparent to-muted/30 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Wifi className="w-3 h-3 mr-1" />
            Travel Essentials
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Stay Connected Anywhere
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get travel eSIM or global SIM cards. No roaming fees, no surprise bills.
          </p>
        </div>

        {/* eSIM Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {esimCards.map((provider, index) => (
            <Card 
              key={provider.id}
              className="group cursor-pointer border-border/50 hover:border-border hover:shadow-lg hover:transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 active:scale-[0.98] touch-manipulation"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handlePartnerClick(provider)}
            >
              {/* Top Banner */}
              {index === 0 && (
                <div className="text-primary-foreground text-center py-1 text-xs font-medium flex items-center justify-center gap-1 bg-foreground">
                  <Award className="w-3 h-3" /> Recommended
                </div>
              )}
              
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200 bg-secondary">
                      {provider.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-base group-hover:text-foreground transition-colors">
                        {provider.name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] border-border text-foreground">
                        {provider.tagline}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{provider.highlight}</span>
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
                  className="w-full gap-2 text-primary-foreground hover:opacity-90 touch-manipulation rounded-xl active:scale-[0.97] transition-all duration-200 min-h-[40px] shadow-sm bg-foreground"
                >
                  <Smartphone className="w-4 h-4" />
                  Get eSIM
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-foreground" />
            <span>190+ Countries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Instant Activation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span>No Roaming Fees</span>
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
