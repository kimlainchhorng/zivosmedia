import { Car, MapPin, Clock, Shield, ExternalLink, Sparkles, CarTaxiFront, Bus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  TRANSFER_PARTNERS, 
  AFFILIATE_DISCLOSURE_TEXT,
  openPartnerLink 
} from "@/config/affiliateLinks";
import { trackAffiliateClick } from "@/lib/affiliateTracking";

interface AirportTransfersSectionProps {
  className?: string;
  destination?: string;
}

export default function AirportTransfersSection({ className = '', destination }: AirportTransfersSectionProps) {
  const handlePartnerClick = (partner: typeof TRANSFER_PARTNERS[0]) => {
    trackAffiliateClick({
      flightId: `transfer-${destination || 'general'}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: destination || '',
      destination: destination || '',
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: partner.trackingUrl,
      source: 'transfers_section',
      ctaType: 'cross_sell',
      serviceType: 'transfers',
    });
    
    openPartnerLink(partner.trackingUrl, {
      partnerId: partner.id,
      partnerName: partner.name,
      product: 'transfers',
      pageSource: 'transfers-section',
    });
  };

  const transferCards = TRANSFER_PARTNERS.map(partner => {
    const iconConfig = partner.id === 'kiwitaxi' 
      ? { TransferIcon: CarTaxiFront, gradient: "from-amber-500/20 to-yellow-500/20", color: "text-amber-500" }
      : partner.id === 'gettransfer'
      ? { TransferIcon: Car, gradient: "from-emerald-500/20 to-green-500/20", color: "text-emerald-500" }
      : { TransferIcon: Bus, gradient: "from-muted to-muted", color: "text-sky-500" };
    return {
      ...partner,
      description: partner.id === 'kiwitaxi' 
        ? 'Book private airport transfers with fixed prices'
        : partner.id === 'gettransfer'
        ? 'Compare transfer prices from local drivers'
        : 'Shared shuttles & group transfers',
      ...iconConfig,
    };
  });

  return (
    <section className={`py-10 sm:py-14 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-amber-500/20 text-amber-500 border-amber-500/30">
            <Car className="w-3 h-3 mr-1" />
            Airport Transfers & Rides
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Get to Your Destination Hassle-Free
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pre-book airport transfers, private rides, and shuttle services from trusted partners.
          </p>
        </div>

        {/* Partner Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {transferCards.map((partner, index) => (
            <Card 
              key={partner.id}
              className="group cursor-pointer border-border/50 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 active:scale-[0.98] touch-manipulation"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handlePartnerClick(partner)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", partner.gradient)}>
                    <partner.TransferIcon className={cn("w-6 h-6", partner.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base mb-1 group-hover:text-amber-500 transition-colors">
                      {partner.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {partner.description}
                    </p>
                    
                    {/* Features */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {partner.features.slice(0, 2).map((feature, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      size="sm"
                      className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground hover:opacity-90 touch-manipulation rounded-xl active:scale-[0.97] transition-all duration-200 min-h-[40px] shadow-sm"
                    >
                      Book Transfer
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Fixed prices</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>24/7 Support</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-foreground" />
            <span>150+ Countries</span>
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
