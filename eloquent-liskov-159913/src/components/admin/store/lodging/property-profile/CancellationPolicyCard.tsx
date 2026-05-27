/**
 * CancellationPolicyCard - 4 preset cards + override textarea + window hours.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarX, Sparkles, Shield, Lock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface Preset {
  key: string;
  label: string;
  icon: typeof Sparkles;
  windowHours: number;
  description: string;
}

const PRESETS: Preset[] = [
  { key: "flexible", label: "Flexible", icon: Sparkles, windowHours: 24, description: "Free cancellation up to 24h before check-in" },
  { key: "moderate", label: "Moderate", icon: Shield, windowHours: 72, description: "Free cancellation up to 3 days before check-in" },
  { key: "strict", label: "Strict", icon: Lock, windowHours: 168, description: "Free cancellation up to 7 days before check-in" },
  { key: "non_refundable", label: "Non-refundable", icon: Ban, windowHours: 0, description: "No refund after booking" },
];

interface Props {
  policy?: string;
  windowHours?: number;
  onChange: (patch: { cancellation_policy?: string; cancellation_window_hours?: number }) => void;
}

export default function CancellationPolicyCard({ policy, windowHours, onChange }: Props) {
  const matched = PRESETS.find(p => p.description === policy || p.key === policy);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-[13px]"><CalendarX className="h-3.5 w-3.5" /> Cancellation policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESETS.map(p => {
            const Icon = p.icon;
            const active = matched?.key === p.key;
            return (
              <button type="button"
                key={p.key}
                onClick={() => onChange({ cancellation_policy: p.description, cancellation_window_hours: p.windowHours })}
                className={cn(
                  "rounded-xl border p-2 text-left transition",
                  active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground">{p.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{p.description}</p>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Label className="text-[11px] text-muted-foreground">Free-cancel window (hours)</Label>
            <Input
              type="number" inputMode="numeric" className="h-9"
              value={windowHours ?? ""}
              onChange={e => onChange({ cancellation_window_hours: e.target.value === "" ? undefined : parseInt(e.target.value) })}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Custom policy text (optional)</Label>
            <Textarea
              rows={2} className="text-[12px] min-h-[36px]"
              placeholder="Describe your policy in your own words"
              value={policy || ""}
              onChange={e => onChange({ cancellation_policy: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
