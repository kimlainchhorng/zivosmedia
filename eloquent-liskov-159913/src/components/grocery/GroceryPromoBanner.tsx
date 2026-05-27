/**
 * GroceryPromoBanner - Bold, eye-catching service info banners
 * GroceryPromoInput - Validates promo codes via Supabase RPC
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Shield, Clock, MapPin, X, Tag, Check, Loader2, Zap, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_BASE_FEE, formatFee } from "@/config/groceryPricing";

const SERVICE_INFO = [
  {
    id: "same-day",
    icon: Zap,
    title: "Same-Day Delivery",
    desc: "Order by 3 PM, get it today",
    bg: "bg-gradient-to-br from-primary to-primary/80",
    iconBg: "bg-primary-foreground/20",
    textColor: "text-primary-foreground",
    descColor: "text-primary-foreground/80",
  },
  {
    id: "in-store",
    icon: MapPin,
    title: "In-Store Prices",
    desc: "Zero markup on any item",
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    iconBg: "bg-white/20",
    textColor: "text-white",
    descColor: "text-white/80",
  },
  {
    id: "quality",
    icon: Shield,
    title: "Freshness Guaranteed",
    desc: "Not fresh? Full refund",
    bg: "bg-gradient-to-br from-amber-400 to-orange-500",
    iconBg: "bg-white/20",
    textColor: "text-white",
    descColor: "text-white/80",
  },
  {
    id: "delivery",
    icon: Truck,
    title: `From ${formatFee(DELIVERY_BASE_FEE)} Delivery`,
    desc: "Distance-based, no hidden fees",
    bg: "bg-gradient-to-br from-violet-500 to-purple-600",
    iconBg: "bg-white/20",
    textColor: "text-white",
    descColor: "text-white/80",
  },
];

export function GroceryPromoBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("zivo-grocery-dismissed-promos");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem("zivo-grocery-dismissed-promos", JSON.stringify([...next]));
  };

  const visible = SERVICE_INFO.filter((p) => !dismissed.has(p.id));
  if (visible.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2">
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((info, i) => (
            <motion.div
              key={info.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -30 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 22 }}
              className={`snap-start shrink-0 w-[200px] rounded-2xl ${info.bg} p-4 relative group overflow-hidden shadow-lg`}
            >
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/10 blur-sm pointer-events-none" />
              <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-white/5 blur-sm pointer-events-none" />

              <button type="button"
                onClick={() => handleDismiss(info.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/15 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/25"
              >
                <X className="h-2.5 w-2.5 text-white/80" />
              </button>

              <div className="relative flex flex-col gap-2.5">
                <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${info.iconBg} backdrop-blur-sm`}>
                  <info.icon className={`h-5 w-5 ${info.textColor}`} />
                </div>
                <div>
                  <p className={`text-[13px] font-extrabold ${info.textColor} leading-tight`}>{info.title}</p>
                  <p className={`text-[11px] ${info.descColor} mt-0.5 font-medium`}>{info.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Promo code input for checkout — validates via Supabase */
export function GroceryPromoInput({
  onApply,
}: {
  onApply: (code: string, discount: number) => void;
}) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "applied" | "invalid">("idle");
  const [discount, setDiscount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    const upper = code.trim().toUpperCase();
    setStatus("checking");

    try {
      // Try Supabase RPC first
      const { data, error } = await supabase.rpc("validate_promo_code" as any, {
        code_input: upper,
        service_type: "grocery",
      });

      if (!error && data && (data as any).valid) {
        const discountAmount = (data as any).discount_amount || 0;
        setDiscount(discountAmount);
        setStatus("applied");
        onApply(upper, discountAmount);
        return;
      }
    } catch {
      // RPC not available, fall through to local validation
    }

    // No local fallback — all promo codes are validated server-side
    setStatus("invalid");
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="mt-3">
      <button type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        <Tag className="h-3 w-3" />
        {status === "applied" ? `Promo applied: -$${discount.toFixed(2)}` : "Have a promo code?"}
      </button>

      <AnimatePresence>
        {expanded && status !== "applied" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className={`flex-1 h-9 px-3 rounded-xl text-[12px] font-semibold bg-muted/20 border transition-all focus:ring-2 focus:ring-primary/20 ${
                  status === "invalid" ? "border-destructive/40 text-destructive" : "border-border/20"
                }`}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleApply}
                disabled={status === "checking" || !code.trim()}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold disabled:opacity-50 transition-opacity"
              >
                {status === "checking" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : "Apply"}
              </motion.button>
            </div>
            {status === "invalid" && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-destructive mt-1"
              >
                Invalid promo code
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "applied" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15"
          >
            <Check className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-semibold">
              {code} — ${discount.toFixed(2)} off applied!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
