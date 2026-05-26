/**
 * StoreQRDisplay — rotating QR code for store time clock (admin side)
 * Employees scan this to clock in/out
 */
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, QrCode, Clock, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StoreQRDisplayProps {
  storeId: string;
}

const QR_ROTATION_MS = 3 * 60 * 1000; // 3 minutes

export function StoreQRDisplay({ storeId }: StoreQRDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clock-qr", {
        body: { action: "generate", store_id: storeId, token_type: "store" },
      });
      if (error) throw error;
      if (data?.success) {
        setToken(data.data.token);
        setExpiresAt(new Date(data.data.expires_at));
      }
    } catch (err) {
      console.error("Failed to generate QR token:", err);
    }
    setLoading(false);
  }, [storeId]);

  // Generate on mount and auto-rotate
  useEffect(() => {
    generateToken();
    const interval = setInterval(generateToken, QR_ROTATION_MS);
    return () => clearInterval(interval);
  }, [generateToken]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      if (expiresAt) {
        const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setTimeLeft(left);
        if (left === 0) generateToken();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt, generateToken]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Store QR Code</h3>
            <p className="text-[10px] text-muted-foreground">Employees scan to clock in/out</p>
          </div>
        </div>
        <button type="button"
          onClick={generateToken}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted/60 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center">
        <motion.div
          key={token}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-4 rounded-xl shadow-sm mb-3"
        >
          {token ? (
            <QRCodeSVG
              value={token}
              size={208}
              level="M"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          )}
        </motion.div>

        {/* Timer */}
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className={cn(
            "text-[12px] font-mono font-bold tabular-nums",
            timeLeft < 30 ? "text-destructive" : "text-muted-foreground"
          )}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground">until refresh</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <Shield className="w-3 h-3" />
          <span>QR rotates every 3 minutes for security</span>
        </div>
      </div>
    </div>
  );
}
