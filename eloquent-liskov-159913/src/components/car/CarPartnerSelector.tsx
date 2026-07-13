import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { carAffiliatePartners, type CarAffiliatePartner, type CarAffiliateParams } from '@/data/carAffiliatePartners';
import { trackAffiliateClick } from '@/lib/affiliateTracking';
import { Link } from "react-router-dom";

interface CarPartnerSelectorProps {
  pickupLocation: string;
  pickupDate?: string;
  returnDate?: string;
  pickupTime?: string;
  returnTime?: string;
  driverAge?: number;
  carName?: string;
  className?: string;
}

export default function CarPartnerSelector({
  pickupLocation,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  driverAge = 25,
  carName,
  className,
}: CarPartnerSelectorProps) {
  const [selectedPartner, setSelectedPartner] = useState<string>('rentalcars');

  const handlePartnerClick = (partner: CarAffiliatePartner) => {
    const params: CarAffiliateParams = {
      pickupLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      driverAge,
    };

    const url = partner.urlTemplate(params);

    // Track the click
    trackAffiliateClick({
      flightId: `car-${pickupLocation}-${pickupDate || 'flexible'}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase(),
      origin: pickupLocation,
      destination: pickupLocation,
      price: 0,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner.id,
      referralUrl: url,
      source: 'car_partner_selector',
    });

    // Open in-app browser on native, new tab on web
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const topPartners = carAffiliatePartners.slice(0, 6);

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
        <h3 className="font-semibold text-sm sm:text-base">Compare Car Rental Prices</h3>
      </div>

      {carName && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          Find the best deal for <strong className="text-foreground">{carName}</strong>:
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {topPartners.map((partner) => (
          <Card
            key={partner.id}
            className={cn(
              "cursor-pointer transition-all touch-manipulation active:scale-[0.98]",
              selectedPartner === partner.id 
                ? "border-violet-500 bg-violet-500/10" 
                : "hover:border-violet-500/50"
            )}
            onClick={() => setSelectedPartner(partner.id)}
          >
            <CardContent className="p-2.5 sm:p-3">
              <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-lg sm:text-xl">{partner.logo}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{partner.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{partner.commissionRate}</p>
                  </div>
                </div>
                {selectedPartner === partner.id && (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                {partner.features.slice(0, 2).map((feature) => (
                  <Badge 
                    key={feature} 
                    variant="secondary" 
                    className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0"
                  >
                    {feature}
                  </Badge>
                ))}
              </div>

              <Button
                size="sm"
                className={cn(
                  "w-full h-7 sm:h-8 text-[10px] sm:text-xs gap-1 touch-manipulation active:scale-[0.98]",
                  partner.color,
                  "hover:opacity-90 text-primary-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePartnerClick(partner);
                }}
              >
                <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="truncate">Search {partner.name}</span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
        ZIVO may earn a commission when you book through partner links.{' '}
        <Link to="/affiliate-disclosure" className="text-foreground hover:underline">Learn more</Link>
      </p>
    </div>
  );
}