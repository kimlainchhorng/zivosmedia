import { Clock, AlertTriangle, CheckCircle2, TrendingUp, Plane, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const flightStats = {
  flightNumber: "AA 2847",
  route: "JFK → LAX",
  onTimeRate: 87,
  avgDelay: 12,
  cancellationRate: 1.2,
  factors: [
    { name: "Weather Impact", risk: "low", percentage: 15 },
    { name: "Airport Congestion", risk: "medium", percentage: 35 },
    { name: "Airline Performance", risk: "low", percentage: 20 },
    { name: "Aircraft Type", risk: "low", percentage: 10 },
  ],
};

const FlightDelayPredictor = () => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-400 bg-green-500/20";
      case "medium": return "text-yellow-400 bg-yellow-500/20";
      case "high": return "text-red-400 bg-red-500/20";
      default: return "text-muted-foreground bg-muted/20";
    }
  };

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-orange-500/20 text-orange-400 border-orange-500/30">
            <Clock className="w-3 h-3 mr-1" /> On-Time Predictor
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Flight Delay Intelligence
          </h2>
          <p className="text-muted-foreground">AI-powered predictions based on historical data</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Stats */}
          <div className="md:col-span-2 bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold">{flightStats.flightNumber}</h3>
                  <p className="text-sm text-muted-foreground">{flightStats.route}</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Low Risk
              </Badge>
            </div>

            {/* On-Time Performance */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">On-Time Performance</span>
                <span className="text-2xl font-bold text-green-400">{flightStats.onTimeRate}%</span>
              </div>
              <Progress value={flightStats.onTimeRate} className="h-3" />
            </div>

            {/* Risk Factors */}
            <h4 className="font-semibold mb-4">Delay Risk Factors</h4>
            <div className="space-y-3">
              {flightStats.factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    {index === 0 && <CloudRain className="w-5 h-5 text-blue-400" />}
                    {index === 1 && <TrendingUp className="w-5 h-5 text-orange-400" />}
                    {index === 2 && <Plane className="w-5 h-5 text-foreground" />}
                    {index === 3 && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    <span className="text-sm">{factor.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${factor.risk === 'low' ? 'bg-green-500' : factor.risk === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${factor.percentage}%` }}
                      />
                    </div>
                    <Badge className={`text-xs ${getRiskColor(factor.risk)}`}>
                      {factor.risk}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 p-5">
              <CheckCircle2 className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-3xl font-bold text-green-400">{flightStats.onTimeRate}%</h3>
              <p className="text-sm text-muted-foreground">On-Time Arrivals</p>
            </div>

            <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/50 p-5">
              <Clock className="w-6 h-6 text-yellow-400 mb-2" />
              <h3 className="text-2xl font-bold">{flightStats.avgDelay} min</h3>
              <p className="text-sm text-muted-foreground">Average Delay</p>
            </div>

            <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/50 p-5">
              <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
              <h3 className="text-2xl font-bold">{flightStats.cancellationRate}%</h3>
              <p className="text-sm text-muted-foreground">Cancellation Rate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightDelayPredictor;
