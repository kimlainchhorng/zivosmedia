import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const forecast = [
  { day: "Today", temp: 72, high: 75, low: 65, icon: Sun, condition: "Sunny" },
  { day: "Tue", temp: 68, high: 70, low: 62, icon: Cloud, condition: "Cloudy" },
  { day: "Wed", temp: 65, high: 68, low: 58, icon: CloudRain, condition: "Rain" },
  { day: "Thu", temp: 70, high: 73, low: 63, icon: Sun, condition: "Sunny" },
  { day: "Fri", temp: 74, high: 78, low: 66, icon: Sun, condition: "Sunny" },
];

const WeatherWidget = () => {
  const CurrentIcon = forecast[0].icon;
  
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-border p-6 overflow-hidden relative bg-secondary">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-400/20 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              {/* Current Weather */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <CurrentIcon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <Badge className="mb-1 bg-secondary text-foreground border-border">
                    Los Angeles, CA
                  </Badge>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold">{forecast[0].temp}°</span>
                    <span className="text-muted-foreground mb-2">F</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{forecast[0].condition}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="text-center p-3 rounded-xl bg-card/50">
                  <Thermometer className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Feels Like</p>
                  <p className="font-bold">74°F</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/50">
                  <Wind className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-bold">8 mph</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/50">
                  <Droplets className="w-5 h-5 text-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-bold">45%</p>
                </div>
              </div>
            </div>

            {/* 5-Day Forecast */}
            <div className="grid grid-cols-5 gap-2 pt-4 border-t border-border/50">
              {forecast.map((day, index) => {
                const Icon = day.icon;
                return (
                  <div 
                    key={index} 
                    className={`text-center p-3 rounded-xl transition-colors ${
                      index === 0 ? "bg-primary/20 border border-primary/30" : "hover:bg-muted/30"
                    }`}
                  >
                    <p className="text-xs font-medium mb-2">{day.day}</p>
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${
                      day.condition === 'Sunny' ? 'text-yellow-400' :
                      day.condition === 'Cloudy' ? 'text-muted-foreground' : 'text-blue-400'
                    }`} />
                    <p className="font-bold text-sm">{day.high}°</p>
                    <p className="text-xs text-muted-foreground">{day.low}°</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeatherWidget;
