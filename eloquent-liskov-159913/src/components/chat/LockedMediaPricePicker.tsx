/**
 * LockedMediaPricePicker — Bottom sheet to set unlock price before sending locked media
 */
import { useState } from "react";
import { motion } from "framer-motion";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Lock from "lucide-react/dist/esm/icons/lock";
import X from "lucide-react/dist/esm/icons/x";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Film from "lucide-react/dist/esm/icons/film";
import { Button } from "@/components/ui/button";

const PRESET_PRICES = [0.99, 1.99, 4.99, 9.99, 19.99, 49.99];

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (priceCents: number) => void;
}

export default function LockedMediaPricePicker({ open, onClose, onConfirm }: Props) {
  const [selectedPrice, setSelectedPrice] = useState(0.99);
  const [customPrice, setCustomPrice] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  if (!open) return null;

  const finalPrice = useCustom ? parseFloat(customPrice) || 0 : selectedPrice;
  const isValid = finalPrice >= 0.50 && finalPrice <= 999.99;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(Math.round(finalPrice * 100));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto safe-area-bottom"
      >
        <div className="p-5 space-y-4">
          {/* Handle */}
          <div className="flex justify-center">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-foreground flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Set Unlock Price</h3>
                <p className="text-[11px] text-muted-foreground">Recipient pays to view</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Preset prices */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_PRICES.map((price) => (
              <button type="button"
                key={price}
                onClick={() => { setSelectedPrice(price); setUseCustom(false); }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  !useCustom && selectedPrice === price
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                ${price.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Custom price */}
          <div className="space-y-1.5">
            <button type="button"
              onClick={() => setUseCustom(true)}
              className={`text-xs font-semibold ${useCustom ? "text-primary" : "text-muted-foreground"}`}
            >
              Or set custom price
            </button>
            {useCustom && (
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min="0.50"
                  max="999.99"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                {customPrice && !isValid && (
                  <p className="text-[10px] text-destructive mt-1">Min $0.50, max $999.99</p>
                )}
              </div>
            )}
          </div>

          {/* Confirm */}
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="w-full rounded-xl font-bold text-sm h-11"
          >
            <Lock className="w-4 h-4 mr-2" />
            Send Locked · ${finalPrice.toFixed(2)}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Photo or video will be blurred until recipient pays
          </p>
        </div>
      </motion.div>
    </>
  );
}
