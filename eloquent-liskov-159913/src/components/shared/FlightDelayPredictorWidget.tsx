import { Clock, AlertTriangle, CheckCircle2, TrendingUp, Plane, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ImpactLevel = "low" | "medium" | "high";

interface DelayFactor {
  factor: string;
  impact: ImpactLevel;
  description: string;
}

interface FlightDelayPredictorWidgetProps {
  className?: string;
  flightNumber?: string;
  route?: string;
  onTimeScore?: number;
  avgDelay?: number;
  historicalFlights?: number;
  delayFactors?: DelayFactor[];
}

const defaultDelayFactors: DelayFactor[] = [
  { factor: "Weather", impact: "low", description: "Clear conditions expected" },
  { factor: "Air Traffic", impact: "medium", description: "Moderate congestion at destination" },
  { factor: "Airline History", impact: "low", description: "92% on-time for this route" },
  { factor: "Time of Day", impact: "low", description: "Morning flights have fewer delays" },
];

const impactColors: Record<ImpactLevel, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
  high: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-500" },
};

const FlightDelayPredictorWidget = ({ 
  className, 
  flightNumber = "AA 1234",
  route = "JFK → LAX",
  onTimeScore = 87,
  avgDelay = 12,
  historicalFlights = 500,
  delayFactors = defaultDelayFactors
}: FlightDelayPredictorWidgetProps) => {
  const riskLevel = onTimeScore >= 80 ? "low" : onTimeScore >= 60 ? "medium" : "high";
  const riskConfig = {
    low: { icon: CheckCircle2, label: "Low Delay Risk", message: "This flight has a strong on-time record. Minimal delays expected.", color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
    medium: { icon: AlertTriangle, label: "Moderate Delay Risk", message: "Some delays possible. Consider arriving early.", color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
    high: { icon: AlertTriangle, label: "High Delay Risk", message: "Significant delays likely. Plan accordingly and check for updates.", color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
  };

  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Delay Predictor</h3>
        </div>
        <Badge variant="outline" className="text-xs">AI-Powered</Badge>
      </div>

      {/* Flight Info */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 mb-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Plane className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{flightNumber}</p>
          <p className="text-xs text-muted-foreground">{route}</p>
        </div>
      </div>

      {/* On-Time Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">On-Time Probability</span>
          <span className={cn(
            "font-bold text-lg",
            onTimeScore >= 80 ? "text-emerald-400" : onTimeScore >= 60 ? "text-amber-400" : "text-red-400"
          )}>
            {onTimeScore}%
          </span>
        </div>
        <Progress 
          value={onTimeScore} 
          className="h-2"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">Based on {historicalFlights.toLocaleString()}+ historical flights</span>
          <span className="text-[10px] text-muted-foreground">Avg delay: {avgDelay} min</span>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={cn("p-3 rounded-xl border mb-4", risk.bg)}>
        <div className="flex items-center gap-2">
          <RiskIcon className={cn("w-4 h-4", risk.color)} />
          <span className={cn("text-sm font-medium", risk.color)}>{risk.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {risk.message}
        </p>
      </div>

      {/* Delay Factors */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Contributing Factors</p>
        <div className="space-y-2">
          {delayFactors.map((item, i) => {
            const colors = impactColors[item.impact];
            return (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/20 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                  <span className="text-sm">{item.factor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:block">{item.description}</span>
                  <Badge className={cn("text-[10px]", colors.bg, colors.text)}>
                    {item.impact}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 mt-4 p-2 rounded-xl bg-primary/5 text-xs">
        <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">Pro tip:</span> Arrive 2h early for domestic, 3h for international to account for any unexpected delays.
        </p>
      </div>
    </div>
  );
};

export default FlightDelayPredictorWidget;
