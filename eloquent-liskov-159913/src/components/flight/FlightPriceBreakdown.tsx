/**
 * Flight Price Breakdown Component
 * Clean, focused price details: base fare + fees = total
 */

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { FlightPricingBreakdown } from '@/utils/flightPricing';

interface FlightPriceBreakdownProps {
  pricing: FlightPricingBreakdown;
  className?: string;
  showNoHiddenFees?: boolean;
  compact?: boolean;
}

function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function FlightPriceBreakdown({
  pricing,
  className,
  compact = false,
}: FlightPriceBreakdownProps) {
  const {
    baseFare, taxesFeesCharges,
    totalAllPassengers, passengers, currency,
  } = pricing;

  const isMultiPax = passengers > 1;

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Flight{isMultiPax ? ` (×${passengers})` : ''}</span>
          <span>{formatPrice(baseFare * passengers, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taxes, fees & charges</span>
          <span>{formatPrice(taxesFeesCharges * passengers, currency)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary">{formatPrice(totalAllPassengers, currency)}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-border/30 shadow-sm", className)}>
      <CardContent className="p-5 space-y-3">
        <h3 className="text-base font-bold">Price details</h3>

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Flight{isMultiPax ? ` (${passengers} travelers)` : ''}
            </span>
            <span className="font-medium tabular-nums">{formatPrice(baseFare * passengers, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxes, fees & charges</span>
            <span className="font-medium tabular-nums">{formatPrice(taxesFeesCharges * passengers, currency)}</span>
          </div>
        </div>

        <Separator className="bg-border/40" />

        {/* Trip total */}
        <div className="flex justify-between items-baseline">
          <span className="text-base font-bold">Trip total</span>
          <span className="text-xl font-bold tabular-nums">{formatPrice(totalAllPassengers, currency)}</span>
        </div>

        <p className="text-[10px] text-muted-foreground/60">
          Rates are shown in {currency}
        </p>
      </CardContent>
    </Card>
  );
}
