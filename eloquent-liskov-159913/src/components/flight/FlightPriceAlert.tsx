import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  BellRing,
  TrendingDown,
  Mail,
  Smartphone,
  Check,
  Sparkles,
  Plane,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useFlightPrices } from "@/hooks/useFlightPrices";

interface PriceAlertProps {
  route: {
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
  };
  currentPrice: number;
  historicalLow?: number;
  departureDate?: string;
  returnDate?: string;
  className?: string;
}

export const FlightPriceAlert = ({
  route,
  currentPrice,
  historicalLow: initialHistoricalLow,
  departureDate,
  returnDate,
  className,
}: PriceAlertProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  });
  const [flexibleDates, setFlexibleDates] = useState(true);
  
  const { createAlert, removeAlert, getAlertForRoute, hasAlertForRoute } = usePriceAlerts();
  
  // Fetch real prices for this route
  const { data: priceData, isLoading: isPriceLoading } = useFlightPrices({
    origin: route.fromCode,
    destination: route.toCode,
    departureDate,
    enabled: !!route.fromCode && !!route.toCode,
  });
  
  // Use real data if available
  const hasRealPrices = priceData?.success && priceData.prices?.length > 0;
  const lowestRealPrice = hasRealPrices 
    ? Math.min(...priceData.prices.map(p => p.price)) 
    : currentPrice;
  const actualCurrentPrice = hasRealPrices ? lowestRealPrice : currentPrice;
  const historicalLow = initialHistoricalLow || Math.round(actualCurrentPrice * 0.8);
  
  const [targetPrice, setTargetPrice] = useState(Math.round(actualCurrentPrice * 0.9));
  
  // Update target price when real prices load
  useEffect(() => {
    if (hasRealPrices) {
      setTargetPrice(Math.round(lowestRealPrice * 0.9));
    }
  }, [hasRealPrices, lowestRealPrice]);
  
  const existingAlert = getAlertForRoute(route.fromCode, route.toCode);
  const isCreated = !!existingAlert;

  const priceDiff = actualCurrentPrice - historicalLow;
  const priceDiffPercent = Math.round((priceDiff / actualCurrentPrice) * 100);

  const handleCreateAlert = () => {
    if (!email) {
      // Show inline error instead of toast
      return;
    }
    
    createAlert(
      route,
      targetPrice,
      actualCurrentPrice,
      historicalLow,
      email,
      notifications,
      flexibleDates,
      departureDate,
      returnDate
    );
  };

  const handleRemoveAlert = () => {
    if (existingAlert) {
      removeAlert(existingAlert.id);
    }
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl overflow-hidden border transition-all duration-300",
        isCreated
          ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-sky-500/10 border-emerald-500/30"
          : "bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-cyan-500/10 border-sky-500/30",
        className
      )}
    >
      {/* Header - Always Visible */}
      <button type="button"
        onClick={() => !isCreated && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-5 py-4 flex items-center justify-between transition-colors",
          !isCreated && "hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isCreated
                ? "bg-emerald-500/20"
                : "bg-sky-500/20"
            )}
          >
            {isCreated ? (
              <BellRing className="w-5 h-5 text-emerald-500 animate-pulse" />
            ) : (
              <Bell className="w-5 h-5 text-foreground" />
            )}
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-sm">
              {isCreated ? "Price Alert Active" : "Get Price Alerts"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {route.fromCode} → {route.toCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCreated ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveAlert();
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          ) : (
            <>
              {hasRealPrices && (
                <Badge
                  variant="outline"
                  className="bg-secondary text-foreground border-border"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Live Prices
                </Badge>
              )}
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-500 border-amber-500/30"
              >
                <TrendingDown className="w-3 h-3 mr-1" />
                {priceDiffPercent}% below avg
              </Badge>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </>
          )}
        </div>
      </button>

      {/* Created State Summary */}
      {isCreated && existingAlert && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-5 pb-4"
        >
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">Target: <strong>${existingAlert.targetPrice}</strong></span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-foreground" />
              <span className="text-sm text-muted-foreground truncate max-w-32">{existingAlert.email}</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                {existingAlert.flexibleDates ? "±3 days" : "Exact date"}
              </span>
            </div>
            {existingAlert.triggered && (
              <>
                <div className="w-px h-4 bg-border hidden sm:block" />
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  <Zap className="w-3 h-3 mr-1" />
                  Price dropped to ${existingAlert.triggeredPrice}!
                </Badge>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Expanded Form */}
      <AnimatePresence>
        {isExpanded && !isCreated && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 space-y-5">
              {/* Price Context */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-muted-foreground">Current Price</p>
                    {hasRealPrices && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-secondary text-foreground border-border">
                        <Zap className="w-2 h-2 mr-0.5" />
                        Live
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">${actualCurrentPrice}</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Historical Low</p>
                  <p className="text-2xl font-bold text-emerald-500">${historicalLow}</p>
                </div>
              </div>

              {/* Target Price Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Alert me when price drops to</Label>
                  <span className="text-lg font-bold text-foreground">${targetPrice}</span>
                </div>
                <input
                  type="range"
                  min={historicalLow}
                  max={actualCurrentPrice}
                  step={5}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Historical low: ${historicalLow}</span>
                  <span>Current: ${actualCurrentPrice}</span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="alert-email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="alert-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background/50"
                  />
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Notification Method</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button type="button"
                    onClick={() =>
                      setNotifications((prev) => ({ ...prev, email: !prev.email }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 active:scale-[0.95] touch-manipulation",
                      notifications.email
                        ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
                        : "bg-muted/30 border-border/50 hover:border-border"
                    )}
                  >
                    <Mail
                      className={cn(
                        "w-5 h-5",
                        notifications.email ? "text-sky-500" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-xs font-medium">Email</span>
                  </button>
                  <button type="button"
                    onClick={() =>
                      setNotifications((prev) => ({ ...prev, push: !prev.push }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 active:scale-[0.95] touch-manipulation",
                      notifications.push
                        ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
                        : "bg-muted/30 border-border/50 hover:border-border"
                    )}
                  >
                    <Smartphone
                      className={cn(
                        "w-5 h-5",
                        notifications.push ? "text-sky-500" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-xs font-medium">Push</span>
                  </button>
                  <button type="button"
                    onClick={() =>
                      setNotifications((prev) => ({ ...prev, sms: !prev.sms }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 active:scale-[0.95] touch-manipulation",
                      notifications.sms
                        ? "bg-sky-500/10 border-sky-500/40 shadow-sm"
                        : "bg-muted/30 border-border/50 hover:border-border"
                    )}
                  >
                    <Bell
                      className={cn(
                        "w-5 h-5",
                        notifications.sms ? "text-sky-500" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-xs font-medium">SMS</span>
                  </button>
                </div>
              </div>

              {/* Flexible Dates Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-foreground" />
                  <div>
                    <p className="text-sm font-medium">Flexible Dates</p>
                    <p className="text-xs text-muted-foreground">±3 days around your dates</p>
                  </div>
                </div>
                <Switch
                  checked={flexibleDates}
                  onCheckedChange={setFlexibleDates}
                />
              </div>

              {/* Create Alert Button */}
              <Button
                onClick={handleCreateAlert}
                className="w-full h-12 rounded-xl hover:hover:text-primary-foreground font-semibold shadow-lg active:scale-[0.97] transition-all duration-200 touch-manipulation bg-foreground"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create Price Alert
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We'll email you when prices for this route drop below ${targetPrice}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FlightPriceAlert;
