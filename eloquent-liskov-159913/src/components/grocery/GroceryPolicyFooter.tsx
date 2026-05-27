/**
 * GroceryPolicyFooter — Premium trust footer for store pages
 * 2026 Spatial UI with glassmorphism and motion
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ShieldCheck, Truck, RotateCcw, DollarSign, FileText,
  Heart, ChevronRight, Leaf, Lock, Cookie, Handshake,
} from "lucide-react";
import { DELIVERY_MIN_FEE, SERVICE_FEE_PCT, DELIVERY_MAX_FEE, formatFee, MARKUP_THRESHOLD } from "@/config/groceryPricing";

const TRUST_BADGES = [
  { icon: DollarSign, label: "Upfront Fees", desc: "No hidden costs", color: "from-emerald-500/15 to-emerald-500/5" },
  { icon: ShieldCheck, label: "Fresh or Free", desc: "24h guarantee", color: "from-primary/15 to-primary/5" },
  { icon: RotateCcw, label: "Easy Refunds", desc: "Photo + done", color: "from-blue-500/15 to-blue-500/5" },
  { icon: Heart, label: "100% Tips", desc: "All to driver", color: "from-pink-500/15 to-pink-500/5" },
];

const POLICY_LINKS = [
  {
    to: "/grocery/fees",
    icon: DollarSign,
    label: "Pricing & Fees",
    desc: `Delivery ${formatFee(DELIVERY_MIN_FEE)}–${formatFee(DELIVERY_MAX_FEE)} · Service ${SERVICE_FEE_PCT}% · Platform 3–5%`,
    badge: "Transparent",
    badgeColor: "bg-emerald-500/10 text-emerald-600",
  },
  {
    to: "/grocery/returns",
    icon: RotateCcw,
    label: "Returns & Refunds",
    desc: "Freshness guarantee · Report within 24h · Photo required",
    badge: "Protected",
    badgeColor: "bg-blue-500/10 text-blue-600",
  },
  {
    to: "/grocery/terms",
    icon: FileText,
    label: "Terms of Service",
    desc: "How it works · Cancellation fees · Substitution policy",
    badge: null,
    badgeColor: "",
  },
  {
    to: "/privacy",
    icon: Lock,
    label: "Privacy Policy",
    desc: "How we collect, use, and protect your personal data",
    badge: null,
    badgeColor: "",
  },
  {
    to: "/partner-disclosure",
    icon: Handshake,
    label: "Partner Disclosure",
    desc: "How ZIVO works with stores and independent drivers",
    badge: null,
    badgeColor: "",
  },
  {
    to: "/cookies",
    icon: Cookie,
    label: "Cookie Policy",
    desc: "How we use cookies and tracking technologies",
    badge: null,
    badgeColor: "",
  },
];

export function GroceryPolicyFooter() {
  return (
    <div className="mx-4 mt-8 mb-4 space-y-5">
      {/* Trust badges - glassmorphism cards */}
      <div className="grid grid-cols-4 gap-2">
        {TRUST_BADGES.map((badge, i) => (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gradient-to-b ${badge.color} border border-border/15 backdrop-blur-sm`}
          >
            <div className="h-9 w-9 rounded-xl bg-background/80 border border-border/20 flex items-center justify-center shadow-sm">
              <badge.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] font-bold text-foreground text-center leading-tight">{badge.label}</p>
            <p className="text-[8px] text-muted-foreground text-center leading-tight">{badge.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Policy links - elevated cards */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Policies & Information</p>
        {POLICY_LINKS.map((link, i) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={link.to}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/15 bg-card hover:border-primary/25 hover:bg-primary/[0.02] hover:shadow-sm transition-all duration-200 group"
            >
              <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <link.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-foreground">{link.label}</p>
                  {link.badge && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${link.badgeColor}`}>
                      {link.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{link.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Eco + security footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4 py-3 px-4 rounded-2xl bg-muted/10 border border-border/10"
      >
        {[
          { icon: Lock, label: "256-bit SSL" },
          { icon: ShieldCheck, label: "PCI Compliant" },
          { icon: Leaf, label: "Eco Packaging" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] text-muted-foreground/60 font-medium">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Fine print */}
      <div className="text-center space-y-1 pt-1">
        <p className="text-[9px] text-muted-foreground/60 leading-relaxed px-2">
          Prices and availability subject to change. Final price confirmed at checkout.
          By ordering, you agree to our{" "}
          <Link to="/grocery/terms" className="text-primary/60 hover:underline">Terms</Link>,{" "}
          <Link to="/privacy" className="text-primary/60 hover:underline">Privacy Policy</Link>, and{" "}
          <Link to="/cookies" className="text-primary/60 hover:underline">Cookie Policy</Link>.
        </p>
        <p className="text-[9px] text-muted-foreground/40">© {new Date().getFullYear()} ZIVO Technologies · All rights reserved</p>
      </div>
    </div>
  );
}
