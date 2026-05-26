/**
 * Maintenance Screen
 * Full-screen display when a service is under maintenance
 */
import { Wrench, UtensilsCrossed, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MaintenanceScreenProps {
  serviceName?: string;
  browseUrl?: string;
  browseLabel?: string;
  ordersUrl?: string;
  ordersLabel?: string;
  showBrowse?: boolean;
  showOrders?: boolean;
  className?: string;
}

export function MaintenanceScreen({
  serviceName = "ZIVO",
  browseUrl = "/eats/restaurants",
  browseLabel = "Browse Restaurants",
  ordersUrl = "/eats/orders",
  ordersLabel = "View Past Orders",
  showBrowse = true,
  showOrders = true,
  className,
}: MaintenanceScreenProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex items-center justify-center p-4",
        className
      )}
    >
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-10 h-10 text-primary" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">
            {serviceName} is temporarily under maintenance.
          </h1>
          <p className="text-muted-foreground">
            Please try again shortly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {showBrowse && (
            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={() => navigate(browseUrl)}
            >
              <UtensilsCrossed className="w-4 h-4" />
              {browseLabel}
            </Button>
          )}
          {showOrders && (
            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={() => navigate(ordersUrl)}
            >
              <History className="w-4 h-4" />
              {ordersLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
