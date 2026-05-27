import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Sun, Moon, Sunrise, Sunset, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const timeZones = [
  { id: "America/New_York", name: "New York", abbr: "EST", offset: -5, code: "US" },
  { id: "America/Los_Angeles", name: "Los Angeles", abbr: "PST", offset: -8, code: "US" },
  { id: "Europe/London", name: "London", abbr: "GMT", offset: 0, code: "GB" },
  { id: "Europe/Paris", name: "Paris", abbr: "CET", offset: 1, code: "FR" },
  { id: "Asia/Tokyo", name: "Tokyo", abbr: "JST", offset: 9, code: "JP" },
  { id: "Asia/Dubai", name: "Dubai", abbr: "GST", offset: 4, code: "AE" },
  { id: "Asia/Singapore", name: "Singapore", abbr: "SGT", offset: 8, code: "SG" },
  { id: "Australia/Sydney", name: "Sydney", abbr: "AEST", offset: 10, code: "AU" }
];

export default function TimeZoneConverter() {
  const [fromZone, setFromZone] = useState("America/New_York");
  const [toZone, setToZone] = useState("Europe/London");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTimeInZone = (zone: typeof timeZones[0]) => {
    const utc = currentTime.getTime() + currentTime.getTimezoneOffset() * 60000;
    return new Date(utc + zone.offset * 3600000);
  };

  const fromZoneData = timeZones.find(z => z.id === fromZone)!;
  const toZoneData = timeZones.find(z => z.id === toZone)!;
  
  const fromTime = getTimeInZone(fromZoneData);
  const toTime = getTimeInZone(toZoneData);

  const getTimeOfDay = (hour: number) => {
    if (hour >= 6 && hour < 12) return { icon: Sunrise, label: "Morning", color: "text-amber-400" };
    if (hour >= 12 && hour < 17) return { icon: Sun, label: "Afternoon", color: "text-yellow-400" };
    if (hour >= 17 && hour < 20) return { icon: Sunset, label: "Evening", color: "text-orange-400" };
    return { icon: Moon, label: "Night", color: "text-blue-400" };
  };

  const fromTimeOfDay = getTimeOfDay(fromTime.getHours());
  const toTimeOfDay = getTimeOfDay(toTime.getHours());

  const hoursDiff = toZoneData.offset - fromZoneData.offset;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary">
            <Clock className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Time Zone Converter</CardTitle>
            <p className="text-sm text-muted-foreground">Plan across time zones</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* From Zone */}
          <div className="space-y-3">
            <Select value={fromZone} onValueChange={setFromZone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id}>
                    {tz.code} · {tz.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <div className={cn("flex items-center justify-center gap-2 mb-2", fromTimeOfDay.color)}>
                <fromTimeOfDay.icon className="w-5 h-5" />
                <span className="text-sm">{fromTimeOfDay.label}</span>
              </div>
              <p className="text-3xl font-bold font-mono">
                {fromTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fromZoneData.abbr} (UTC{fromZoneData.offset >= 0 ? '+' : ''}{fromZoneData.offset})
              </p>
            </div>
          </div>

          {/* To Zone */}
          <div className="space-y-3">
            <Select value={toZone} onValueChange={setToZone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((tz) => (
                  <SelectItem key={tz.id} value={tz.id}>
                    {tz.code} · {tz.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
              <div className={cn("flex items-center justify-center gap-2 mb-2", toTimeOfDay.color)}>
                <toTimeOfDay.icon className="w-5 h-5" />
                <span className="text-sm">{toTimeOfDay.label}</span>
              </div>
              <p className="text-3xl font-bold font-mono">
                {toTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {toZoneData.abbr} (UTC{toZoneData.offset >= 0 ? '+' : ''}{toZoneData.offset})
              </p>
            </div>
          </div>
        </div>

        {/* Difference Info */}
        <div className="p-3 rounded-lg bg-secondary border border-border text-center">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>{fromZoneData.name}</span>
            <ArrowRight className="w-4 h-4" />
            <span>{toZoneData.name}</span>
          </div>
          <p className="text-lg font-bold text-foreground mt-1">
            {hoursDiff >= 0 ? '+' : ''}{hoursDiff} hours
          </p>
        </div>

        {/* Quick Reference */}
        <div className="space-y-2">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider">Quick Reference</h4>
          <div className="grid grid-cols-4 gap-2">
            {["06:00", "12:00", "18:00", "00:00"].map((time) => {
              const [hours] = time.split(':').map(Number);
              const adjustedHour = (hours + hoursDiff + 24) % 24;
              return (
                <div key={time} className="p-2 rounded-lg bg-muted/30 text-center text-xs">
                  <p className="text-muted-foreground">{time}</p>
                  <p className="font-medium">
                    {adjustedHour.toString().padStart(2, '0')}:00
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
