/**
 * UnifiedPayoutCard — Stripe (instant card) + PayPal (global email) chooser.
 * Auto-detects country and routes Cambodia/Vietnam/Laos/Myanmar to PayPal by default.
 * Persists user's last choice in localStorage.
 */
import { useState, useEffect } from "react";
import { Zap, Mail, Globe2 } from "lucide-react";
import StripeConnectPayoutCard from "./StripeConnectPayoutCard";
import PayPalPayoutCard from "./PayPalPayoutCard";

interface Props {
  balanceDollars: number;
}

// Stripe Connect Express does NOT support these countries
const STRIPE_UNSUPPORTED = new Set([
  "KH", "VN", "LA", "MM", // Southeast Asia
  "BD", "PK", "NP", "LK", // South Asia gaps
  "IR", "SY", "CU", "KP", // Sanctioned
  "BY", "RU", // Restricted
  "AF", "YE", "SO", "SD", "SS", // High risk
]);

const STORAGE_KEY = "zivo_payout_provider";

function detectCountry(): string | null {
  try {
    const stored =
      localStorage.getItem("zivo_country") ||
      localStorage.getItem("user_country") ||
      localStorage.getItem("country_code");
    if (stored) return stored.toUpperCase();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Phnom_Penh")) return "KH";
    if (tz.includes("Ho_Chi_Minh") || tz.includes("Hanoi")) return "VN";
    if (tz.includes("Vientiane")) return "LA";
    if (tz.includes("Yangon") || tz.includes("Rangoon")) return "MM";
    if (tz.includes("Dhaka")) return "BD";
    if (tz.includes("Karachi")) return "PK";
    if (tz.includes("Kathmandu")) return "NP";
    if (tz.includes("Colombo")) return "LK";
  } catch (_) {}
  return null;
}

export default function UnifiedPayoutCard({ balanceDollars }: Props) {
  const [provider, setProvider] = useState<"stripe" | "paypal">("stripe");
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const c = detectCountry();
    setCountry(c);
    const saved = localStorage.getItem(STORAGE_KEY) as "stripe" | "paypal" | null;
    if (saved === "stripe" || saved === "paypal") {
      setProvider(saved);
    } else if (c && STRIPE_UNSUPPORTED.has(c)) {
      setProvider("paypal");
    }
  }, []);

  const choose = (p: "stripe" | "paypal") => {
    setProvider(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch (_) {}
  };

  const stripeBlocked = country && STRIPE_UNSUPPORTED.has(country);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button"
          onClick={() => choose("stripe")}
          className={`relative p-3 rounded-2xl border-2 transition-all text-left ${
            provider === "stripe" ? "border-[#635bff] bg-[#635bff]/5" : "border-border/40 bg-card opacity-70"
          } ${stripeBlocked ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap className="w-3.5 h-3.5 text-[#635bff]" />
            <span className="text-[12px] font-bold">Stripe</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Debit card · Minutes</p>
          {stripeBlocked && (
            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
              N/A
            </span>
          )}
        </button>
        <button type="button"
          onClick={() => choose("paypal")}
          className={`relative p-3 rounded-2xl border-2 transition-all text-left ${
            provider === "paypal" ? "border-[#003087] bg-[#003087]/5" : "border-border/40 bg-card opacity-70"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Mail className="w-3.5 h-3.5 text-[#003087]" />
            <span className="text-[12px] font-bold">PayPal</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Email · Global</p>
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Globe2 className="w-2.5 h-2.5" /> All
          </span>
        </button>
      </div>

      {stripeBlocked && provider === "stripe" && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
          Stripe Connect doesn't support your country ({country}). Please use <strong>PayPal</strong> instead.
        </div>
      )}

      {provider === "stripe" ? (
        <StripeConnectPayoutCard balanceDollars={balanceDollars} detectedCountry={country} />
      ) : (
        <PayPalPayoutCard balanceDollars={balanceDollars} />
      )}
    </div>
  );
}
