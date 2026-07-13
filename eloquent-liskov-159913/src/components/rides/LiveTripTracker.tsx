/**
 * LiveTripTracker — Enhanced with route progress, share ETA, driver location updates
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Phone, MessageSquare, Share2, Shield, Star, Navigation, Clock, MapPin, Route, ChevronUp, ChevronDown, Music, Thermometer, CheckCircle, Copy, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";

const tripPhases = [
  { id: "driver_assigned", label: "Driver assigned", time: "2:14 PM", done: true },
  { id: "en_route", label: "Driver en route", time: "2:15 PM", done: true },
  { id: "arrived", label: "Arrived at pickup", time: "", done: false },
  { id: "trip_started", label: "Trip started", time: "", done: false },
  { id: "destination", label: "Arrived at destination", time: "", done: false },
];

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d44" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a2b" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const PICKUP = { lat: 40.7484, lng: -73.9857 };
const DROPOFF = { lat: 40.6413, lng: -73.7781 };

interface LiveTripTrackerProps {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  driverUserId?: string;
  driverName?: string;
}

export default function LiveTripTracker({
  pickupLat = PICKUP.lat,
  pickupLng = PICKUP.lng,
  dropoffLat = DROPOFF.lat,
  dropoffLng = DROPOFF.lng,
  driverUserId,
  driverName = "Marcus T.",
}: LiveTripTrackerProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(1);
  const [countdown, setCountdown] = useState(240);
  const [expanded, setExpanded] = useState(false);
  const [mapApiKey, setMapApiKey] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [driverPos, setDriverPos] = useState({ lat: pickupLat + 0.008, lng: pickupLng - 0.005 });
  const [shareExpanded, setShareExpanded] = useState(false);
  const [driverSpeed, setDriverSpeed] = useState(0);
  const [distanceLeft, setDistanceLeft] = useState(1.2);

  // Cambodia detection for km/mi display
  const isCambodia = pickupLat >= 9.5 && pickupLat <= 14.7;

  const pickup = { lat: pickupLat, lng: pickupLng };
  const dropoff = { lat: dropoffLat, lng: dropoffLng };

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setMapError(true); return; }
        // The deployed fn is `maps-api-key` and returns `{ key }`. The
        // previous call to `get-google-maps-key` (with `data.apiKey`) hit a
        // 404 and silently flipped the map to error state on every ride.
        const { data, error } = await supabase.functions.invoke("maps-api-key");
        const key = (data as { key?: string; apiKey?: string } | null)?.key
          ?? (data as { apiKey?: string } | null)?.apiKey;
        if (error || !key) { setMapError(true); return; }
        setMapApiKey(key);
      } catch { setMapError(true); }
    };
    fetchKey();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 8000);
    const t2 = setTimeout(() => setPhase(3), 16000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDriverPos(prev => ({
        lat: prev.lat + (pickup.lat - prev.lat) * 0.02,
        lng: prev.lng + (pickup.lng - prev.lng) * 0.02,
      }));
      setDriverSpeed(Math.floor(20 + Math.random() * 15));
      setDistanceLeft(d => Math.max(0.1, d - 0.008));
    }, 500);
    return () => clearInterval(interval);
  }, [pickup.lat, pickup.lng]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const phaseLabels = ["En Route to You", "Driver Has Arrived", "On the Way", "Almost There!"];
  const phaseColors = ["text-primary", "text-amber-500", "text-emerald-500", "text-primary"];
  const progressPct = 20 + phase * 22;
  const carProgress = progressPct;

  const shareLink = `${getPublicOrigin()}/track/${Date.now().toString(36)}`;

  const openDriverChat = (startCall?: "voice" | "video") => {
    if (!driverUserId) {
      navigate("/chat");
      toast.info("Choose a chat thread to contact your driver");
      return;
    }

    navigate("/chat", {
      state: {
        openChat: { userId: driverUserId, name: driverName },
        ...(startCall ? { startCall } : {}),
      },
    });
  };

  const renderETAOverlay = () => (
    <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/30 shadow-md z-20">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xl font-black text-foreground font-mono">{mins}:{secs.toString().padStart(2, "0")}</span>
      </div>
      <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">ETA</span>
    </div>
  );

  const renderLiveBadge = () => (
    <div className="absolute top-3 right-3 z-20">
      <Badge className="bg-red-500/90 text-white border-0 text-[9px] font-bold gap-1 shadow-md">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
      </Badge>
    </div>
  );

  const renderDriverStats = () => (
    <div className="absolute bottom-3 left-3 right-3 z-20 flex gap-2">
      <div className="bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/30 text-center">
        <p className="text-[9px] text-muted-foreground">Speed</p>
        <p className="text-xs font-bold text-foreground">{isCambodia ? Math.round(driverSpeed * 1.60934) : driverSpeed} {isCambodia ? "km/h" : "mph"}</p>
      </div>
      <div className="bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/30 text-center">
        <p className="text-[9px] text-muted-foreground">Distance</p>
        <p className="text-xs font-bold text-foreground">{isCambodia ? (distanceLeft * 1.60934).toFixed(1) : distanceLeft.toFixed(1)} {isCambodia ? "km" : "mi"}</p>
      </div>
    </div>
  );

  const renderFallbackMap = () => (
    <div className="relative h-56 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 overflow-hidden shadow-lg">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 8 82 C 20 70, 35 55, 50 45 C 65 35, 80 28, 92 18" stroke="hsl(var(--primary))" strokeWidth="0.6" strokeDasharray="2 2" fill="none" opacity={0.3} />
        <path d="M 8 82 C 20 70, 35 55, 50 45 C 65 35, 80 28, 92 18" stroke="hsl(var(--primary))" strokeWidth="1.2" fill="none" strokeDasharray={`${carProgress} 200`} opacity={0.9} />
      </svg>
      <div className="absolute bottom-4 left-[6%] flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-card shadow-lg" />
        <span className="text-[7px] font-bold text-muted-foreground mt-1 bg-card/80 px-1 rounded">Pickup</span>
      </div>
      <div className="absolute top-3 right-[6%] flex flex-col items-center">
        <MapPin className="w-5 h-5 text-red-500 drop-shadow-lg" />
        <span className="text-[7px] font-bold text-muted-foreground mt-0.5 bg-card/80 px-1 rounded">Dropoff</span>
      </div>
      <motion.div className="absolute z-10" style={{ left: `${8 + (carProgress / 100) * 84}%`, top: `${82 - (carProgress / 100) * 64}%` }} animate={{ y: [-1, 1, -1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-xl border-2 border-primary-foreground">
          <Car className="w-4 h-4 text-primary-foreground" />
        </div>
      </motion.div>
      {renderETAOverlay()}
      {renderLiveBadge()}
      {renderDriverStats()}
    </div>
  );

  return (
    <div className="space-y-4">
      {mapApiKey && !mapError ? (
        <GoogleMapTracker apiKey={mapApiKey} pickup={pickup} dropoff={dropoff} driverPos={driverPos} etaOverlay={renderETAOverlay()} liveBadge={renderLiveBadge()} driverStats={renderDriverStats()} />
      ) : renderFallbackMap()}

      {/* Route progress bar */}
      <div className="rounded-2xl bg-card border border-border/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">Pickup</span>
          </div>
          <span className={cn("text-xs font-bold", phaseColors[Math.min(phase, 3)])}>{phaseLabels[Math.min(phase, 3)]}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">Dropoff</span>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
        </div>
        <div className="relative">
          <Progress value={progressPct} className="h-2" />
          <motion.div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${progressPct}%` }} animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <div className="w-4 h-4 -ml-2 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
          </motion.div>
        </div>
      </div>

      {/* Status + driver card */}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <Avatar className="w-13 h-13 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">MT</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{driverName}</span>
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold">4.92</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground">Silver Camry</span>
              <Badge variant="outline" className="text-[9px] font-bold h-4">ABC 1234</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => openDriverChat("voice")}
              className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              aria-label="Call driver"
            >
              <Phone className="w-4 h-4 text-emerald-500" />
            </button>
            <button type="button"
              onClick={() => openDriverChat()}
              className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-95 transition-transform min-w-[44px] min-h-[44px]"
              aria-label="Message driver"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-4 pb-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl" onClick={() => setShareExpanded(!shareExpanded)}>
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share ETA
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/5" onClick={() => navigate("/safety")}>
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Safety
          </Button>
        </div>

        {/* Share ETA expanded */}
        <AnimatePresence>
          {shareExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/30">
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-foreground">Share your trip</p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <span className="text-[10px] text-muted-foreground flex-1 font-mono truncate">{shareLink}</span>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(`https://${shareLink}`); toast.success("Link copied!"); }}
                    aria-label="Copy trip share link"
                    title="Copy trip share link"
                  >
                    <Copy className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
                <div className="flex gap-2">
                  {["Mom", "Alex", "Sarah"].map(name => (
                    <button type="button" key={name} onClick={() => navigate("/chat", { state: { shareMessage: `Track my ride: https://${shareLink}` } })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/40 text-xs font-medium hover:border-primary/20 transition-colors">
                      <Users className="w-3 h-3 text-muted-foreground" /> {name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline toggle */}
        <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-border/30 text-[11px] font-bold text-muted-foreground hover:bg-muted/20 transition-colors min-h-[44px]">
          {expanded ? "Hide timeline" : "Trip timeline"}
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-0">
                {tripPhases.map((tp, i) => {
                  const isDone = i <= phase;
                  return (
                    <div key={tp.id} className="flex items-start gap-3 relative">
                      {i < tripPhases.length - 1 && <div className={cn("absolute left-[9px] top-5 w-0.5 h-full", isDone ? "bg-primary" : "bg-border/40")} />}
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 relative z-10", isDone ? "bg-primary" : "bg-muted border border-border/40")}>
                        {isDone ? <CheckCircle className="w-3 h-3 text-primary-foreground" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                      </div>
                      <div className="pb-4">
                        <p className={cn("text-xs font-medium", isDone ? "text-foreground" : "text-muted-foreground/50")}>{tp.label}</p>
                        {tp.time && <p className="text-[10px] text-muted-foreground">{tp.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active preferences */}
      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Active Preferences</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: Music, label: "Music Off" },
            { icon: Thermometer, label: "Cool AC" },
            { icon: Route, label: "Direct Route" },
          ].map(pref => (
            <Badge key={pref.label} variant="outline" className="text-[10px] font-bold gap-1 py-1 px-2.5 border-primary/20 text-primary bg-primary/5">
              <pref.icon className="w-3 h-3" /> {pref.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleMapTracker({ apiKey, pickup, dropoff, driverPos, etaOverlay, liveBadge, driverStats }: {
  apiKey: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  driverPos: { lat: number; lng: number };
  etaOverlay: React.ReactNode;
  liveBadge: React.ReactNode;
  driverStats: React.ReactNode;
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const svc = new google.maps.DirectionsService();
    svc.route({ origin: pickup, destination: dropoff, travelMode: google.maps.TravelMode.DRIVING }, (result, status) => {
      if (status === "OK" && result) setDirections(result);
    });
  }, [isLoaded, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  if (loadError) return null;
  if (!isLoaded) {
    return (
      <div className="h-56 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-8 h-8 border-2 border-muted border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative h-56 rounded-2xl overflow-hidden border border-border/40 shadow-lg">
      <GoogleMap mapContainerClassName="w-full h-full" center={driverPos} zoom={13} options={{ disableDefaultUI: true, zoomControl: false, styles: darkMapStyle, gestureHandling: "greedy" }} onLoad={map => { mapRef.current = map; }}>
        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: "hsl(221, 83%, 53%)", strokeWeight: 4, strokeOpacity: 0.8 } }} />}
        <Marker position={pickup} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#10b981", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }} />
        <Marker position={dropoff} icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }} />
        <Marker position={driverPos} icon={{ path: "M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z", scale: 0.7, fillColor: "hsl(221, 83%, 53%)", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1, anchor: new google.maps.Point(24, 24) }} />
      </GoogleMap>
      {etaOverlay}
      {liveBadge}
      {driverStats}
    </div>
  );
}
