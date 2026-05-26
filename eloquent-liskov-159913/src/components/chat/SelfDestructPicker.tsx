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
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            value ? "text-orange-500 bg-orange-500/10" : "hover:bg-muted text-muted-foreground"
          }`}
          aria-label="Self-destruct timer"
        >
          <Flame className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-48 p-1">
        {OPTIONS.map((o) => (
          <button type="button"
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted"
          >
            <span>{o.label}</span>
            {value === o.value && <Check className="w-4 h-4 text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
