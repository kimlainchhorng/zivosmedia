import { Plane, Clock, AlertCircle, Euro, ExternalLink, CheckCircle, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  COMPENSATION_PARTNERS, 
  AFFILIATE_DISCLOSURE_TEXT,
  openPartnerLink 
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";

interface FlightCompensationSectionProps {
  className?: string;
}

export default function FlightCompensationSection({ className = '' }: FlightCompensationSectionProps) {
  const handlePartnerClick = (partner: typeof COMPENSATION_PARTNERS[0]) => {
    trackAffiliateClick({
      flightId: `compensation-${partner.id}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: '',
      destination: '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'compensation_section',
      ctaType: 'cross_sell',
      serviceType: 'compensation',
    });
    
    openPartnerLink(partner.trackingUrl);
  };

  const compensationCards = [
    {
      ...COMPENSATION_PARTNERS[0], // AirHelp
      tagline: 'Market Leader',
      description: 'Get up to €600 for delayed, cancelled, or overbooked flights. We handle all the paperwork.',
      successRate: '98%',
    },
    {
      ...COMPENSATION_PARTNERS[1], // Compensair
      tagline: 'Quick Claims',
      description: 'Fast compensation claims with no upfront fees. Get money you deserve.',
      successRate: '95%',
    },
  ];

  const eligibilityItems = [
    { icon: Clock, text: 'Flight delayed 3+ hours' },
    { icon: AlertCircle, text: 'Flight cancelled' },
    { icon: Plane, text: 'Denied boarding / Overbooked' },
  ];

  return (
    <section className={`py-10 sm:py-14 bg-gradient-to-b from-transparent to-muted/30 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-red-500/20 text-red-500 border-red-500/30">
            <Scale className="w-3 h-3 mr-1" />
            Travel Support
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Flight Delayed or Cancelled?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get up to €600 compensation. No win, no fee. Let experts handle your claim.
          </p>
        </div>

        {/* Eligibility Quick Check */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {eligibilityItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-2 rounded-xl border border-border/50">
              <item.icon className="w-4 h-4 text-red-500" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {compensationCards.map((partner, index) => (
            <Card 
              key={partner.id}
              className="group cursor-pointer border-border/50 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 active:scale-[0.98] touch-manipulation"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handlePartnerClick(partner)}
            >
              {index === 0 && (
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-primary-foreground text-center py-1 text-xs font-medium">
                  Most Trusted
                </div>
              )}
              
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {partner.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-base group-hover:text-red-500 transition-colors">
                        {partner.name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
                        {partner.tagline}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                    <div className="text-lg font-bold text-emerald-500">{partner.successRate}</div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {partner.description}
                </p>
                
                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {partner.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Button 
                  size="sm"
                  className="w-full gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-primary-foreground hover:opacity-90 touch-manipulation rounded-xl active:scale-[0.97] transition-all duration-200 min-h-[40px] shadow-sm"
                >
                  <Euro className="w-4 h-4" />
                  Check My Compensation
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disclosure */}
        <p className="text-xs text-muted-foreground text-center mt-6 max-w-lg mx-auto">
          {AFFILIATE_DISCLOSURE_TEXT.short} Compensation amounts depend on route and delay length.
        </p>
      </div>
    </section>
  );
}
