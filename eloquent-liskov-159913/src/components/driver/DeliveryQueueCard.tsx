/**
 * DeliveryQueueCard - Available deliveries list
 * Ported from Zivo Driver Connect
 */
import { motion } from "framer-motion";
import { MapPin, Clock, DollarSign, UtensilsCrossed } from "lucide-react";

interface QueuedDelivery {
  id: string;
  restaurant: string;
  distance: string;
  estimatedTime: string;
  earnings: number;
  isFoodOrder?: boolean;
}

interface DeliveryQueueCardProps {
  deliveries: QueuedDelivery[];
  onAccept: (id: string) => void;
}

export default function DeliveryQueueCard({ deliveries, onAccept }: DeliveryQueueCardProps) {
  if (deliveries.length === 0) {
    return (
      <motion.div
        className="rounded-xl border border-border/50 bg-card p-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No deliveries nearby</h3>
        <p className="text-xs text-muted-foreground">New orders will appear here</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground px-1">Available Deliveries</h3>
      {deliveries.map((delivery, index) => (
        <motion.div
          key={delivery.id}
          className="rounded-xl p-3 cursor-pointer border border-border/50 bg-card hover:border-primary/30 transition-all"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onAccept(delivery.id)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {delivery.isFoodOrder && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <UtensilsCrossed className="w-3 h-3" />
                    Food
                  </span>
                )}
                <p className="font-semibold text-foreground truncate">{delivery.restaurant}</p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {delivery.distance}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {delivery.estimatedTime}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-primary">
              <DollarSign className="w-4 h-4" />
              {delivery.earnings.toFixed(2)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
