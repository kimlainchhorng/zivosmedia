/**
 * Order Item Card Component
 * Displays a single travel order item with details
 */
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, Compass, Car, Users, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import type { TravelOrderItem } from "@/hooks/useMyTrips";

interface OrderItemCardProps {
  item: TravelOrderItem;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  hotel: { icon: Hotel, label: "Hotel" },
  activity: { icon: Compass, label: "Activity" },
  transfer: { icon: Car, label: "Transfer" },
};

const supplierStatusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pending", color: "text-yellow-600" },
  confirmed: { icon: CheckCircle, label: "Confirmed", color: "text-green-600" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-red-600" },
  failed: { icon: XCircle, label: "Failed", color: "text-red-600" },
};

export function OrderItemCard({ item }: OrderItemCardProps) {
  const typeInfo = typeConfig[item.type] || typeConfig.activity;
  const TypeIcon = typeInfo.icon;
  
  const statusInfo = supplierStatusConfig[item.supplier_status] || supplierStatusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const startDate = new Date(item.start_date);
  const endDate = item.end_date ? new Date(item.end_date) : null;
  const hasDeadline = item.cancellation_deadline 
    ? new Date(item.cancellation_deadline) > new Date()
    : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TypeIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{typeInfo.label}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Dates */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>
            {format(startDate, "MMM d, yyyy")}
            {endDate && endDate.getTime() !== startDate.getTime() && (
              <> – {format(endDate, "MMM d, yyyy")}</>
            )}
          </span>
        </div>

        {/* Guests */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>
            {item.adults} adult{item.adults !== 1 ? "s" : ""}
            {item.children > 0 && `, ${item.children} child${item.children !== 1 ? "ren" : ""}`}
          </span>
        </div>

        {/* Supplier Reference */}
        {item.provider_reference && (
          <div className="p-2 bg-muted/50 rounded text-sm">
            <span className="text-muted-foreground">Booking Ref: </span>
            <span className="font-mono font-medium">{item.provider_reference}</span>
          </div>
        )}

        {/* Cancellation Policy */}
        {item.cancellation_policy && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Cancellation Policy:</p>
            <p>{item.cancellation_policy}</p>
          </div>
        )}

        {/* Cancellation Deadline */}
        {item.cancellation_deadline && (
          <div className={`text-sm ${hasDeadline ? "text-green-600" : "text-red-600"}`}>
            {hasDeadline ? (
              <>Free cancellation until {format(new Date(item.cancellation_deadline), "MMM d, yyyy 'at' h:mm a")}</>
            ) : (
              <>Cancellation deadline has passed</>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {item.quantity > 1 ? `${item.quantity} × ` : ""}Price
          </span>
          <span className="font-semibold">${item.price.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
