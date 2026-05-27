/**
 * RideReceiptCard - Detailed receipt with route map, CO₂ stats, and carbon offset
 * Inspired by Uber's ride receipt
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, MapPin, Clock, Route, Leaf, Download, Share2, ChevronDown, ChevronUp, Car, DollarSign, Zap, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReceiptData {
  tripId: string;
  date: string;
  pickup: string;
  dropoff: string;
  distance: string;
  duration: string;
  vehicleType: string;
  driverName: string;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  surgeMultiplier?: number;
  surgeAmount?: number;
  discount?: number;
  tip: number;
  total: number;
  co2Kg: number;
  paymentMethod: string;
}

const defaultReceipt: ReceiptData = {
  tripId: "ZIVO-R-48291",
  date: "Mar 6, 2026 • 2:34 PM",
  pickup: "123 Main Street, Downtown",
  dropoff: "456 Oak Avenue, Midtown",
  distance: "4.2 mi",
  duration: "14 min",
  vehicleType: "Premium",
  driverName: "Marcus T.",
  baseFare: 3.50,
  distanceCharge: 8.40,
  timeCharge: 4.20,
  surgeMultiplier: 1.3,
  surgeAmount: 2.10,
  discount: -2.00,
  tip: 3.00,
  total: 19.20,
  co2Kg: 1.8,
  paymentMethod: "Visa •••• 4242",
};

export default function RideReceiptCard({ receipt = defaultReceipt }: { receipt?: ReceiptData }) {
  const [expanded, setExpanded] = useState(false);
  const [offsetEnabled, setOffsetEnabled] = useState(false);
  const offsetCost = 0.25;
  const treesEquiv = (receipt.co2Kg / 22).toFixed(3); // avg tree absorbs 22kg/year

  const handleDownload = () => {
    const text = [
      `ZIVO Receipt — ${receipt.tripId}`,
      `Date: ${receipt.date}`,
      `From: ${receipt.pickup}`,
      `To: ${receipt.dropoff}`,
      `Distance: ${receipt.distance} · ${receipt.duration}`,
      `Driver: ${receipt.driverName} · ${receipt.vehicleType}`,
      `---`,
      `Base fare: $${receipt.baseFare.toFixed(2)}`,
      `Distance charge: $${receipt.distanceCharge.toFixed(2)}`,
      `Time charge: $${receipt.timeCharge.toFixed(2)}`,
      receipt.surgeAmount ? `Surge (${receipt.surgeMultiplier}x): $${receipt.surgeAmount.toFixed(2)}` : null,
      receipt.discount ? `Discount: $${receipt.discount.toFixed(2)}` : null,
      `Tip: $${receipt.tip.toFixed(2)}`,
      `TOTAL: $${receipt.total.toFixed(2)}`,
      `Payment: ${receipt.paymentMethod}`,
    ].filter(Boolean).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receipt.tripId}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  const handleShare = () => {
    const text = `ZIVO Ride Receipt ${receipt.tripId}: ${receipt.pickup} → ${receipt.dropoff} · $${receipt.total.toFixed(2)}`;
    if (navigator.share) {
      navigator.share({ title: "ZIVO Receipt", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success("Receipt copied to clipboard")).catch(() => toast.success("Receipt copied!"));
    }
  };

  const handleOffset = (checked: boolean) => {
    setOffsetEnabled(checked);
    if (checked) toast.success("Carbon offset added! 🌱");
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Ride Receipt</h3>
              <p className="text-[10px] text-muted-foreground">{receipt.date}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono">{receipt.tripId}</Badge>
        </div>

        {/* Route mini-map */}
        <div className="relative h-20 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/20 overflow-hidden mb-3">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            <path d="M 10 40 Q 30 20, 50 25 Q 70 30, 90 10" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" opacity={0.6} />
          </svg>
          <div className="absolute bottom-3 left-[10%] w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          <div className="absolute top-2 right-[10%] w-3 h-3 rounded-full bg-red-500 border-2 border-card" />
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground font-medium">
            {receipt.distance} • {receipt.duration}
          </div>
        </div>

        {/* Route addresses */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-foreground">{receipt.pickup}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
            <p className="text-xs text-foreground">{receipt.dropoff}</p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/20">
        <span className="text-sm font-bold text-foreground">Total</span>
        <span className="text-xl font-black text-foreground">${(receipt.total + (offsetEnabled ? offsetCost : 0)).toFixed(2)}</span>
      </div>

      {/* Expandable breakdown */}
      <button type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-border/20 text-[11px] font-bold text-muted-foreground hover:bg-muted/30"
      >
        {expanded ? "Hide" : "View"} fare breakdown
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-3 border-t border-border/20">
          <div className="space-y-2 py-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Base fare</span>
              <span className="text-foreground">${receipt.baseFare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Distance ({receipt.distance})</span>
              <span className="text-foreground">${receipt.distanceCharge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Time ({receipt.duration})</span>
              <span className="text-foreground">${receipt.timeCharge.toFixed(2)}</span>
            </div>
            {receipt.surgeAmount && (
              <div className="flex justify-between text-xs">
                <span className="text-orange-500">Surge ({receipt.surgeMultiplier}x)</span>
                <span className="text-orange-500">+${receipt.surgeAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount && (
              <div className="flex justify-between text-xs">
                <span className="text-emerald-500">Ride Pass discount</span>
                <span className="text-emerald-500">{receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs pt-2 border-t border-border/20">
              <span className="text-muted-foreground">Tip</span>
              <span className="text-foreground">${receipt.tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Paid with</span>
              <span className="text-foreground">{receipt.paymentMethod}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Carbon offset */}
      <div className="px-4 py-3 border-t border-border/20 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-xs font-bold text-foreground">Carbon Offset</span>
              <p className="text-[10px] text-muted-foreground">This trip: {receipt.co2Kg} kg CO₂</p>
            </div>
          </div>
          <Switch checked={offsetEnabled} onCheckedChange={handleOffset} />
        </div>
        {offsetEnabled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 bg-emerald-500/10 rounded-lg p-2 mt-1">
            <Trees className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              +${offsetCost} offsets {receipt.co2Kg}kg CO₂ (≈ {treesEquiv} trees/year)
            </span>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={handleDownload}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Download
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-9 text-xs" onClick={handleShare}>
          <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
        </Button>
      </div>
    </div>
  );
}
