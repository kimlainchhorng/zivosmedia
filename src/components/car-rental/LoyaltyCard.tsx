/**
 * LoyaltyCard — small recognition surface for repeat car-rental customers.
 * Used on both /my-rentals (MyCarRentalsPage) and the public booking review
 * step (PublicCarRentalBookingPage) so signed-in customers see consistent
 * tier acknowledgement everywhere they interact with car rentals.
 *
 * Tier rules + emoji/colour palette live in src/lib/car-rental/loyalty.ts.
 */
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LoyaltyTierInfo } from "@/lib/car-rental/loyalty";

interface Props {
  total: number;
  tier: LoyaltyTierInfo;
  /** Compact variant trims paddings for use inside dense flows (e.g. checkout). */
  variant?: "default" | "compact";
}

export default function LoyaltyCard({ total, tier, variant = "default" }: Props) {
  const padding = variant === "compact" ? "p-3" : "p-4";
  const iconSize = variant === "compact" ? "h-10 w-10 text-xl" : "h-12 w-12 text-2xl";
  return (
    <Card className="rounded-2xl border-border/60">
      <CardContent className={padding}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-xl",
              iconSize,
              tier.className,
            )}
            aria-hidden
          >
            {tier.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn("font-bold text-foreground", variant === "compact" ? "text-sm" : "text-base")}>
                {tier.label} member
              </p>
              <span className="text-[11px] text-muted-foreground">
                {total} lifetime rental{total === 1 ? "" : "s"}
              </span>
            </div>
            {tier.rentalsToNext != null && tier.nextLabel ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {tier.rentalsToNext} more rental{tier.rentalsToNext === 1 ? "" : "s"} to {tier.nextLabel}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                You&apos;ve reached the top tier — thank you for renting with us.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
