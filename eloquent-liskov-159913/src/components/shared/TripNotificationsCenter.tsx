import { useState } from "react";
import { 
  Bell, 
  BellOff,
  Plane,
  DollarSign,
  Clock,
  AlertTriangle,
  Check,
  Settings,
  X
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TripNotificationsCenterProps {
  className?: string;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
  category: "travel" | "price" | "alerts";
}

const defaultSettings: NotificationSetting[] = [
  { id: "flight-status", label: "Flight Status", description: "Delays, cancellations, gate changes", icon: Plane, enabled: true, category: "travel" },
  { id: "price-drops", label: "Price Drops", description: "Alerts for saved routes", icon: DollarSign, enabled: true, category: "price" },
  { id: "check-in", label: "Check-in Reminders", description: "24 hours before departure", icon: Clock, enabled: true, category: "travel" },
  { id: "weather", label: "Weather Alerts", description: "Destination weather updates", icon: AlertTriangle, enabled: false, category: "alerts" },
];

const TripNotificationsCenter = ({ className }: TripNotificationsCenterProps) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [recentNotifications] = useState([
    { id: "1", message: "Flight AA123 gate changed to B24", time: "5 min ago", read: false },
    { id: "2", message: "Price dropped $50 for NYC-Paris", time: "1 hour ago", read: true },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const enabledCount = settings.filter(s => s.enabled).length;

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {enabledCount} active
        </Badge>
      </div>

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Recent</p>
          <div className="space-y-2">
            {recentNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-xl transition-colors",
                  notif.read ? "bg-muted/20" : "bg-primary/5 border border-primary/20"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  notif.read ? "bg-muted-foreground" : "bg-primary"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground">{notif.time}</p>
                </div>
                <button type="button" className="p-1 hover:bg-muted rounded">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Settings className="w-3 h-3" />
          Preferences
        </p>
        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.id}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-4 h-4",
                  setting.enabled ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch
                checked={setting.enabled}
                onCheckedChange={() => toggleSetting(setting.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Push Permission */}
      <div className="mt-4 p-3 rounded-xl bg-muted/20 border border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs">Push notifications</span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
            <Check className="w-3 h-3 mr-1" />
            Enabled
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default TripNotificationsCenter;
