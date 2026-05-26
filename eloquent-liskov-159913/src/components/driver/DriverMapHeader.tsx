/**
 * DriverMapHeader - Top bar with back, online/offline pill, notification bell, GPS recenter
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, VolumeX, Volume2, Locate, Loader2, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DriverMapHeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onRecenter: () => void;
}

export default function DriverMapHeader({ isOnline, onToggleOnline, voiceEnabled, onToggleVoice, onRecenter }: DriverMapHeaderProps) {
  const navigate = useNavigate();
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleRecenter = async () => {
    setGpsStatus("loading");
    onRecenter();
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      setTimeout(() => setGpsStatus("idle"), 2000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => { setGpsStatus("success"); setTimeout(() => setGpsStatus("idle"), 1500); },
      () => { setGpsStatus("success"); setTimeout(() => setGpsStatus("idle"), 1500); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  const btnClass = "relative w-10 h-10 rounded-xl backdrop-blur-2xl shadow-lg border bg-card/60 border-white/10 hover:bg-card/80";

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-0 left-0 right-0 z-[1500] px-2 pt-2 pointer-events-auto safe-area-top"
    >
      <div className="flex items-center justify-between">
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" className={btnClass} onClick={() => navigate("/drive")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Status pill */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-2xl shadow-lg border transition-all ${
            isOnline ? "bg-emerald-500/20 border-emerald-500/30" : "bg-card/60 border-white/10"
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          <span className={`text-sm font-medium ${isOnline ? "text-emerald-500" : "text-muted-foreground"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </motion.button>

        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" className={btnClass} onClick={() => navigate("/notifications")} aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Voice */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost" size="icon"
              className={`${btnClass} ${voiceEnabled ? "bg-primary/20 border-primary/30 text-primary" : ""}`}
              onClick={onToggleVoice}
              aria-label={voiceEnabled ? "Mute" : "Unmute"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </motion.div>

          {/* GPS */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost" size="icon"
              disabled={gpsStatus === "loading"}
              className={`${btnClass} ${gpsStatus === "success" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500" : gpsStatus === "loading" ? "bg-primary/20 border-primary/40 text-primary" : ""}`}
              onClick={handleRecenter}
              aria-label="Recenter"
            >
              <AnimatePresence mode="wait">
                {gpsStatus === "loading" ? (
                  <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Loader2 className="h-4 w-4 animate-spin" /></motion.div>
                ) : gpsStatus === "success" ? (
                  <motion.div key="s" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-4 w-4" /></motion.div>
                ) : gpsStatus === "error" ? (
                  <motion.div key="e" initial={{ scale: 0 }} animate={{ scale: 1 }}><AlertCircle className="h-4 w-4" /></motion.div>
                ) : (
                  <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Locate className="h-4 w-4" /></motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
