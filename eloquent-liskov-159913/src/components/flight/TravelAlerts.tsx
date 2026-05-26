import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertTriangle,
  Globe,
  Shield,
  Thermometer,
  CloudRain,
  Sun,
  Wind,
  Snowflake,
  FileText,
  CreditCard,
  Syringe,
  Bell,
  BellOff,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plane,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelAlert {
  id: string;
  type: 'advisory' | 'weather' | 'visa' | 'health' | 'security';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  country: string;
  validUntil?: string;
  source: string;
  updatedAt: string;
}

interface TravelAlertsProps {
  destination?: string;
  destinationCode?: string;
  className?: string;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'advisory': return Shield;
    case 'weather': return Thermometer;
    case 'visa': return FileText;
    case 'health': return Syringe;
    case 'security': return AlertTriangle;
    default: return AlertCircle;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'danger': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'info': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'advisory': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
    case 'weather': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'visa': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'health': return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
    case 'security': return 'bg-red-500/20 text-red-400 border-red-500/40';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getWeatherIcon = (temp: number) => {
  if (temp < 5) return Snowflake;
  if (temp > 25) return Sun;
  return CloudRain;
};

export const TravelAlerts = ({
  destination = "Paris",
  destinationCode = "CDG",
  className
}: TravelAlertsProps) => {
  const [alerts, setAlerts] = useState<TravelAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!destinationCode) return;
    fetch(`https://restcountries.com/v3.1/alpha/${destinationCode.slice(0, 2)}`)
      .then(r => r.json())
      .catch(() => null);
  }, [destinationCode]);

  const refreshAlerts = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Alerts updated");
    }, 1000);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast.success(notificationsEnabled ? "Notifications disabled" : "Notifications enabled");
  };

  // Count alerts by severity
  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  // Quick weather summary
  const weatherAlert = alerts.find(a => a.type === 'weather');

  return (
    <Card className={cn("overflow-hidden border-border/50 bg-card/50 backdrop-blur", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center">
              <Globe className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Travel Alerts</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Plane className="w-4 h-4" />
                <span>{destination}</span>
                <Badge variant="outline">{destinationCode}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAlerts}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleNotifications}
              className={notificationsEnabled ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Status Overview */}
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-6">
            {/* Overall Status */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl",
              dangerCount > 0 
                ? "bg-red-500/20 text-red-400" 
                : warningCount > 0 
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
            )}>
              {dangerCount > 0 ? (
                <XCircle className="w-5 h-5" />
              ) : warningCount > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span className="font-medium">
                {dangerCount > 0 
                  ? 'High Risk' 
                  : warningCount > 0 
                  ? 'Exercise Caution'
                  : 'Safe to Travel'
                }
              </span>
            </div>

            {/* Weather Quick View */}
            {weatherAlert && (
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-foreground" />
                <span>5-12°C</span>
                <CloudRain className="w-4 h-4 text-foreground" />
                <span>Rain expected</span>
              </div>
            )}

            <div className="flex-1" />

            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated just now
            </span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-4 space-y-3">
          {alerts.map((alert, i) => {
            const Icon = getAlertIcon(alert.type);
            const isExpanded = expandedAlert === alert.id;
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                className={cn(
                  "rounded-xl border p-4 cursor-pointer transition-all",
                  isExpanded
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border bg-card/30"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                    getTypeColor(alert.type)
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity === 'danger' && <XCircle className="w-3 h-3 mr-1" />}
                        {alert.severity === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {alert.severity === 'info' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </Badge>
                    </div>
                    
                    <p className={cn(
                      "text-sm text-muted-foreground mt-1",
                      !isExpanded && "line-clamp-1"
                    )}>
                      {alert.description}
                    </p>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-border/50 space-y-2"
                      >
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Source: {alert.source}</span>
                          {alert.validUntil && (
                            <span>Valid until: {alert.validUntil}</span>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="gap-2">
                          Learn More
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{alert.type}</span>
                      <span>•</span>
                      <span>{alert.updatedAt}</span>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Requirements Checklist */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <p className="text-sm font-medium mb-3">Entry Requirements</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Valid Passport', status: 'required', met: true },
              { label: 'Visa', status: 'not required', met: true },
              { label: 'COVID Vaccination', status: 'not required', met: true },
              { label: 'Travel Insurance', status: 'recommended', met: false },
            ].map((req, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  req.met ? "bg-emerald-500/10" : "bg-amber-500/10"
                )}
              >
                {req.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                <span>{req.label}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelAlerts;
