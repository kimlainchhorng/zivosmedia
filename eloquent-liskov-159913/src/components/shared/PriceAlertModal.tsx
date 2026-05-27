/**
 * Price Alert Modal
 * Lightweight email capture for price tracking
 * Works on flight, hotel, and car result cards
 */

import { useState } from "react";
import { Bell, Mail, X, Loader2, CheckCircle, Plane, Hotel, CarFront } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ServiceType = "flights" | "hotels" | "cars";

interface PriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceType;
  routeInfo: {
    origin?: string;
    destination?: string;
    departDate?: string;
    returnDate?: string;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    pickupLocation?: string;
    pickupDate?: string;
    dropoffDate?: string;
  };
  currentPrice: number;
  currency?: string;
}

const serviceIcons: Record<ServiceType, typeof Plane> = {
  flights: Plane,
  hotels: Hotel,
  cars: CarFront,
};

const serviceColors: Record<ServiceType, string> = {
  flights: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  hotels: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  cars: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

export function PriceAlertModal({
  open,
  onOpenChange,
  service,
  routeInfo,
  currentPrice,
  currency = "USD",
}: PriceAlertModalProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const Icon = serviceIcons[service];
  const colorClass = serviceColors[service];

  const formatPrice = (price: number) => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || '$'}${price.toLocaleString()}`;
  };

  const getRouteDisplay = () => {
    if (service === "flights") {
      return `${routeInfo.origin} → ${routeInfo.destination}`;
    }
    if (service === "hotels") {
      return `Hotels in ${routeInfo.city}`;
    }
    return `Car rental in ${routeInfo.pickupLocation}`;
  };

  const getDateDisplay = () => {
    if (service === "flights") {
      return routeInfo.returnDate 
        ? `${routeInfo.departDate} - ${routeInfo.returnDate}`
        : routeInfo.departDate;
    }
    if (service === "hotels") {
      return `${routeInfo.checkIn} - ${routeInfo.checkOut}`;
    }
    return `${routeInfo.pickupDate} - ${routeInfo.dropoffDate}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("price_alerts").insert({
        email,
        origin_code: routeInfo.origin || routeInfo.pickupLocation || "",
        destination_code: routeInfo.destination || routeInfo.city || routeInfo.dropoffDate || "",
        origin_name: routeInfo.origin || routeInfo.pickupLocation || null,
        destination_name: routeInfo.destination || routeInfo.city || null,
        departure_date: routeInfo.departDate || routeInfo.checkIn || routeInfo.pickupDate || null,
        return_date: routeInfo.returnDate || routeInfo.checkOut || routeInfo.dropoffDate || null,
        target_price: currentPrice,
        current_price: currentPrice,
        notify_email: true,
        notify_push: false,
        notify_sms: false,
        is_active: true,
      });
      if (error) throw error;
      setIsSuccess(true);
      
      toast({
        title: "Price alert created!",
        description: "We'll notify you when prices drop.",
      });

      // Close modal after success
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setEmail("");
      }, 2000);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">You're all set!</h3>
            <p className="text-muted-foreground">
              We'll email you when prices drop for this route.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 border",
                colorClass
              )}>
                <Bell className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center">Track this price</DialogTitle>
              <DialogDescription className="text-center">
                Get notified when prices drop for your search
              </DialogDescription>
            </DialogHeader>

            {/* Route Info */}
            <div className={cn(
              "p-4 rounded-xl border mb-4",
              colorClass
            )}>
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{getRouteDisplay()}</p>
                  <p className="text-xs text-muted-foreground">{getDateDisplay()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(currentPrice)}</p>
                  <p className="text-xs text-muted-foreground">current price</p>
                </div>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2 rounded-xl h-11 font-semibold shadow-md active:scale-[0.97] transition-all duration-200 touch-manipulation" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up alert...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Create Price Alert
                  </>
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                By creating a price alert, you agree to receive email notifications from ZIVO. 
                You can unsubscribe at any time.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PriceAlertModal;
