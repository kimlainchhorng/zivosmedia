import { ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Link } from "react-router-dom";

interface AffiliateRedirectNoticeProps {
  partnerName?: string;
  variant?: 'inline' | 'banner' | 'compact';
  className?: string;
}

export default function AffiliateRedirectNotice({
  partnerName,
  variant = 'inline',
  className,
}: AffiliateRedirectNoticeProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground", className)}>
        <ExternalLink className="w-3 h-3" />
        <span>Redirects to {partnerName || 'partner site'} to complete booking</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <Alert className={cn("border-sky-500/30 bg-sky-500/5", className)}>
        <ShieldCheck className="h-4 w-4 text-foreground" />
        <AlertDescription className="text-xs sm:text-sm">
          <strong>Booking Redirect:</strong> You will be redirected to{' '}
          {partnerName ? <strong>{partnerName}</strong> : 'our trusted travel partner'} to complete your booking.
          ZIVO earns a commission at no extra cost to you.{' '}
          <Link to="/affiliate-disclosure" className="text-foreground hover:underline">
            Learn more
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200",
      className
    )}>
      <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="text-xs text-muted-foreground">
        <p>
          You will be redirected to{' '}
          <strong className="text-foreground">{partnerName || 'our travel partner'}</strong>{' '}
          to complete your booking. Prices and availability are provided by our partners.
        </p>
        <p className="mt-1">
          ZIVO may earn a commission when you book through partner links.{' '}
          <Link to="/affiliate-disclosure" className="text-foreground hover:underline">
            Affiliate Disclosure
          </Link>
        </p>
      </div>
    </div>
  );
}