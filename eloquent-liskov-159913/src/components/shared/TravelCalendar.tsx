import { Calendar, Sun, Cloud, Snowflake, Leaf, TrendingDown, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const months = [
  { name: "Jan", season: "winter", priceLevel: "low", weather: "cold" },
  { name: "Feb", season: "winter", priceLevel: "low", weather: "cold" },
  { name: "Mar", season: "spring", priceLevel: "medium", weather: "mild" },
  { name: "Apr", season: "spring", priceLevel: "medium", weather: "mild" },
  { name: "May", season: "spring", priceLevel: "medium", weather: "warm" },
  { name: "Jun", season: "summer", priceLevel: "high", weather: "hot" },
  { name: "Jul", season: "summer", priceLevel: "peak", weather: "hot" },
  { name: "Aug", season: "summer", priceLevel: "peak", weather: "hot" },
  { name: "Sep", season: "autumn", priceLevel: "medium", weather: "warm" },
  { name: "Oct", season: "autumn", priceLevel: "low", weather: "mild" },
  { name: "Nov", season: "autumn", priceLevel: "low", weather: "cold" },
  { name: "Dec", season: "winter", priceLevel: "high", weather: "cold" },
];

const priceColors: Record<string, string> = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  peak: "bg-red-500/20 text-red-400 border-red-500/30",
};

const weatherIcons: Record<string, React.ReactNode> = {
  cold: <Snowflake className="w-4 h-4 text-foreground" />,
  mild: <Cloud className="w-4 h-4 text-muted-foreground" />,
  warm: <Leaf className="w-4 h-4 text-emerald-400" />,
  hot: <Sun className="w-4 h-4 text-amber-400" />,
};

const TravelCalendar = () => {
  const currentMonth = new Date().getMonth();

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-secondary text-foreground border-border">
            <Calendar className="w-3 h-3 mr-1" /> Best Time to Travel
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Travel Price Calendar
          </h2>
          <p className="text-muted-foreground">Find the cheapest months to travel and save big</p>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6 mb-6">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {months.map((month, index) => (
              <div
                key={month.name}
                className={cn(
                  "relative p-3 rounded-xl border text-center transition-all duration-200 hover:scale-110 hover:shadow-lg touch-manipulation active:scale-95",
                  priceColors[month.priceLevel],
                  index === currentMonth && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {index === currentMonth && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-medium">
                    Now
                  </div>
                )}
                <p className="font-bold mb-1">{month.name}</p>
                <div className="flex justify-center mb-1">
                  {weatherIcons[month.weather]}
                </div>
                <p className="text-[10px] capitalize">{month.priceLevel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {[
            { level: "low", label: "Low Season", icon: TrendingDown },
            { level: "medium", label: "Shoulder Season", icon: null },
            { level: "high", label: "High Season", icon: TrendingUp },
            { level: "peak", label: "Peak Season", icon: TrendingUp },
          ].map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded-full", priceColors[item.level].split(" ")[0])} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { 
              title: "Best for Budget", 
              months: "Jan-Feb, Oct-Nov", 
              tip: "Prices drop 30-50% from peak",
              color: "green" 
            },
            { 
              title: "Best Weather", 
              months: "May-Sep", 
              tip: "Ideal conditions but higher prices",
              color: "amber" 
            },
            { 
              title: "Sweet Spot", 
              months: "Mar-Apr, Sep", 
              tip: "Good balance of price & weather",
              color: "violet" 
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                tip.color === "green" && "bg-green-500/10 border-green-500/20",
                tip.color === "amber" && "bg-amber-500/10 border-amber-500/20",
                tip.color === "violet" && "bg-violet-500/10 border-violet-500/20"
              )}
            >
              <div className="flex items-start gap-3">
                <Info className={cn(
                  "w-5 h-5 flex-shrink-0 mt-0.5",
                  tip.color === "green" && "text-green-400",
                  tip.color === "amber" && "text-amber-400",
                  tip.color === "violet" && "text-violet-400"
                )} />
                <div>
                  <p className="font-bold text-sm">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">{tip.months}</p>
                  <p className="text-xs mt-1">{tip.tip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TravelCalendar;
