/**
 * AutomationCanvas — Linear left-to-right flow editor.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, Zap } from "lucide-react";
import {
  useUpsertAutomation,
  type Automation,
  type AutomationStep,
  type AutomationActionType,
  type AutomationTriggerType,
} from "@/hooks/useMarketingAutomations";
import AutomationNode from "./AutomationNode";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  automation?: Automation | null;
}

const TRIGGERS: { id: AutomationTriggerType; label: string }[] = [
  { id: "cart_abandoned", label: "Cart abandoned" },
  { id: "first_order", label: "First order placed" },
  { id: "no_order_in_days", label: "No order in N days" },
  { id: "birthday", label: "Customer birthday" },
  { id: "loyalty_tier_change", label: "Loyalty tier change" },
  { id: "wishlist_price_drop", label: "Wishlist price drop" },
];

const ACTIONS: { id: AutomationActionType; label: string }[] = [
  { id: "send_push", label: "Send push" },
  { id: "send_email", label: "Send email" },
  { id: "send_sms", label: "Send SMS" },
  { id: "apply_promo", label: "Apply promo" },
  { id: "add_to_segment", label: "Add to segment" },
  { id: "wait", label: "Wait N hours" },
];

export default function AutomationCanvas({ open, onClose, storeId, automation }: Props) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("cart_abandoned");
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const upsert = useUpsertAutomation(storeId);

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setTriggerType(automation.trigger_json?.type || "cart_abandoned");
      setSteps(automation.steps_json || []);
    } else {
      setName(""); setTriggerType("cart_abandoned"); setSteps([]);
    }
  }, [automation, open]);

  const addStep = (type: AutomationActionType) => {
    setSteps((s) => [...s, { id: crypto.randomUUID(), type, config: {} }]);
  };
  const removeStep = (id: string) => setSteps((s) => s.filter((x) => x.id !== id));

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: automation?.id,
      name,
      trigger_json: { type: triggerType, config: {} },
      steps_json: steps,
      status: automation?.status || "draft",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{automation ? "Edit automation" : "New automation"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Welcome new customers" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Trigger</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-lg border bg-muted/20 p-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <div className="rounded-lg bg-amber-500/10 text-amber-600 px-3 py-2 text-xs font-medium flex items-center gap-1.5 shrink-0">
                <Zap className="w-3.5 h-3.5" />
                {TRIGGERS.find((t) => t.id === triggerType)?.label}
              </div>
              {steps.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <AutomationNode step={s} onRemove={() => removeStep(s.id)} onChange={(patch) => setSteps((arr) => arr.map((x) => x.id === s.id ? { ...x, ...patch } : x))} />
                </div>
              ))}
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="rounded-lg border-2 border-dashed border-primary/40 p-2 shrink-0">
                <p className="text-[10px] text-muted-foreground mb-1.5">Add step</p>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {ACTIONS.map((a) => (
                    <Button key={a.id} size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => addStep(a.id)}>
                      <Plus className="w-2.5 h-2.5 mr-0.5" />{a.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {automation && automation.enrolled_count > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{automation.enrolled_count}</span> customers in this flow right now
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending}>
              {upsert.isPending ? "Saving..." : "Save automation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
