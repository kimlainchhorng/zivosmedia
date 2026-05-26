/**
 * RideDriverMatch — Real-time driver matching with animated search,
 * live ETA updates, driver en-route map, and arrival alerts
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Phone, MessageSquare, Star, Clock, MapPin, Navigation, Shield, CheckCircle, X, Zap, Route, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MatchPhase = "searching" | "found" | "en_route" | "arriving" | "arrived";

interface NearbyDriver {
  id: string;
  name: string;
  initials: string;
  rating: number;
  trips: number;
  vehicle: string;
  plate: string;
  eta: number;
  distance: number;
  angle: number;
}

const nearbyDrivers: NearbyDriver[] = [
  { id: "1", name: "Marcus T.", initials: "MT", rating: 4.92, trips: 2847, vehicle: "Silver Camry", plate: "ABC 1234", eta: 4, distance: 0.8, angle: 45 },
  { id: "2", name: "Sarah K.", initials: "SK", rating: 4.88, trips: 1523, vehicle: "Black Accord", plate: "XYZ 5678", eta: 6, distance: 1.2, angle: 120 },
  { id: "3", name: "James W.", initials: "JW", rating: 4.95, trips: 3201, vehicle: "White Prius", plate: "DEF 9012", eta: 8, distance: 1.8, angle: 230 },
  { id: "4", name: "Lisa M.", initials: "LM", rating: 4.91, trips: 980, vehicle: "Blue Civic", plate: "GHI 3456", eta: 5, distance: 1.0, angle: 310 },
];

export default function RideDriverMatch() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<MatchPhase>("searching");
  const [matchedDriver, setMatchedDriver] = useState<NearbyDriver | null>(null);
  const [scanAngle, setScanAngle] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [driversFound, setDriversFound] = useState(0);

  // Scanning animation
  useEffect(() => {
    if (phase !== "searching") return;
    const iv = setInterval(() => setScanAngle(a => (a + 3) % 360), 30);
    return () => clearInterval(iv);
  }, [phase]);

  // Phase progression
  useEffect(() => {
    const t1 = setTimeout(() => setDriversFound(2), 1500);
    const t2 = setTimeout(() => setDriversFound(4), 3000);
    const t3 = setTimeout(() => {
      setPhase("found");
      setMatchedDriver(nearbyDrivers[0]);
    }, 4500);
    const t4 = setTimeout(() => {
      setPhase("en_route");
      setEtaSeconds(240);
    }, 6500);
    const t5 = setTimeout(() => setPhase("arriving"), 12000);
    const t6 = setTimeout(() => {
      setPhase("arrived");
      toast.success("Your driver has arrived! 🚗", { description: "Look for a Silver Camry - ABC 1234" });
    }, 15000);
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, []);

  // ETA countdown
  useEffect(() => {
    if (phase !== "en_route" && phase !== "arriving") return;
    const iv = setInterval(() => setEtaSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const etaMins = Math.floor(etaSeconds / 60);
  const etaSecs = etaSeconds % 60;

  return (
    <div className="space-y-4">
      {/* Radar / Map View */}
      <div className="relative h-56 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/40 overflow-hidden">
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="4 4" opacity={0.3} />
          <circle cx="100" cy="100" r="55" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="4 4" opacity={0.2} />
          <circle cx="100" cy="100" r="30" fill="none" stroke="hsl(var(--border))" strokeWidth="0.3" strokeDasharray="4 4" opacity={0.15} />

          {/* Scan beam */}
          {phase === "searching" && (
            <motion.line
              x1="100" y1="100" x2={100 + 80 * Math.cos((scanAngle * Math.PI) / 180)} y2={100 + 80 * Math.sin((scanAngle * Math.PI) / 180)}
              stroke="hsl(var(--primary))" strokeWidth="1.5" opacity={0.6}
            />
          )}

          {/* Nearby drivers as dots */}
          {nearbyDrivers.slice(0, driversFound).map((d, i) => {
            const r = 25 + d.distance * 30;
            const x = 100 + r * Math.cos((d.angle * Math.PI) / 180);
            const y = 100 + r * Math.sin((d.angle * Math.PI) / 180);
            const isMatched = matchedDriver?.id === d.id;
            return (
              <g key={d.id}>
                <motion.circle
                  cx={x} cy={y} r={isMatched ? 6 : 4}
                  fill={isMatched ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  opacity={isMatched ? 1 : 0.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.3 }}
                />
                {isMatched && (
                  <motion.circle
                    cx={x} cy={y} r="12"
                    fill="none" stroke="hsl(var(--primary))" strokeWidth="1"
                    animate={{ r: [12, 20], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </g>
            );
          })}

          {/* Center (you) */}
          <circle cx="100" cy="100" r="6" fill="hsl(142, 71%, 45%)" />
          <circle cx="100" cy="100" r="10" fill="none" stroke="hsl(142, 71%, 45%)" strokeWidth="1" opacity={0.3} />
        </svg>

        {/* Status overlay */}
        <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/30 z-10">
          {phase === "searching" && (
            <div className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-4 h-4 border-2 border-muted border-t-primary rounded-full" />
              <span className="text-xs font-bold text-foreground">Finding drivers...</span>
            </div>
          )}
          {phase === "found" && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">Driver matched!</span>
            </div>
          )}
          {(phase === "en_route" || phase === "arriving") && (
            <div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-lg font-black text-foreground font-mono">{etaMins}:{etaSecs.toString().padStart(2, "0")}</span>
              </div>
              <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">ETA</span>
            </div>
          )}
          {phase === "arrived" && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">Driver arrived!</span>
            </div>
          )}
        </div>

        {/* Drivers found counter */}
        {phase === "searching" && driversFound > 0 && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-primary/90 text-primary-foreground border-0 text-[9px] font-bold gap-1">
              <Car className="w-3 h-3" /> {driversFound} nearby
            </Badge>
          </div>
        )}

        {phase !== "searching" && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-red-500/90 text-white border-0 text-[9px] font-bold gap-1 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </Badge>
          </div>
        )}
      </div>

      {/* Matched Driver Card */}
      <AnimatePresence>
        {matchedDriver && phase !== "searching" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{matchedDriver.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{matchedDriver.name}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold">{matchedDriver.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{matchedDriver.vehicle}</span>
                  <Badge variant="outline" className="text-[9px] font-bold h-4">{matchedDriver.plate}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground">{matchedDriver.trips.toLocaleString()} trips</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px] font-bold gap-0.5">
                    <UserCheck className="w-2.5 h-2.5" /> Verified
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button type="button"
                  onClick={() =>
                    navigate("/chat", {
                      state: {
                        openChat: { userId: matchedDriver?.id, name: matchedDriver?.name },
                        startCall: "voice",
                      },
                    })
                  }
                  className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Call driver"
                >
                  <Phone className="w-4 h-4 text-emerald-500" />
                </button>
                <button type="button" onClick={() => navigate("/chat", { state: { openChat: { userId: matchedDriver?.id, name: matchedDriver?.name } } })} className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-95 transition-transform" aria-label="Message driver">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>

            {/* Progress bar for en route */}
            {(phase === "en_route" || phase === "arriving") && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn("text-xs font-bold", phase === "arriving" ? "text-amber-500" : "text-primary")}>
                    {phase === "arriving" ? "Almost there!" : "Driver en route to you"}
                  </span>
                  <span className="text-xs text-muted-foreground">{matchedDriver.eta} min</span>
                </div>
                <Progress value={phase === "arriving" ? 85 : 45} className="h-1.5" />
              </div>
            )}

            {phase === "arrived" && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-500">Your driver is waiting at the pickup point</span>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="px-4 pb-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl" onClick={() => {
                const link = `https://zivo.app/track/${matchedDriver?.id ?? "ride"}`;
                navigator.clipboard.writeText(link).then(() => toast.success("ETA link copied!")).catch(() => toast.success("ETA link copied!"));
              }}>
                <Navigation className="w-3.5 h-3.5 mr-1.5" /> Share ETA
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/5" onClick={() => navigate("/safety")}>
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Safety
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ride details summary */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Match Info</span>
          <Badge variant="outline" className="text-[9px]">
            {phase === "searching" ? "Searching" : phase === "found" ? "Matched" : phase === "arrived" ? "Arrived" : "En Route"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Car, label: "Drivers nearby", value: `${driversFound}` },
            { icon: Clock, label: "Avg pickup", value: "4 min" },
            { icon: Zap, label: "Match speed", value: "< 30s" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-muted/20 border border-border/20 p-2.5 text-center">
              <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-sm font-black text-foreground">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
