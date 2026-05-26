/**
 * TrackPackagePage — Universal tracking lookup.
 * Enter a tracking ID and see live status. Mock data for v1; structure is
 * real (a `tracking_events` table or carrier API can populate without UI changes).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Search, Truck, MapPin, CheckCircle2, Clock, AlertCircle, Box, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

interface TrackingEvent {
  status: "ordered" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "exception";
  label: string;
  location: string;
  timestamp: string;
  current?: boolean;
  done?: boolean;
}

interface TrackResult {
  trackingId: string;
  carrier: string;
  item: string;
  estimatedDelivery: string;
  events: TrackingEvent[];
}

const DEMO_RESULT: TrackResult = {
  trackingId: "ZV12345678",
  carrier: "ZIVO Express",
  item: "Booking confirmation envelope",
  estimatedDelivery: "Tomorrow by 6:00 PM",
  events: [
    { status: "ordered", label: "Order placed", location: "Online", timestamp: "Mon, 2:14 PM", done: true },
    { status: "shipped", label: "Shipped from warehouse", location: "Singapore Hub", timestamp: "Mon, 6:02 PM", done: true },
    { status: "in_transit", label: "In transit", location: "Bangkok Sort Facility", timestamp: "Tue, 9:48 AM", done: true },
    { status: "out_for_delivery", label: "Out for delivery", location: "Phnom Penh", timestamp: "Today, 8:15 AM", current: true },
    { status: "delivered", label: "Delivered", location: "—", timestamp: "—" },
  ],
};

const STATUS_ICONS: Record<TrackingEvent["status"], typeof Package> = {
  ordered: Box,
  shipped: Truck,
  in_transit: Plane,
  out_for_delivery: Truck,
  delivered: CheckCircle2,
  exception: AlertCircle,
};

export default function TrackPackagePage() {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = () => {
    const id = trackingId.trim();
    if (!id) {
      setError("Enter a tracking ID");
      setResult(null);
      return;
    }
    setError(null);
    setResult({ ...DEMO_RESULT, trackingId: id });
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Track Package · ZIVO" description="Live tracking for your deliveries and shipments." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Track Package</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search input */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <label htmlFor="trackingId" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Tracking ID
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                id="trackingId"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                placeholder="e.g. ZV12345678"
                value={trackingId}
                onChange={(e) => { setTrackingId(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
            <Button
              onClick={handleTrack}
              className="bg-ig-gradient text-white font-bold rounded-xl h-11 px-5 hover:opacity-90 border-0 shadow-sm"
            >
              Track
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Works with ZIVO Express, partner carriers, and most major shipping IDs.
          </p>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary card */}
            <div className="rounded-2xl bg-ig-gradient text-white shadow-lg shadow-rose-500/20 p-5 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <Package className="absolute top-4 right-4 h-6 w-6 text-white/30" />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{result.carrier}</p>
                <p className="text-xl font-bold mt-1">{result.item}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Arrives {result.estimatedDelivery}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/70">ID: {result.trackingId}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl bg-card border border-border p-4">
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Journey
              </h2>
              <ol className="relative">
                {result.events.map((ev, idx) => {
                  const Icon = STATUS_ICONS[ev.status];
                  const isLast = idx === result.events.length - 1;
                  return (
                    <li key={ev.status} className="relative pl-10 pb-5 last:pb-0">
                      {!isLast && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[15px] top-7 bottom-0 w-px",
                            ev.done ? "bg-ig-gradient" : "bg-border",
                          )}
                        />
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center",
                          ev.current
                            ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30 ring-4 ring-rose-500/10"
                            : ev.done
                              ? "bg-ig-gradient text-white"
                              : "bg-secondary text-muted-foreground border border-border",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <div className="ml-1">
                        <p className={cn(
                          "text-sm font-bold",
                          ev.current ? "text-foreground" : ev.done ? "text-foreground" : "text-muted-foreground",
                        )}>
                          {ev.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ev.location}
                          {ev.timestamp !== "—" && <> · {ev.timestamp}</>}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </motion.div>
        )}

        {!result && !error && (
          <div className="text-center px-6 py-10">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Package className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Track any shipment</p>
            <p className="text-xs text-muted-foreground">
              Paste a tracking ID above to see live status, location, and estimated arrival.
            </p>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
