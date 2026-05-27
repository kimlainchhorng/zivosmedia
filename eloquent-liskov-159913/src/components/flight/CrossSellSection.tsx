import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Hotel, Car, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCrossSellByType, type CrossSellPartner } from '@/data/affiliatePartners';
import { trackAffiliateClick } from '@/lib/affiliateTracking';
import { useNavigate , Link} from 'react-router-dom';

interface CrossSellSectionProps {
  destination: string;
  origin?: string;
  checkIn?: string;
  checkOut?: string;
  className?: string;
}

export default function CrossSellSection({
  destination,
  origin = '',
  checkIn,
  checkOut,
  className,
}: CrossSellSectionProps) {
  const navigate = useNavigate();
  
  const hotelPartners = getCrossSellByType('hotel');
  const carPartners = getCrossSellByType('car');
  const insurancePartners = getCrossSellByType('insurance');

  const handlePartnerClick = (partner: CrossSellPartner) => {
    const url = partner.urlTemplate(destination, { checkIn, checkOut });

    // Track with existing interface - using cross-sell data
    trackAffiliateClick({
      flightId: `cross-sell-${partner.type}`,
      airline: partner.name,
      airlineCode: partner.id.toUpperCase().slice(0, 2),
      origin: origin,
      destination: destination,
      price: 0,
      passengers: 1,
      cabinClass: 'economy',
      affiliatePartner: partner.id,
      referralUrl: url,
      source: `cross_sell_${partner.type}`,
    });

    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const handleInternalLink = (path: string, type: 'hotel' | 'car') => {
    // Track internal navigation as well
    trackAffiliateClick({
      flightId: `internal-${type}`,
      airline: 'ZIVO',
      airlineCode: 'ZV',
      origin: origin,
      destination: destination,
      price: 0,
      passengers: 1,
      cabinClass: 'economy',
      affiliatePartner: 'zivo_internal',
      referralUrl: path,
      source: `internal_${type}`,
    });
    navigate(path);
  };

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      <div className="text-center">
        <h3 className="font-display text-lg sm:text-xl font-bold mb-1 sm:mb-2">Complete Your Trip</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Book hotels, cars, and insurance for {destination}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Hotels Section */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Hotel className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">Hotels</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Find places to stay</p>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
              {hotelPartners.slice(0, 2).map((partner) => (
                <button type="button"
                  key={partner.id}
                  onClick={() => handlePartnerClick(partner)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background transition-colors text-left touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base">{partner.logo}</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{partner.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{partner.tagline}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 sm:h-9 text-xs sm:text-sm border-amber-500/30 hover:bg-amber-500/10 touch-manipulation active:scale-[0.98]"
              onClick={() => handleInternalLink('/book-hotel', 'hotel')}
            >
              Search on ZIVO Hotels
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Car Rentals Section */}
        <Card className="border-border bg-secondary">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">Car Rentals</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Drive at your destination</p>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
              {carPartners.map((partner) => (
                <button type="button"
                  key={partner.id}
                  onClick={() => handlePartnerClick(partner)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background transition-colors text-left touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base">{partner.logo}</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{partner.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{partner.tagline}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 sm:h-9 text-xs sm:text-sm border-border hover:bg-secondary touch-manipulation active:scale-[0.98]"
              onClick={() => handleInternalLink('/rent-car', 'car')}
            >
              Search on ZIVO Cars
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Travel Insurance Section */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30 sm:col-span-2 md:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base">Travel Insurance</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Protect your trip</p>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
              {insurancePartners.map((partner) => (
                <button type="button"
                  key={partner.id}
                  onClick={() => handlePartnerClick(partner)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-background/50 hover:bg-background transition-colors text-left touch-manipulation active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base">{partner.logo}</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{partner.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{partner.tagline}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 sm:h-9 text-xs sm:text-sm border-emerald-500/30 hover:bg-emerald-500/10 touch-manipulation active:scale-[0.98]"
              onClick={() => navigate('/travel-insurance')}
            >
              View Insurance Options
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
        ZIVO may earn a commission from partner bookings. <Link to="/affiliate-disclosure" className="text-foreground hover:underline">Learn more</Link>
      </p>
    </div>
  );
}
