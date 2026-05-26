/**
 * PromoRedemptionsDrawer — shows recent redemptions, attributed revenue, sparkline.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, subDays } from "date-fns";
import { Tag, Users, DollarSign, TrendingUp } from "lucide-react";
import type { PromoCode } from "@/hooks/useMarketingPromoCodes";

interface Props {
  open: boolean;
  onClose: () => void;
  promo: PromoCode | null;
}

interface Redemption {
  id: string;
  user_id: string;
  order_id: string | null;
  discount_cents: number;
  redeemed_at: string;
}

export default function PromoRedemptionsDrawer({ open, onClose, promo }: Props) {
  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ["promo-redemptions", promo?.id],
    enabled: !!promo?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_promo_redemptions" as any)
        .select("*")
        .eq("promo_code_id", promo!.id)
        .order("redeemed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return ((data as any[]) || []) as Redemption[];
    },
  });

  // Build 30-day sparkline
  const sparkline = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(new Date(), 29 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    return redemptions.filter((r) => r.redeemed_at.slice(0, 10) === dayStr).length;
  });
  const max = Math.max(...sparkline, 1);

  const totalRevenue = redemptions.reduce((s, r) => s + r.discount_cents, 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <code className="font-mono">{promo?.code}</code>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-muted/40">
              <Users className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{redemptions.length}</div>
              <div className="text-[10px] text-muted-foreground">Redemptions</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">${(totalRevenue / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">Discount</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">
                {promo?.max_redemptions
                  ? Math.round(((promo.redemption_count || 0) / promo.max_redemptions) * 100)
                  : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">Capacity</div>
            </div>
          </div>

          {/* 30-day sparkline */}
          <div>
            <div className="text-xs font-semibold mb-2">Last 30 days</div>
            <div className="flex items-end gap-0.5 h-16">
              {sparkline.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500/60 rounded-sm min-h-[2px]"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`${v} redemptions`}
                />
              ))}
            </div>
          </div>

          {/* Recent redemptions */}
          <div>
            <div className="text-xs font-semibold mb-2">Recent</div>
            {isLoading ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Loading…</div>
            ) : redemptions.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">
                No redemptions yet
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {redemptions.slice(0, 20).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono truncate">{r.user_id.slice(0, 8)}…</div>
                      <div className="text-muted-foreground">
                        {format(parseISO(r.redeemed_at), "MMM d, h:mma")}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      ${(r.discount_cents / 100).toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
