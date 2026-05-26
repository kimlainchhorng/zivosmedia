import { useState, useEffect } from "react";
import { Bell, Clock, CheckCircle2, Plane, ExternalLink, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface CheckInReminderWidgetProps {
  className?: string;
  flightNumber?: string;
  departureTime?: Date;
  checkInOpens?: Date;
  airline?: string;
  defaultNotifications?: NotificationPreferences;
  onCheckIn?: () => void;
  onNotificationChange?: (prefs: NotificationPreferences) => void;
}

const CheckInReminderWidget = ({ 
  className, 
  flightNumber = "AA 1234",
  departureTime,
  checkInOpens,
  airline = "American Airlines",
  defaultNotifications = { email: true, push: true, sms: false },
  onCheckIn,
  onNotificationChange
}: CheckInReminderWidgetProps) => {
  // Default to 26 hours and 2 hours from now if not provided
  const defaultDepartureTime = new Date(Date.now() + 26 * 60 * 60 * 1000);
  const defaultCheckInOpens = new Date(Date.now() + 2 * 60 * 60 * 1000);
  
  const actualDepartureTime = departureTime || defaultDepartureTime;
  const actualCheckInOpens = checkInOpens || defaultCheckInOpens;

  const [timeUntilCheckIn, setTimeUntilCheckIn] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);

  const checkInOpen = new Date() >= actualCheckInOpens;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = actualCheckInOpens.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeUntilCheckIn({ hours, minutes, seconds });
      } else {
        setTimeUntilCheckIn({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [actualCheckInOpens]);

  const handleNotificationChange = (key: keyof NotificationPreferences, checked: boolean) => {
    const newPrefs = { ...notifications, [key]: checked };
    setNotifications(newPrefs);
    onNotificationChange?.(newPrefs);
  };

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Check-In Reminder</h3>
        </div>
        <Badge 
          className={checkInOpen 
            ? "bg-emerald-500/10 text-emerald-400" 
            : "bg-amber-500/10 text-amber-400"
          }
        >
          {checkInOpen ? "Open Now" : "Coming Soon"}
        </Badge>
      </div>

      {/* Flight Info */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Plane className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{flightNumber}</p>
          <p className="text-xs text-muted-foreground">{airline}</p>
        </div>
      </div>

      {/* Countdown or Check-In Button */}
      {checkInOpen ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-emerald-400 mb-1">Check-In is Open!</p>
          <p className="text-xs text-muted-foreground mb-3">
            Complete your check-in now to select your seat and get your boarding pass.
          </p>
          <Button className="w-full gap-2" onClick={onCheckIn}>
            <ExternalLink className="w-4 h-4" />
            Check In Now
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/30 border border-border/30 mb-4">
          <p className="text-xs text-muted-foreground text-center mb-2">Check-in opens in</p>
          <div className="flex items-center justify-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 min-w-12 text-center">
              <p className="text-xl font-bold text-primary">{String(timeUntilCheckIn.hours).padStart(2, '0')}</p>
              <p className="text-[10px] text-muted-foreground">HRS</p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="p-2 rounded-xl bg-primary/10 min-w-12 text-center">
              <p className="text-xl font-bold text-primary">{String(timeUntilCheckIn.minutes).padStart(2, '0')}</p>
              <p className="text-[10px] text-muted-foreground">MIN</p>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="p-2 rounded-xl bg-primary/10 min-w-12 text-center">
              <p className="text-xl font-bold text-primary">{String(timeUntilCheckIn.seconds).padStart(2, '0')}</p>
              <p className="text-[10px] text-muted-foreground">SEC</p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Remind me via</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Push notification</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Push Notification</span>
            </div>
            <Switch 
              checked={notifications.push}
              onCheckedChange={(checked) => handleNotificationChange('push', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">SMS</span>
            </div>
            <Switch 
              checked={notifications.sms}
              onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Check-In Timeline</p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              checkInOpen ? "bg-emerald-500" : "bg-muted-foreground"
            )} />
            <span>Online check-in opens (24h before)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span>Airport check-in opens (3h before)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span>Check-in closes (45min before)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInReminderWidget;
