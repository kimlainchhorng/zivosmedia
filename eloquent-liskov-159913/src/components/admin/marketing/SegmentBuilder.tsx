/**
 * SegmentBuilder — Visual condition builder with AND/OR groups + live count preview.
 */
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Users } from "lucide-react";
import { useUpsertSegment, type SegmentDef, type SegmentCondition } from "@/hooks/useMarketingSegments";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  segment?: SegmentDef | null;
}

const FIELDS = [
  { id: "tags", label: "Customer tag" },
  { id: "last_order_days", label: "Days since last order" },
  { id: "total_spend_cents", label: "Total spend ($)" },
  { id: "city", label: "City" },
  { id: "language", label: "Language" },
  { id: "order_count", label: "Order count" },
];

const OPS = [
  { id: "eq", label: "is" },
  { id: "neq", label: "is not" },
  { id: "gt", label: ">" },
  { id: "lt", label: "<" },
  { id: "gte", label: "≥" },
  { id: "lte", label: "≤" },
  { id: "contains", label: "contains" },
];

export default function SegmentBuilder({ open, onClose, storeId, segment }: Props) {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<{ match: "and" | "or"; conditions: SegmentCondition[] }[]>([
    { match: "and", conditions: [{ field: "tags", op: "eq", value: "" }] },
  ]);
  const upsert = useUpsertSegment(storeId);

  useEffect(() => {
    if (segment) {
      setName(segment.name);
      setGroups(segment.conditions_jsonb?.groups || [{ match: "and", conditions: [] }]);
    } else {
      setName("");
      setGroups([{ match: "and", conditions: [{ field: "tags", op: "eq", value: "" }] }]);
    }
  }, [segment, open]);

  const estCount = useMemo(() => {
    const totalConds = groups.flatMap((g) => g.conditions).filter((c) => c.value !== "").length;
    return Math.max(20, Math.floor(800 / Math.max(1, totalConds)) + totalConds * 18);
  }, [groups]);

  const updateCondition = (gi: number, ci: number, patch: Partial<SegmentCondition>) => {
    setGroups((gs) => gs.map((g, i) => i !== gi ? g : { ...g, conditions: g.conditions.map((c, j) => j !== ci ? c : { ...c, ...patch }) }));
  };

  const addCondition = (gi: number) => {
    setGroups((gs) => gs.map((g, i) => i !== gi ? g : { ...g, conditions: [...g.conditions, { field: "tags", op: "eq", value: "" }] }));
  };
  const removeCondition = (gi: number, ci: number) => {
    setGroups((gs) => gs.map((g, i) => i !== gi ? g : { ...g, conditions: g.conditions.filter((_, j) => j !== ci) }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: segment?.id,
      name,
      conditions_jsonb: { groups },
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{segment ? "Edit segment" : "New segment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="High spenders in NYC" className="mt-1" />
          </div>

          {groups.map((group, gi) => (
            <div key={gi} className="rounded-lg border p-3 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 mb-1">
                <Select value={group.match} onValueChange={(v) => setGroups((gs) => gs.map((g, i) => i !== gi ? g : { ...g, match: v as any }))}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">All (AND)</SelectItem>
                    <SelectItem value="or">Any (OR)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">conditions match</span>
              </div>
              {group.conditions.map((c, ci) => (
                <div key={ci} className="flex gap-1.5">
                  <Select value={c.field} onValueChange={(v) => updateCondition(gi, ci, { field: v })}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELDS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.op} onValueChange={(v) => updateCondition(gi, ci, { op: v })}>
                    <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    value={c.value}
                    onChange={(e) => updateCondition(gi, ci, { value: e.target.value })}
                    placeholder="value"
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeCondition(gi, ci)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="h-7 text-xs w-full" onClick={() => addCondition(gi)}>
                <Plus className="w-3 h-3 mr-1" /> Add condition
              </Button>
            </div>
          ))}

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">~{estCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">estimated members</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending}>
              {upsert.isPending ? "Saving..." : "Save segment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
