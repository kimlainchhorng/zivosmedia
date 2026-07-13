/**
 * ActiveDeliveryCard - Shows current active delivery with pickup/dropoff flow
 * Ported from Zivo Driver Connect
 */
import { motion } from "framer-motion";
import { MapPin, Phone, Navigation, Clock, Store, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DeliveryOrder {
  id: string;
  restaurant: { name: string; address: string };
  customer: { name: string; address: string; phone: string };
  items: number;
  estimatedTime: string;
  earnings: number;
  status: "pickup" | "delivering";
}

interface ActiveDeliveryCardProps {
  order: DeliveryOrder;
  onComplete: () => void;
  onNavigate: () => void;
}

export default function ActiveDeliveryCard({ order, onComplete, onNavigate }: ActiveDeliveryCardProps) {
  const isPickup = order.status === "pickup";
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    if (!isPickup) {
      setShowSuccess(true);
    }
    await new Promise(resolve => setTimeout(resolve, isPickup ? 300 : 800));
    setIsCompleting(false);
    setShowSuccess(false);
    onComplete();
  };

  return (
    <motion.div
      className="rounded-2xl overflow-hidden relative border border-border/50 bg-card"
      style={{ boxShadow: "0 8px 32px -8px hsl(var(--primary) / 0.15)" }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Success overlay */}
      <motion.div
        className="absolute inset-0 z-20 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: showSuccess ? 1 : 0 }}
      >
        <motion.div className="flex flex-col items-center gap-3"
          initial={{ scale: 0 }}
          animate={showSuccess ? { scale: 1 } : { scale: 0 }}
        >
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">Delivered!</p>
            <p className="text-primary font-semibold">+${order.earnings.toFixed(2)}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Header */}
      <div className="bg-primary/10 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-xs font-medium text-primary">
            {isPickup ? "Pickup Order" : "Delivering"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-medium">{order.estimatedTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Restaurant */}
        <div className={cn("flex items-start gap-2.5 transition-opacity", !isPickup && "opacity-50")}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Pickup from</p>
            <p className="font-semibold text-foreground truncate text-sm">{order.restaurant.name}</p>
            <p className="text-xs text-muted-foreground truncate">{order.restaurant.address}</p>
          </div>
          {isPickup && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              {order.items} items
            </span>
          )}
        </div>

        {/* Customer */}
        <div className={cn("flex items-start gap-2.5 transition-opacity", isPickup && "opacity-50")}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Deliver to</p>
            <p className="font-semibold text-foreground truncate text-sm">{order.customer.name}</p>
            <p className="text-xs text-muted-foreground truncate">{order.customer.address}</p>
          </div>
          <button type="button"
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
            onClick={() => window.location.href = `tel:${order.customer.phone}`}
          >
            <Phone className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Earnings */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <span className="text-sm text-muted-foreground">Earnings</span>
          <span className="text-lg font-bold text-primary">${order.earnings.toFixed(2)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-10 rounded-xl font-semibold" onClick={onNavigate}>
            <Navigation className="w-3.5 h-3.5 mr-1.5" />
            Navigate
          </Button>
          <Button
            className="flex-1 h-10 rounded-xl font-semibold"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <motion.div
                className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-1.5" />
                {isPickup ? "Picked Up" : "Delivered"}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
