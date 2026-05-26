/**
 * Lodging — Dynamic Pricing / Yield Rules.
 * Define automatic rate adjustment rules based on occupancy, lead time, or day of week.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Zap, Plus, Pencil, Trash2, TrendingUp, TrendingDown,
  Clock, Calendar, Sun, Moon, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type TriggerType = "occupancy_threshold" | "lead_time" | "day_of_week" | "season" | "last_minute" | "early_bird";
type AdjType = "percent" | "fixed_cents";
type AppliesTo = "all" | "weekday" | "weekend";

interface YieldRule {
  id: string;
  rule_name: string;
  trigger_type: TriggerType;
  trigger_value: string;
  adjustment_type: AdjType;
  adjustment_value: number;
  applies_to: AppliesTo;
  is_active: boolean;
  sort_order: number;
}

const TRIGGER_LABEL: Record<TriggerType, string> = {
  occupancy_threshold: "Occupancy threshold",
  lead_time: "Booking lead time",
  day_of_week: "Day of week",
  season: "Season / date range",
  last_minute: "Last-minute (< 48h)",
  early_bird: "Early bird (> 30 days)",
};

const TRIGGER_ICON: Record<TriggerType, any> = {
  occupancy_threshold: TrendingUp,
  lead_time: Clock,
  day_of_week: Calendar,
  season: Sun,
  last_minute: AlertTriangle,
  early_bird: Moon,
};

const TRIGGER_HINT: Record<TriggerType, string> = {
  occupancy_threshold: "When occupancy exceeds this % — raise rates",
  lead_time: "When booked this many days before check-in",
  day_of_week: "e.g. Fri,Sat for weekends (comma-separated day numbers 0–6)",
  season: "Date range e.g. 2026-06-01:2026-08-31",
  last_minute: "Applied when check-in is within 48 hours",
  early_bird: "Applied when booked more than 30 days ahead",
};

const PRESETS: Partial<YieldRule>[] = [
  { rule_name: "High demand rate increase", trigger_type: "occupancy_threshold", trigger_value: "80", adjustment_type: "percent", adjustment_value: 15, applies_to: "all", is_active: true },
  { rule_name: "Near sellout surge", trigger_type: "occupancy_threshold", trigger_value: "90", adjustment_type: "percent", adjustment_value: 25, applies_to: "all", is_active: true },
  { rule_name: "Last-minute discount", trigger_type: "last_minute", trigger_value: "48", adjustment_type: "percent", adjustment_value: -10, applies_to: "all", is_active: true },
  { rule_name: "Early bird discount", trigger_type: "early_bird", trigger_value: "30", adjustment_type: "percent", adjustment_value: -15, applies_to: "all", is_active: true },
  { rule_name: "Weekend premium", trigger_type: "day_of_week", trigger_value: "5,6", adjustment_type: "percent", adjustment_value: 20, applies_to: "weekend", is_active: true },
];

const BLANK: Partial<YieldRule> = {
  rule_name: "",
  trigger_type: "occupancy_threshold",
  trigger_value: "80",
  adjustment_type: "percent",
  adjustment_value: 10,
  applies_to: "all",
  is_active: true,
};

const fmt = (rule: YieldRule) => {
  const sign = rule.adjustment_value >= 0 ? "+" : "";
  if (rule.adjustment_type === "percent") return `${sign}${rule.adjustment_value}%`;
  return `${sign}$${(rule.adjustment_value / 100).toFixed(2)}`;
};

export default function LodgingYieldRulesSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<YieldRule | null>(null);
  const [form, setForm] = useState<Partial<YieldRule>>(BLANK);

  const query = useQuery({
    queryKey: ["lodge_yield_rules", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_yield_rules")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as YieldRule[];
    },
  });

  const openCreate = (preset?: Partial<YieldRule>) => {
    setEditing(null);
    setForm(preset ? { ...BLANK, ...preset } : BLANK);
    setDialogOpen(true);
  };

  const openEdit = (r: YieldRule) => { setEditing(r); setForm(r); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        rule_name: form.rule_name,
        trigger_type: form.trigger_type,
        trigger_value: form.trigger_value || "",
        adjustment_type: form.adjustment_type,
        adjustment_value: form.adjustment_value ?? 0,
        applies_to: form.applies_to,
        is_active: form.is_active ?? true,
        sort_order: form.sort_order ?? 0,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_yield_rules").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_yield_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Rule updated" : "Rule created");
      qc.invalidateQueries({ queryKey: ["lodge_yield_rules", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("lodge_yield_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_yield_rules", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_yield_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["lodge_yield_rules", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const activeCount = all.filter(r => r.is_active).length;

  const isValid = form.rule_name?.trim() && form.trigger_value?.trim();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Dynamic Pricing Rules</CardTitle>
        <Button size="sm" onClick={() => openCreate()} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New rule
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-yield" />
        <LodgingSectionStatusBanner
          title="Dynamic Pricing"
          icon={Zap}
          countLabel="Active rules"
          countValue={activeCount}
          fixLabel="Open Revenue Mgmt"
          fixTab="lodge-revenue"
        />

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          Rules adjust room rates automatically based on occupancy, booking timing, or day of week. Rules are evaluated in order and can stack. They apply as percentage or fixed-amount adjustments on top of the base rate.
        </div>

        {/* Quick-start presets */}
        {all.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Add preset rules:</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <Button key={p.rule_name} size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => openCreate(p)}>
                  {p.rule_name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Rule list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : all.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No pricing rules yet. Add rules to automate rate management.
          </div>
        ) : (
          <div className="space-y-2">
            {all.map(r => {
              const Icon = TRIGGER_ICON[r.trigger_type];
              const isUp = r.adjustment_value > 0;
              return (
                <div key={r.id} className={`rounded-lg border p-3 ${!r.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{r.rule_name}</span>
                        <Badge variant="outline" className="text-[10px]">{TRIGGER_LABEL[r.trigger_type]}</Badge>
                        <span className={`text-[11px] font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                          {isUp ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                          {fmt(r)}
                        </span>
                        {!r.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Condition: <span className="font-medium text-foreground">{r.trigger_value}</span>
                        {r.applies_to !== "all" && ` · ${r.applies_to} only`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={v => toggleActive.mutate({ id: r.id, is_active: v })}
                        className="scale-75"
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => { if (confirm("Delete this rule?")) deleteRule.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit rule" : "New pricing rule"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Rule name *</Label>
                <Input value={form.rule_name || ""} onChange={e => setForm({ ...form, rule_name: e.target.value })} placeholder="e.g. High season premium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Trigger type</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm({ ...form, trigger_type: v as TriggerType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRIGGER_LABEL) as TriggerType[]).map(k => (
                        <SelectItem key={k} value={k}>{TRIGGER_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Applies to</Label>
                  <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v as AppliesTo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All days</SelectItem>
                      <SelectItem value="weekday">Weekdays only</SelectItem>
                      <SelectItem value="weekend">Weekends only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Trigger value *</Label>
                <Input
                  value={form.trigger_value || ""}
                  onChange={e => setForm({ ...form, trigger_value: e.target.value })}
                  placeholder={TRIGGER_HINT[form.trigger_type as TriggerType]}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">{TRIGGER_HINT[form.trigger_type as TriggerType]}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Adjustment type</Label>
                  <Select value={form.adjustment_type} onValueChange={v => setForm({ ...form, adjustment_type: v as AdjType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_cents">Fixed amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value (negative = discount)</Label>
                  <Input
                    type="number"
                    step={form.adjustment_type === "percent" ? "1" : "0.01"}
                    value={form.adjustment_type === "fixed_cents"
                      ? ((form.adjustment_value ?? 0) / 100).toFixed(2)
                      : (form.adjustment_value ?? "")}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      setForm({ ...form, adjustment_value: form.adjustment_type === "fixed_cents" ? Math.round(v * 100) : v });
                    }}
                    placeholder={form.adjustment_type === "percent" ? "e.g. 15" : "e.g. 25.00"}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
