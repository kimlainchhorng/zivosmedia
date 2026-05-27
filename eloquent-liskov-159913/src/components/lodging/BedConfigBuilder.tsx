/**
 * BedConfigBuilder - structured editor for room sleeping arrangements.
 * Replaces the free-text "Beds" field. Drives auto "Sleeps X" when needed.
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BedSlot } from "@/hooks/lodging/useLodgeRooms";

export const BED_TYPES = ["King", "Queen", "Double", "Single", "Sofa bed", "Bunk bed", "Crib"];

interface Props {
  value: BedSlot[];
  onChange: (next: BedSlot[]) => void;
}

export function BedConfigBuilder({ value, onChange }: Props) {
  const update = (idx: number, patch: Partial<BedSlot>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const add = (type = "Queen") => onChange([...value, { type, qty: 1 }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">No beds configured. Add at least one to power "Sleeps X" badges.</p>
      )}
      {value.map((slot, i) => (
        <div key={i} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg border border-border bg-muted/20">
          <select
            className="col-span-6 h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={slot.type}
            onChange={e => update(i, { type: e.target.value })}
          >
            {BED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input
            className="col-span-3 h-8 text-xs"
            type="number" inputMode="numeric" min={1}
            value={slot.qty}
            onChange={e => update(i, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <span className="col-span-2 text-[10px] text-muted-foreground">× {slot.type.toLowerCase()}</span>
          <Button type="button" size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {BED_TYPES.map(t => (
          <button type="button"
            key={t}
            onClick={() => add(t)}
            className="px-2 py-1 rounded-full text-[11px] border border-border bg-background hover:border-primary/40 hover:bg-primary/5 inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export function bedConfigSummary(slots: BedSlot[] | undefined): string {
  if (!slots || slots.length === 0) return "";
  return slots.map(s => `${s.qty} ${s.type}${s.qty > 1 ? "s" : ""}`).join(" · ");
}

export function bedConfigSleeps(slots: BedSlot[] | undefined): number {
  if (!slots || slots.length === 0) return 0;
  const cap: Record<string, number> = {
    King: 2, Queen: 2, Double: 2, Single: 1, "Sofa bed": 2, "Bunk bed": 2, Crib: 0,
  };
  return slots.reduce((sum, s) => sum + (cap[s.type] ?? 1) * s.qty, 0);
}
