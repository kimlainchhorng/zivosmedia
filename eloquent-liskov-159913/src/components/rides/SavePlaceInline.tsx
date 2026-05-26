/**
 * SavePlaceInline — compact "Save this address as Home / Work / Custom"
 * card. Designed to slot under the RideTrackingPage completion CTAs.
 *
 * Tap "Home" or "Work" → saves immediately and shows a confirmed pill.
 * Tap "Custom" → expands an input with a label field.
 */
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Home from "lucide-react/dist/esm/icons/home";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Star from "lucide-react/dist/esm/icons/star";
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalSavedPlaces, type SavedPlaceKind } from "@/hooks/useLocalSavedPlaces";

interface Props {
  address: string;
}

export default function SavePlaceInline({ address }: Props) {
  const { findByAddress, findByKind, save } = useLocalSavedPlaces();
  const [editingCustom, setEditingCustom] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");

  const existing = useMemo(() => findByAddress(address), [findByAddress, address]);

  if (!address) return null;

  if (existing) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
          <Check className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Saved as
          </div>
          <div className="text-sm font-bold text-foreground truncate">
            {existing.label}
            <span className="text-muted-foreground font-normal"> · {address}</span>
          </div>
        </div>
      </div>
    );
  }

  const homeTaken = !!findByKind("home");
  const workTaken = !!findByKind("work");

  const onSave = (kind: SavedPlaceKind) => save(kind, address);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-3.5 h-3.5 text-primary" />
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Save this drop-off
        </div>
      </div>
      <div className="text-[12px] text-muted-foreground mb-2 truncate">{address}</div>

      <AnimatePresence mode="wait">
        {editingCustom ? (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2"
          >
            <Input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              placeholder="Label this place — e.g. Mom's"
              className="h-10 text-sm rounded-lg flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && draftLabel.trim()) {
                  save("custom", address, draftLabel.trim());
                  setEditingCustom(false);
                  setDraftLabel("");
                }
                if (e.key === "Escape") {
                  setEditingCustom(false);
                  setDraftLabel("");
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (draftLabel.trim()) {
                  save("custom", address, draftLabel.trim());
                  setEditingCustom(false);
                  setDraftLabel("");
                }
              }}
              disabled={!draftLabel.trim()}
              className="h-10 rounded-lg px-3"
            >
              Save
            </Button>
            <button type="button"
              onClick={() => {
                setEditingCustom(false);
                setDraftLabel("");
              }}
              className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="grid grid-cols-3 gap-2"
          >
            <Pill
              icon={<Home className="w-4 h-4" />}
              label={homeTaken ? "Replace Home" : "Home"}
              onClick={() => onSave("home")}
              tone="bg-primary/10 text-primary border-primary/20"
            />
            <Pill
              icon={<Briefcase className="w-4 h-4" />}
              label={workTaken ? "Replace Work" : "Work"}
              onClick={() => onSave("work")}
              tone="bg-amber-500/10 text-amber-700 border-amber-500/20"
            />
            <Pill
              icon={<Star className="w-4 h-4" />}
              label="Custom"
              onClick={() => setEditingCustom(true)}
              tone="bg-violet-500/10 text-violet-700 border-violet-500/20"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: string;
}) {
  return (
    <button type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 active:scale-[0.97] transition-transform ${tone}`}
    >
      {icon}
      <span className="text-[11px] font-bold leading-none">{label}</span>
    </button>
  );
}
