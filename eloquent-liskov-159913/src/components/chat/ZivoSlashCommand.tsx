/**
 * ZivoSlashCommand — type "/" in chat to open AI assistant menu.
 *
 * Each command runs the user's intent in-context: book flight, find hotel,
 * split bill, send money, plan trip. Hands off to the relevant flow.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Car from "lucide-react/dist/esm/icons/car";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Receipt from "lucide-react/dist/esm/icons/receipt";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import type { ComponentType, SVGProps } from "react";

export type SlashAction =
  | "flight"
  | "hotel"
  | "eats"
  | "ride"
  | "send-money"
  | "split-bill"
  | "plan-trip"
  | "live-location";

interface CommandDef {
  action: SlashAction;
  label: string;
  hint: string;
  keyword: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  gradient: string;
}

const COMMANDS: CommandDef[] = [
  { action: "flight",        label: "Book flight",      hint: "Find flights and share to chat",       keyword: "flight",   icon: Plane,           gradient: "from-sky-500 to-indigo-500" },
  { action: "hotel",         label: "Find hotel",       hint: "Browse hotels and share a stay",       keyword: "hotel",    icon: Hotel,           gradient: "from-emerald-500 to-teal-500" },
  { action: "eats",          label: "Order food",       hint: "Browse restaurants for delivery",      keyword: "eats",     icon: UtensilsCrossed, gradient: "from-orange-500 to-rose-500" },
  { action: "ride",          label: "Get a ride",       hint: "Book a ride or request multi-stop",    keyword: "ride",     icon: Car,             gradient: "from-violet-500 to-fuchsia-500" },
  { action: "send-money",    label: "Send money",       hint: "Pay a friend instantly",               keyword: "pay",      icon: DollarSign,      gradient: "from-green-500 to-emerald-600" },
  { action: "split-bill",    label: "Split a bill",     hint: "Divide expenses with the group",       keyword: "split",    icon: Receipt,         gradient: "from-pink-500 to-rose-500" },
  { action: "plan-trip",     label: "Plan a trip",      hint: "Bundle flight + hotel + ride",         keyword: "trip",     icon: Sparkles,        gradient: "from-amber-500 to-pink-500" },
  { action: "live-location", label: "Share live location", hint: "Friends see you on the map",       keyword: "location", icon: MapPin,          gradient: "from-blue-500 to-cyan-500" },
];

interface Props {
  open: boolean;
  query: string;
  onClose: () => void;
  onAction: (action: SlashAction) => void;
}

export default function ZivoSlashCommand({ open, query, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const filtered = query.length === 0
    ? COMMANDS
    : COMMANDS.filter((c) => c.keyword.startsWith(query.toLowerCase()) || c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && filtered.length > 0 && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="absolute bottom-full left-0 right-0 mb-2 mx-2 rounded-2xl bg-card border border-border/40 shadow-2xl shadow-black/10 overflow-hidden z-30 max-h-[280px] overflow-y-auto"
          role="listbox"
        >
          <div className="px-3 py-2 border-b border-border/30 bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ZIVO Assistant</p>
          </div>
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button type="button"
                key={cmd.action}
                onClick={() => { onAction(cmd.action); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition text-left"
                role="option"
              >
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${cmd.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">/{cmd.keyword} <span className="text-xs font-normal text-muted-foreground">— {cmd.label}</span></p>
                  <p className="text-[11px] text-muted-foreground/80 truncate">{cmd.hint}</p>
                </div>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
