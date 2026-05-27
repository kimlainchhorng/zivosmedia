/**
 * DriverProfileCard — Rich driver profile with ratings, vehicle, favorites, ride history
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, Car, Shield, Award, Clock, ThumbsUp, MapPin, Phone, MessageSquare, ChevronRight, Sparkles, CheckCircle, Users, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const driverData = {
  name: "Marcus Thompson",
  initials: "MT",
  rating: 4.92,
  totalTrips: 2847,
  yearsActive: 3,
  memberSince: "Jan 2023",
  languages: ["English", "Spanish"],
  badges: [
    { icon: Award, label: "Top Driver", color: "text-amber-500" },
    { icon: Shield, label: "Safety Pro", color: "text-emerald-500" },
    { icon: Sparkles, label: "5-Star Streak", color: "text-primary" },
  ],
  vehicle: {
    make: "Toyota Camry",
    year: 2023,
    color: "Silver",
    plate: "ABC 1234",
    features: ["Leather seats", "USB chargers", "AC", "Dashcam"],
  },
  stats: {
    onTime: 98,
    acceptance: 95,
    cancellation: 2,
  },
  recentReviews: [
    { rating: 5, text: "Great driver, very professional!", date: "2 days ago" },
    { rating: 5, text: "Smooth ride, arrived early", date: "1 week ago" },
    { rating: 4, text: "Nice car, good conversation", date: "2 weeks ago" },
  ],
  rideHistory: [
    { date: "Yesterday", route: "Home → Airport", price: "$28.50", rating: 5 },
    { date: "Last week", route: "Downtown → Office", price: "$14.20", rating: 5 },
  ],
};

const PREF_DRIVERS_KEY = "zivo_preferred_drivers";

export default function DriverProfileCard() {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(PREF_DRIVERS_KEY) || "[]") as string[]).includes(driverData.name); } catch { return false; }
  });
  const [showReviews, setShowReviews] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const d = driverData;

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="rounded-2xl bg-card border border-border/40 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-br from-primary/10 to-emerald-500/10" />
        <div className="relative flex items-start gap-4 pt-4">
          <Avatar className="w-16 h-16 border-3 border-card shadow-lg">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{d.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">{d.name}</h2>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-foreground">{d.rating}</span>
              </div>
              <span className="text-xs text-muted-foreground">· {d.totalTrips.toLocaleString()} trips · {d.yearsActive}+ years</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {d.badges.map(b => (
                <Badge key={b.label} variant="outline" className={cn("text-[9px] font-bold gap-1 py-0.5 border-border/30", b.color)}>
                  <b.icon className="w-2.5 h-2.5" /> {b.label}
                </Badge>
              ))}
            </div>
          </div>
          <button type="button"
            onClick={() => { setIsFavorite(!isFavorite); toast.success(isFavorite ? "Removed from favorites" : "Added to favorites!"); }}
            className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center active:scale-90 transition-transform min-w-[44px] min-h-[44px]"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("w-5 h-5 transition-colors", isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "On-time", value: `${d.stats.onTime}%`, color: "text-emerald-500" },
          { label: "Acceptance", value: `${d.stats.acceptance}%`, color: "text-primary" },
          { label: "Cancellation", value: `${d.stats.cancellation}%`, color: "text-amber-500" },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card border border-border/40 p-3 text-center">
            <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Vehicle */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle</h3>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
            <Car className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{d.vehicle.year} {d.vehicle.make}</p>
            <p className="text-[10px] text-muted-foreground">{d.vehicle.color} · {d.vehicle.plate}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.vehicle.features.map(f => (
            <Badge key={f} variant="secondary" className="text-[9px] font-bold">{f}</Badge>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Reviews</h3>
          <button type="button" onClick={() => setShowReviews(!showReviews)} className="text-[10px] font-bold text-primary">
            {showReviews ? "Show less" : "View all"}
          </button>
        </div>
        {d.recentReviews.slice(0, showReviews ? 3 : 2).map((r, i) => (
          <div key={i} className="flex items-start gap-3 pb-2 border-b border-border/20 last:border-0 last:pb-0">
            <div className="flex gap-0.5 mt-0.5 shrink-0">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star key={j} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div>
              <p className="text-xs text-foreground">{r.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{r.date}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ride history with this driver */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Your Rides Together
        </h3>
        {d.rideHistory.map((rh, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{rh.route}</p>
              <p className="text-[10px] text-muted-foreground">{rh.date}</p>
            </div>
            <span className="text-xs font-bold text-foreground">{rh.price}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: rh.rating }).map((_, j) => (
                <Star key={j} className="w-2 h-2 text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1 h-11 rounded-xl text-xs font-bold gap-1.5"
          onClick={() => {
            try {
              const saved: string[] = JSON.parse(localStorage.getItem(PREF_DRIVERS_KEY) || "[]");
              if (!saved.includes(d.name)) saved.push(d.name);
              localStorage.setItem(PREF_DRIVERS_KEY, JSON.stringify(saved));
            } catch {}
            setIsFavorite(true);
            toast.success(`${d.name} saved as preferred driver`);
          }}
        >
          <Users className="w-3.5 h-3.5" /> {isFavorite ? "Driver Saved ✓" : "Request This Driver"}
        </Button>
        <Button variant="outline" className="h-11 rounded-xl text-xs font-bold px-4 gap-1.5" onClick={() => setShowReport(true)}>
          <Flag className="w-3.5 h-3.5" /> Report
        </Button>
      </div>

      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-destructive">Report Driver</p>
              <button type="button" onClick={() => setShowReport(false)} className="p-1 rounded-lg hover:bg-muted/60"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Rude behavior", "Unsafe driving", "Wrong route", "Vehicle issue", "Other"].map((r) => (
                <button type="button" key={r} onClick={() => setReportReason(r)}
                  className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    reportReason === r ? "bg-destructive text-destructive-foreground border-destructive" : "border-border text-muted-foreground hover:border-destructive/50")}>
                  {r}
                </button>
              ))}
            </div>
            <Button size="sm" variant="destructive" className="w-full"
              disabled={!reportReason}
              onClick={() => {
                toast.success(`Report submitted: ${reportReason}`);
                setShowReport(false);
                setReportReason("");
              }}>
              Submit Report
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
