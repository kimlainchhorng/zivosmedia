/**
 * AutomationsBuilder — List automations with quick canvas preview.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Zap, Trash2, Edit, Users } from "lucide-react";
import {
  useMarketingAutomations,
  useToggleAutomationStatus,
  useDeleteAutomation,
  type Automation,
} from "@/hooks/useMarketingAutomations";
import AutomationCanvas from "./AutomationCanvas";

export default function AutomationsBuilder({ storeId }: { storeId: string }) {
  const { data: automations = [], isLoading } = useMarketingAutomations(storeId);
  const toggle = useToggleAutomationStatus(storeId);
  const del = useDeleteAutomation(storeId);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Automations</h3>
          <p className="text-[11px] text-muted-foreground">{automations.length} flows · {automations.reduce((s, a) => s + a.enrolled_count, 0)} customers enrolled</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> New flow
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Loading...</div>
      ) : automations.length === 0 ? (
        <Card><CardContent className="text-center py-10">
          <Zap className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">No automations yet</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Set up triggered flows like "send welcome email when first order placed".
          </p>
          <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create automation
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {automations.map((a) => (
            <Card key={a.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold truncate">{a.name}</h4>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">{a.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="capitalize">Trigger: {(a.trigger_json?.type || "").replace(/_/g, " ")}</span>
                    <span>· {a.steps_json?.length || 0} steps</span>
                    <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{a.enrolled_count}</span>
                  </div>
                </div>
                <Switch
                  checked={a.status === "active"}
                  onCheckedChange={(v) => toggle.mutate({ id: a.id, status: v ? "active" : "paused" })}
                  className="scale-75"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(a)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del.mutate(a.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AutomationCanvas
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        storeId={storeId}
        automation={editing}
      />
    </div>
  );
}
