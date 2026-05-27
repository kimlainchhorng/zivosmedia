/**
 * Trip Card Component
 * Displays a travel order summary in a card format
 */
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Hotel, Compass, Car, Plane } from "lucide-react";
import type { TravelOrder } from "@/hooks/useMyTrips";

interface TripCardProps {
  order: TravelOrder;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  pending_payment: { label: "Pending Payment", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
};

const cancellationStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Cancel Requested", variant: "secondary" },
  under_review: { label: "Under Review", variant: "secondary" },
  approved: { label: "Cancel Approved", variant: "default" },
  rejected: { label: "Cancel Rejected", variant: "destructive" },
  processed: { label: "Processed", variant: "default" },
};

function getItemIcon(type: string) {
  switch (type) {
    case "hotel":
      return <Hotel className="w-4 h-4" />;
    case "flight":
      return <Plane className="w-4 h-4" />;
    case "activity":
      return <Compass className="w-4 h-4" />;
    case "transfer":
      return <Car className="w-4 h-4" />;
    default:
      return <Compass className="w-4 h-4" />;
  }
}

export function TripCard({ order }: TripCardProps) {
  const items = order.travel_order_items || [];
  
  // Get date range from items
  const dates = items
    .map((item) => new Date(item.start_date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  const startDate = dates[0];
  const endDates = items
    .map((item) => item.end_date ? new Date(item.end_date) : new Date(item.start_date))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  const endDate = endDates[0];

  // Get unique item types
  const itemTypes = [...new Set(items.map((item) => item.type))];

  // Determine display status
  const showCancellationStatus = order.cancellation_status !== "none";
  const displayStatus = showCancellationStatus
    ? cancellationStatusConfig[order.cancellation_status] || { label: order.cancellation_status, variant: "outline" as const }
    : statusConfig[order.status] || { label: order.status, variant: "outline" as const };

  return (
    <Link to={`/my-trips/${order.order_number}`}>
      <Card className="hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer touch-manipulation active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {order.order_number}
                </span>
                <Badge variant={displayStatus.variant}>
                  {displayStatus.label}
                </Badge>
              </div>

              {/* Dates */}
              <p className="font-medium mb-1">
                {startDate
                  ? format(startDate, "MMM d, yyyy")
                  : "No date"}
                {endDate && endDate.getTime() !== startDate?.getTime() && (
                  <> – {format(endDate, "MMM d, yyyy")}</>
                )}
              </p>

              {/* Item types */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {itemTypes.map((type) => (
                  <div key={type} className="flex items-center gap-1">
                    {getItemIcon(type)}
                    <span className="capitalize">{type}</span>
                  </div>
                ))}
                {items.length > 1 && (
                  <span>• {items.length} items</span>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="font-semibold">
                  ${order.total.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.currency}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
