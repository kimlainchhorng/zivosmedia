import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bell,
  BellRing,
  BellOff,
  TrendingDown,
  TrendingUp,
  Plane,
  Calendar,
  Mail,
  Trash2,
  RefreshCw,
  Zap,
  ChevronRight,
  Settings,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import type { PriceAlert } from '@/hooks/usePriceAlerts';
import { format, formatDistanceToNow } from 'date-fns';

interface PriceAlertsDashboardProps {
  className?: string;
  onBookNow?: (alert: PriceAlert) => void;
}

export function PriceAlertsDashboard({ className, onBookNow }: PriceAlertsDashboardProps) {
  const { alerts, removeAlert, checkAlerts, activeAlertsCount } = usePriceAlerts();
  const [isChecking, setIsChecking] = useState(false);
  const [showTriggered, setShowTriggered] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'savings'>('date');

  const handleCheckAlerts = async () => {
    setIsChecking(true);
    await checkAlerts();
    setTimeout(() => setIsChecking(false), 1000);
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.targetPrice - b.targetPrice;
      case 'savings':
        const savingsA = a.currentPrice - a.targetPrice;
        const savingsB = b.currentPrice - b.targetPrice;
        return savingsB - savingsA;
      case 'date':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const filteredAlerts = showTriggered 
    ? sortedAlerts 
    : sortedAlerts.filter(a => !a.triggered);

  const triggeredAlerts = alerts.filter(a => a.triggered);
  const pendingAlerts = alerts.filter(a => !a.triggered);

  if (alerts.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BellOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Price Alerts</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Set up price alerts on flight search results to get notified when prices drop below your target.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="w-5 h-5 text-primary" />
            Price Alerts
            {activeAlertsCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-0">
                {activeAlertsCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckAlerts}
              disabled={isChecking}
              className="h-8"
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", isChecking && "animate-spin")} />
              Check Now
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-primary">{pendingAlerts.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground">Triggered</p>
            <p className="text-2xl font-bold text-emerald-500">{triggeredAlerts.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-muted-foreground">Avg. Target</p>
            <p className="text-2xl font-bold text-amber-500">
              ${Math.round(alerts.reduce((sum, a) => sum + a.targetPrice, 0) / alerts.length)}
            </p>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Filters */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Switch
            id="show-triggered"
            checked={showTriggered}
            onCheckedChange={setShowTriggered}
            className="data-[state=checked]:bg-primary"
          />
          <Label htmlFor="show-triggered" className="text-xs cursor-pointer">
            Show triggered
          </Label>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Sort:</span>
          {['date', 'price', 'savings'].map((option) => (
            <button type="button"
              key={option}
              onClick={() => setSortBy(option as typeof sortBy)}
              className={cn(
                "px-2 py-1 rounded transition-colors capitalize",
                sortBy === option 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <CardContent className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-4 rounded-xl border transition-all",
                alert.triggered
                  ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30"
                  : "bg-card/50 border-border/50 hover:border-border"
              )}
            >
              {/* Route header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    alert.triggered ? "bg-emerald-500/20" : "bg-primary/20"
                  )}>
                    <Plane className={cn(
                      "w-4 h-4",
                      alert.triggered ? "text-emerald-500" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {alert.route.fromCode} → {alert.route.toCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.route.from} to {alert.route.to}
                    </p>
                  </div>
                </div>
                
                {alert.triggered ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    Price Dropped!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Monitoring
                  </Badge>
                )}
              </div>

              {/* Price info */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Target</p>
                  <p className="font-semibold text-primary">${alert.targetPrice}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                  <p className="font-semibold flex items-center gap-1">
                    ${alert.currentPrice}
                    {alert.currentPrice < alert.targetPrice ? (
                      <TrendingDown className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-red-400" />
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {alert.triggered ? 'Saved' : 'Potential'}
                  </p>
                  <p className="font-semibold text-emerald-500">
                    ${Math.max(0, alert.currentPrice - alert.targetPrice)}
                  </p>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-24">{alert.email}</span>
                </div>
                {alert.departureDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(alert.departureDate), 'MMM d')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {alert.triggered && onBookNow && (
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => onBookNow(alert)}
                  >
                    Book Now at ${alert.triggeredPrice}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => removeAlert(alert.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts match your filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PriceAlertsDashboard;