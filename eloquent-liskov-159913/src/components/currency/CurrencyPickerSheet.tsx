/**
 * CurrencyPickerSheet — global currency switcher.
 *
 * Reuses CurrencyContext + SUPPORTED_CURRENCIES. Open via custom event so
 * any page can offer a "Change currency" entry without prop drilling.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SUPPORTED_CURRENCIES } from "@/config/currencies";
import X from "lucide-react/dist/esm/icons/x";
import Search from "lucide-react/dist/esm/icons/search";
import Check from "lucide-react/dist/esm/icons/check";

export const CURRENCY_PICKER_EVENT = "zivo:currency-picker-open";

export function openCurrencyPicker() {
  window.dispatchEvent(new Event(CURRENCY_PICKER_EVENT));
}

export default function CurrencyPickerSheet() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(CURRENCY_PICKER_EVENT, handler);
    return () => window.removeEventListener(CURRENCY_PICKER_EVENT, handler);
  }, []);

  const close = () => { setOpen(false); setQuery(""); };

  const filtered = SUPPORTED_CURRENCIES.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] max-h-[80dvh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <div>
                <h3 className="text-base font-bold">Currency</h3>
                <p className="text-[11px] text-muted-foreground">All prices update across the app.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search currencies"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {filtered.map((c) => {
                const selected = c.code === currency;
                return (
                  <button type="button"
                    key={c.code}
                    onClick={() => { setCurrency(c.code); close(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${selected ? "bg-primary/10" : "hover:bg-muted/40 active:bg-muted/60"}`}
                  >
                    <span className="text-2xl leading-none w-7 text-center">{c.symbol}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.code}</p>
                    </div>
                    {selected && (
                      <span className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
