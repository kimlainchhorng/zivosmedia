/**
 * Universal Affiliate Result Card
 * 
 * A standardized card component that can be used across all travel services
 * Ensures consistent affiliate CTA behavior and tracking
 */

import { ExternalLink, Sparkles, CheckCircle2, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trackAffiliateClick } from "@/lib/affiliateTracking";
import { 
  buildFlightDeepLink, 
  buildHotelDeepLink, 
  buildCarDeepLink,
  buildActivityDeepLink,
  type FlightDeepLinkParams,
  type HotelDeepLinkParams,
  type CarDeepLinkParams,
  type ActivityDeepLinkParams,
  getPrimaryPartner,
} from "@/config/affiliateLinks";

type ServiceType = 'flights' | 'hotels' | 'cars' | 'activities';

interface BaseResultCardProps {
  id: string;
  serviceType: ServiceType;
  title: string;
  subtitle?: string;
  image?: string;
  price: number;
  priceLabel?: string; // "per person", "per night", "per day"
  originalPrice?: number; // For showing discounts
  rating?: number;
  reviewCount?: number;
  badges?: Array<{ label: string; variant: 'hot' | 'deal' | 'popular' | 'verified' | 'new' }>;
  features?: string[];
  providerName?: string;
  providerLogo?: string;
  ctaText?: string;
  source: string;
  onSelect?: () => void;
  className?: string;
}

interface FlightResultCardProps extends BaseResultCardProps {
  serviceType: 'flights';
  searchParams: FlightDeepLinkParams;
}

interface HotelResultCardProps extends BaseResultCardProps {
  serviceType: 'hotels';
  searchParams: HotelDeepLinkParams;
}

interface CarResultCardProps extends BaseResultCardProps {
  serviceType: 'cars';
  searchParams: CarDeepLinkParams;
}

interface ActivityResultCardProps extends BaseResultCardProps {
  serviceType: 'activities';
  searchParams: ActivityDeepLinkParams;
}

type AffiliateResultCardProps = 
  | FlightResultCardProps 
  | HotelResultCardProps 
  | CarResultCardProps 
  | ActivityResultCardProps;

const serviceColors = {
  flights: {
    primary: 'from-sky-500 to-blue-600',
    hover: 'hover:from-sky-600 hover:to-blue-700',
    shadow: 'shadow-sky-500/30',
    accent: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
  },
  hotels: {
    primary: 'from-amber-500 to-orange-600',
    hover: 'hover:from-amber-600 hover:to-orange-700',
    shadow: 'shadow-amber-500/30',
    accent: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  cars: {
    primary: 'from-violet-500 to-purple-600',
    hover: 'hover:from-violet-600 hover:to-purple-700',
    shadow: 'shadow-violet-500/30',
    accent: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  activities: {
    primary: 'from-emerald-500 to-teal-600',
    hover: 'hover:from-emerald-600 hover:to-teal-700',
    shadow: 'shadow-emerald-500/30',
    accent: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
};

const badgeVariants = {
  hot: 'bg-gradient-to-r from-red-500 to-orange-500 text-primary-foreground',
  deal: 'bg-gradient-to-r from-emerald-500 to-green-500 text-primary-foreground',
  popular: 'bg-gradient-to-r from-sky-500 to-blue-500 text-primary-foreground',
  verified: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
  new: 'bg-violet-500/20 text-violet-500 border-violet-500/30',
};

const defaultCtaText = {
  flights: 'View Deal',
  hotels: 'View Hotel',
  cars: 'Rent Now',
  activities: 'Book Now',
};

export default function AffiliateResultCard(props: AffiliateResultCardProps) {
  const {
    id,
    serviceType,
    title,
    subtitle,
    image,
    price,
    priceLabel,
    originalPrice,
    rating,
    reviewCount,
    badges = [],
    features = [],
    providerName,
    providerLogo,
    ctaText,
    source,
    onSelect,
    className,
  } = props;

  const colors = serviceColors[serviceType];
  const partner = getPrimaryPartner(serviceType);

  const handleBookClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    let url: string;
    
    // Build deep link based on service type
    switch (props.serviceType) {
      case 'flights':
        url = buildFlightDeepLink(props.searchParams);
        break;
      case 'hotels':
        url = buildHotelDeepLink(props.searchParams);
        break;
      case 'cars':
        url = buildCarDeepLink(props.searchParams);
        break;
      case 'activities':
        url = buildActivityDeepLink(props.searchParams);
        break;
    }
    
    // Track the click
    trackAffiliateClick({
      flightId: id,
      airline: providerName || partner?.name || 'Unknown',
      airlineCode: serviceType.toUpperCase(),
      origin: 'ZIVO',
      destination: title,
      price,
      passengers: 1,
      cabinClass: 'standard',
      affiliatePartner: partner?.id || serviceType,
      referralUrl: url,
      source,
      ctaType: 'result_card',
      serviceType: serviceType === 'cars' ? 'car_rental' : serviceType,
    });
    
    // Open in-app browser on native, new tab on web
    import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
  };

  const discountPercent = originalPrice 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 group cursor-pointer",
        `hover:shadow-lg hover:${colors.border}`,
        className
      )}
      onClick={onSelect}
    >
      {/* Top accent bar */}
      <div className={cn("h-1 bg-gradient-to-r", colors.primary)} />
      
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image section */}
          {image && (
            <div className="sm:w-48 h-36 sm:h-auto relative shrink-0 overflow-hidden">
              <img 
                src={image} 
	                alt={title}
	                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
	                loading="lazy"
	                decoding="async"
	              />
              {badges.length > 0 && (
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {badges.slice(0, 2).map((badge, idx) => (
                    <Badge 
                      key={idx} 
                      className={cn("text-[10px] gap-1", badgeVariants[badge.variant])}
                    >
                      {badge.variant === 'hot' && <TrendingUp className="w-3 h-3" />}
                      {badge.variant === 'deal' && <Sparkles className="w-3 h-3" />}
                      {badge.variant === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Content section */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h3 className={cn(
                    "font-bold text-base sm:text-lg line-clamp-1 transition-all duration-200",
                    `group-hover:${colors.accent}`
                  )}>
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                
                {/* Rating */}
                {rating !== undefined && (
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-bold">{rating.toFixed(1)}</span>
                    </div>
                    {reviewCount && (
                      <p className="text-[10px] text-muted-foreground">
                        {reviewCount.toLocaleString()} reviews
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Provider */}
              {providerName && (
                <div className="flex items-center gap-2 mb-3">
                  {providerLogo && (
                    <span className="text-lg">{providerLogo}</span>
                  )}
                  <span className="text-xs text-muted-foreground">by {providerName}</span>
                </div>
              )}
              
              {/* Features */}
              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {features.slice(0, 4).map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Footer: Price & CTA */}
              <div className="flex items-end justify-between pt-3 border-t border-border/50 mt-auto">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-2xl font-bold", colors.accent)}>
                      ${price}
                    </span>
                    {originalPrice && discountPercent > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ${originalPrice}
                        </span>
                        <Badge className="bg-emerald-500 text-primary-foreground text-[10px]">
                          -{discountPercent}%
                        </Badge>
                      </>
                    )}
                  </div>
                  {priceLabel && (
                    <p className="text-[10px] text-muted-foreground">{priceLabel}</p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={handleBookClick}
                    className={cn(
                      "gap-2 font-semibold min-h-[44px] touch-manipulation active:scale-[0.98]",
                      `bg-gradient-to-r ${colors.primary} ${colors.hover}`,
                      `shadow-lg ${colors.shadow}`
                    )}
                  >
                    {ctaText || defaultCtaText[serviceType]}
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <p className="text-[9px] text-muted-foreground">Opens partner site</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
