/**
 * AutomationNode — Single step card in the canvas.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Mail, MessageSquare, Tag, Users, Clock, X } from "lucide-react";
import type { AutomationStep, AutomationActionType } from "@/hooks/useMarketingAutomations";

const META: Record<AutomationActionType, { icon: any; label: string; tone: string }> = {
  send_push: { icon: Bell, label: "Push", tone: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  send_email: { icon: Mail, label: "Email", tone: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
  send_sms: { icon: MessageSquare, label: "SMS", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  apply_promo: { icon: Tag, label: "Promo", tone: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  add_to_segment: { icon: Users, label: "Segment", tone: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30" },
  wait: { icon: Clock, label: "Wait", tone: "bg-muted text-muted-foreground border-border" },
};

export default function AutomationNode({
  step,
  onRemove,
  onChange,
}: {
  step: AutomationStep;
  onRemove: () => void;
  onChange: (patch: Partial<AutomationStep>) => void;
}) {
  const m = META[step.type];
  const Icon = m.icon;
  return (
    <div className={`rounded-lg border-2 p-2 min-w-[140px] shrink-0 ${m.tone} relative group`}>
      <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-background border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-2.5 h-2.5" />
      </button>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">{m.label}</span>
      </div>
      {step.type === "wait" ? (
        <Input
          type="number"
          value={step.config?.hours || 24}
          onChange={(e) => onChange({ config: { ...step.config, hours: parseInt(e.target.value) || 0 } })}
          className="h-6 text-[10px]"
          placeholder="hours"
        />
      ) : (
        <Input
          value={step.config?.template || ""}
          onChange={(e) => onChange({ config: { ...step.config, template: e.target.value } })}
          className="h-6 text-[10px]"
          placeholder="template name"
        />
      )}
    </div>
  );
}
