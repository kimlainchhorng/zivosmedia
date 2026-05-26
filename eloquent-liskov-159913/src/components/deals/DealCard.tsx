import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Flame, Plane, BedDouble, Car, Package, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TravelDeal } from "@/hooks/useRecommendedDeals";

const categoryIcons: Record<string, typeof Plane> = {
  flights: Plane,
  hotels: BedDouble,
  cars: Car,
  packages: Package,
};

const categoryColors: Record<string, string> = {
  flights: "text-sky-500 border-sky-500/30",
  hotels: "text-amber-500 border-amber-500/30",
  cars: "text-emerald-500 border-emerald-500/30",
  packages: "text-violet-500 border-violet-500/30",
};

const dealTypeConfig: Record<string, { label: string; icon: typeof Flame; className: string }> = {
  flash: { label: "Flash", icon: Flame, className: "bg-destructive/10 text-destructive border-destructive/20" },
  "last-minute": { label: "Last Min", icon: Clock, className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  trending: { label: "Trending", icon: Zap, className: "bg-primary/10 text-primary border-primary/20" },
  seasonal: { label: "Seasonal", icon: Plane, className: "bg-muted text-muted-foreground border-border/40" },
  member: { label: "Exclusive", icon: Zap, className: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
};

function getTimeRemaining(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return `< 1h left`;
}

export default function DealCard({ deal }: { deal: TravelDeal }) {
  const navigate = useNavigate();
  const Icon = categoryIcons[deal.category] || Plane;
  const catColor = categoryColors[deal.category] || "text-muted-foreground border-border/40";
  const typeConf = dealTypeConfig[deal.deal_type] || dealTypeConfig.seasonal;
  const timeLeft = deal.expires_at ? getTimeRemaining(deal.expires_at) : null;

  return (
    <Card
      className="border-border/40 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden"
      onClick={() => deal.cta_url && navigate(deal.cta_url)}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] gap-1", catColor)}>
              <Icon className="w-3 h-3" />
              {deal.category}
            </Badge>
            <Badge className={cn("text-[10px] gap-1 border", typeConf.className)}>
              <typeConf.icon className="w-2.5 h-2.5" />
              {typeConf.label}
            </Badge>
          </div>
          {timeLeft && (
            <span className="text-[10px] text-destructive font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeLeft}
            </span>
          )}
        </div>

        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{deal.destination_flag || "✈️"}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{deal.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {deal.price_from && (
              <span className="text-lg font-bold text-foreground">
                from ${Number(deal.price_from).toFixed(0)}
              </span>
            )}
            {deal.discount_percent && deal.discount_percent > 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] font-bold">
                -{deal.discount_percent}%
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              if (deal.cta_url) navigate(deal.cta_url);
            }}
          >
            View <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
