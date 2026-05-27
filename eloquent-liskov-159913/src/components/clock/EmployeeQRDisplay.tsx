/**
 * EmployeeQRDisplay — personal rotating QR code for employee
 * Admin/manager scans this to clock the employee in/out
 */
import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, QrCode, Clock, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EmployeeQRDisplayProps {
  employeeId: string;
  storeId: string;
  employeeName?: string;
}

const QR_ROTATION_MS = 3 * 60 * 1000;

export function EmployeeQRDisplay({ employeeId, storeId, employeeName }: EmployeeQRDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clock-qr", {
        body: { action: "generate", store_id: storeId, employee_id: employeeId, token_type: "employee" },
      });
      if (error) throw error;
      if (data?.success) {
        setToken(data.data.token);
        setExpiresAt(new Date(data.data.expires_at));
      }
    } catch (err) {
      console.error("Failed to generate employee QR:", err);
    }
    setLoading(false);
  }, [employeeId, storeId]);

  useEffect(() => {
    generateToken();
    const interval = setInterval(generateToken, QR_ROTATION_MS);
    return () => clearInterval(interval);
  }, [generateToken]);

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
    <div className="flex flex-col items-center py-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-foreground">{employeeName || "My QR Code"}</p>
          <p className="text-[9px] text-muted-foreground">Show to manager to clock in/out</p>
        </div>
      </div>

      <motion.div
        key={token}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-3 rounded-xl shadow-sm mb-2"
      >
        {token ? (
          <QRCodeSVG
            value={token}
            size={176}
            level="M"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        ) : (
          <div className="w-[160px] h-[160px] flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className={cn(
          "text-[11px] font-mono font-bold tabular-nums",
          timeLeft < 30 ? "text-destructive" : "text-muted-foreground"
        )}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
        <Shield className="w-2.5 h-2.5" />
        <span>Refreshes every 3 min</span>
      </div>
    </div>
  );
}
