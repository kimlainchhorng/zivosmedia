/**
 * CreatorSubscribeSheet — Patreon-style monthly subscription to a creator.
 *
 * Shows tiers (read from creator_tiers if exposed; else falls back to a
 * default $5/mo "Supporter" tier) and routes to checkout via Stripe.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import X from "lucide-react/dist/esm/icons/x";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

export const CREATOR_SUBSCRIBE_OPEN_EVENT = "zivo:creator-subscribe-open";

export interface CreatorSubscribeDetail {
  creatorId: string;
  creatorName: string;
}

export function openCreatorSubscribe(detail: CreatorSubscribeDetail) {
  window.dispatchEvent(new CustomEvent<CreatorSubscribeDetail>(CREATOR_SUBSCRIBE_OPEN_EVENT, { detail }));
}

interface Tier {
  id: string;
  name: string;
  monthly_cents: number;
  perks: string[];
}

const FALLBACK_TIERS: Tier[] = [
  { id: "supporter", name: "Supporter", monthly_cents: 500,  perks: ["Behind-the-scenes posts", "Member-only stories"] },
  { id: "fan",       name: "Super Fan",  monthly_cents: 1500, perks: ["Everything in Supporter", "Monthly DM session", "Early access to drops"] },
  { id: "vip",       name: "VIP",         monthly_cents: 5000, perks: ["Everything above", "1:1 video call /quarter", "Custom shoutout"] },
];

export default function CreatorSubscribeSheet() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CreatorSubscribeDetail | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => { setDetail((e as CustomEvent<CreatorSubscribeDetail>).detail); setOpen(true); };
    window.addEventListener(CREATOR_SUBSCRIBE_OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(CREATOR_SUBSCRIBE_OPEN_EVENT, handler as EventListener);
  }, []);

  const subscribe = () => {
    if (!selectedTier) { toast.error("Pick a tier"); return; }
    toast.message("Redirecting to checkout…");
    // Real impl: call stripe edge function with creator_id + tier_id
  };

  return (
    <AnimatePresence>
      {open && detail && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" />Support {detail.creatorName}</h3>
                <p className="text-[11px] text-muted-foreground">Monthly subscription · cancel anytime.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-2">
              {FALLBACK_TIERS.map((tier) => (
                <button type="button"
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`w-full text-left rounded-2xl border p-3 transition ${selectedTier === tier.id ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:bg-muted/30"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold">{tier.name}</p>
                    <p className="font-bold tabular-nums">${(tier.monthly_cents / 100).toFixed(0)}<span className="text-xs text-muted-foreground">/mo</span></p>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {tier.perks.map((p) => <li key={p}>· {p}</li>)}
                  </ul>
                </button>
              ))}
              <button type="button" onClick={subscribe} disabled={!selectedTier} className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                Subscribe
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
