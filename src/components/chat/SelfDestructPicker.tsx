/**
 * SelfDestructPicker — Popover to choose burn-after-read timer
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Flame from "lucide-react/dist/esm/icons/flame";
import Check from "lucide-react/dist/esm/icons/check";

const OPTIONS = [
  { label: "Off", value: null },
  { label: "5 seconds", value: 5 },
  { label: "10 seconds", value: 10 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
];

interface Props {
  value: number | null;
  onChange: (seconds: number | null) => void;
}

export default function SelfDestructPicker({ value, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
            value ? "border border-orange-500/25 bg-orange-500/10 text-orange-500 shadow-sm" : "zivo-chat-icon-button text-muted-foreground"
          }`}
          aria-label="Self-destruct timer"
        >
          <Flame className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="zivo-chat-popover-glass w-56 rounded-3xl border-white/10 p-2 shadow-2xl">
        <div className="px-2 pb-2 pt-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/80">Burn after read</p>
          <p className="text-xs font-semibold text-muted-foreground">Choose when the message disappears.</p>
        </div>
        {OPTIONS.map((o) => (
          <button type="button"
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-colors ${
              value === o.value ? "zivo-chat-row-unread font-black text-primary" : "font-bold text-foreground hover:bg-muted/20"
            }`}
          >
            <span>{o.label}</span>
            {value === o.value && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
