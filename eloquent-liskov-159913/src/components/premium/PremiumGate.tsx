/**
 * PremiumGate — wrap any feature in a paywall.
 *
 * If the user has ZIVO+, renders children. Otherwise renders a teaser
 * with the feature name and a CTA that opens the upgrade flow.
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Lock from "lucide-react/dist/esm/icons/lock";

interface Props {
  feature: string;
  description?: string;
  children: ReactNode;
  /** Optional: fallback UI when locked. Defaults to teaser card. */
  fallback?: ReactNode;
}

export default function PremiumGate({ feature, description, children, fallback }: Props) {
  const { isPlus, isLoading } = useZivoPlus();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (isPlus) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-amber-500/10 p-5 text-center"
    >
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
      <div className="relative">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 shadow-lg mb-3">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1">ZIVO+ exclusive</p>
        <h3 className="text-lg font-bold text-foreground mb-1.5">{feature}</h3>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        <button type="button"
          onClick={() => navigate("/zivo-plus")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 text-white font-bold text-sm shadow-lg active:scale-95 transition"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to unlock
        </button>
      </div>
    </motion.div>
  );
}
