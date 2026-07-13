/**
 * GroceryStoreHero - Premium store landing header with animated stats
 */
import { motion } from "framer-motion";
import { Clock, Star, MapPin, Truck, Shield, Zap, Percent, Award } from "lucide-react";
import type { StoreConfig } from "@/config/groceryStores";
import { DELIVERY_BASE_FEE, formatFee } from "@/config/groceryPricing";

interface Props {
  store: StoreConfig;
  liveEta: number;
  isOpen: boolean;
}

const statVariant = {
  hidden: { opacity: 0, y: 8, scale: 0.9 },
  show: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: 0.1 + i * 0.06, type: "spring" as const, stiffness: 400, damping: 22 },
  }),
};

const perkVariant = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.3 + i * 0.05, type: "spring" as const, stiffness: 300, damping: 24 },
  }),
};

export function GroceryStoreHero({ store, liveEta, isOpen }: Props) {
  const perks = [
    { icon: Zap, text: "Same-day delivery", color: "text-primary" },
    { icon: Shield, text: "Quality guaranteed", color: "text-emerald-500" },
    { icon: MapPin, text: "Real store prices", color: "text-amber-500" },
    { icon: Percent, text: "No hidden fees", color: "text-violet-500" },
  ];

  return (
    <div className="px-4 pt-1 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-[20px] bg-gradient-to-br from-card via-card to-muted/20 border border-border/25 p-4 space-y-3 overflow-hidden relative"
      >
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top row: logo + name + status */}
        <div className="flex items-center gap-3 relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-14 w-14 rounded-2xl bg-background border border-border/30 flex items-center justify-center p-2 shadow-lg shrink-0"
          >
	            <img src={store.logo} alt={store.name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground tracking-tight">{store.name}</h2>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 15 }}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  isOpen
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground border border-border/20"
                }`}
              >
                {isOpen ? "Open Now" : "Closed"}
              </motion.span>
              {store.promo && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold"
                >
                  {store.promo}
                </motion.span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Delivered by ZIVO · {store.hours}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock, label: `${liveEta} min`, sub: "Delivery", color: "text-primary", bg: "bg-primary/5" },
            { icon: Star, label: `${store.rating}`, sub: "Rating", color: "text-amber-500", bg: "bg-amber-500/5" },
            { icon: Truck, label: `From ${formatFee(DELIVERY_BASE_FEE)}`, sub: "Delivery fee", color: "text-primary", bg: "bg-primary/5" },
          ].map((stat, i) => (
            <motion.div
              key={stat.sub}
              custom={i}
              variants={statVariant}
              initial="hidden"
              animate="show"
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl ${stat.bg} border border-border/10 hover:border-primary/15 transition-colors duration-200`}
            >
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <motion.span
                key={stat.label}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-extrabold text-foreground"
              >
                {stat.label}
              </motion.span>
              <span className="text-[9px] text-muted-foreground font-medium">{stat.sub}</span>
            </motion.div>
          ))}
        </div>

        {/* Perks strip */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {perks.map((perk, i) => (
            <motion.div
              key={perk.text}
              custom={i}
              variants={perkVariant}
              initial="hidden"
              animate="show"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background/60 border border-border/15 shrink-0 hover:border-primary/15 transition-colors duration-200"
            >
              <perk.icon className={`h-3 w-3 ${perk.color}`} />
              <span className="text-[10px] font-semibold text-foreground/80 whitespace-nowrap">{perk.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
