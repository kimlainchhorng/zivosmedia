import { Button } from "@/components/ui/button";
import type { PrivacyChoice } from "@/hooks/usePrivacy";

interface Props {
  label: string;
  description?: string;
  value: PrivacyChoice;
  onChange: (next: PrivacyChoice) => void;
}

const OPTIONS: { value: PrivacyChoice; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "contacts", label: "Contacts" },
  { value: "nobody", label: "Nobody" },
];

export default function PrivacyMatrixRow({ label, description, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex rounded-full bg-muted p-0.5 shrink-0">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(o.value)}
            className={`h-7 px-3 rounded-full text-xs ${
              value === o.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
