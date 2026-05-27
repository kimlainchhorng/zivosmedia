/**
 * CarRentalRatesSection — pricing overview with inline edit per vehicle.
 *
 * The detailed vehicle edit lives in the Fleet section. This view is for
 * quickly reviewing & adjusting rates across the whole fleet without opening
 * each vehicle individually.
 */
import { useMemo, useState } from "react";
import {
  DollarSign, Loader2, AlertTriangle, Car, Pencil, Check, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCarRentalVehicles, type CarRentalVehicle } from "@/hooks/car-rental/useCarRentalVehicles";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

type RateField = "daily_rate_cents" | "weekly_rate_cents" | "monthly_rate_cents" | "extra_mile_cents" | "security_deposit_cents" | "mileage_limit_per_day";

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalRatesSection({ storeId }: Props) {
  const { vehicles, loading, saving, error, update } = useCarRentalVehicles(storeId);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingCell, setEditingCell] = useState<{ id: string; field: RateField } | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return vehicles;
    return vehicles.filter((v) => v.category === categoryFilter);
  }, [vehicles, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const v of vehicles) set.add(v.category);
    return Array.from(set).sort();
  }, [vehicles]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const dailySum = filtered.reduce((s, v) => s + v.daily_rate_cents, 0);
    const avg = dailySum / filtered.length;
    const min = Math.min(...filtered.map((v) => v.daily_rate_cents));
    const max = Math.max(...filtered.map((v) => v.daily_rate_cents));
    return { avg, min, max };
  }, [filtered]);

  const startEdit = (v: CarRentalVehicle, field: RateField) => {
    setEditingCell({ id: v.id, field });
    const current = v[field] ?? 0;
    setDraftValue(
      field === "mileage_limit_per_day"
        ? String(current ?? "")
        : field === "extra_mile_cents"
          ? ((current ?? 0) / 100).toFixed(2)
          : String(((current ?? 0) / 100).toFixed(0))
    );
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const num = Number(draftValue);
    if (Number.isNaN(num) || num < 0) { setEditingCell(null); return; }
    const field = editingCell.field;
    const newValue: number | null =
      field === "mileage_limit_per_day"
        ? (draftValue === "" ? null : Math.round(num))
        : field === "extra_mile_cents"
          ? Math.round(num * 100)
          : Math.round(num * 100);
    await update(editingCell.id, { [field]: newValue } as never);
    setEditingCell(null);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" /> Rates & plans
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {filtered.length}
            </span>
          </CardTitle>
          {categories.length > 1 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {stats && (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBox label="Avg daily rate" value={formatMoney(Math.round(stats.avg))} />
              <StatBox label="Lowest daily" value={formatMoney(stats.min)} />
              <StatBox label="Highest daily" value={formatMoney(stats.max)} />
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {vehicles.length === 0 ? "Add vehicles in the Fleet tab to manage rates." : "No vehicles in this category."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Vehicle</th>
                    <th className="px-2 py-2 text-right font-semibold">Daily</th>
                    <th className="px-2 py-2 text-right font-semibold">Weekly</th>
                    <th className="px-2 py-2 text-right font-semibold">Monthly</th>
                    <th className="px-2 py-2 text-right font-semibold">Miles / day</th>
                    <th className="px-2 py-2 text-right font-semibold">Extra mi</th>
                    <th className="px-2 py-2 text-right font-semibold">Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-foreground">
                          {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">{v.category}</p>
                      </td>
                      <RateCell v={v} field="daily_rate_cents" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} />
                      <RateCell v={v} field="weekly_rate_cents" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} />
                      <RateCell v={v} field="monthly_rate_cents" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} />
                      <RateCell v={v} field="mileage_limit_per_day" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} formatter={(c) => c === null ? "Unlimited" : c.toLocaleString()} placeholderEmpty="∞" />
                      <RateCell v={v} field="extra_mile_cents" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} formatter={(c) => `$${((c ?? 0) / 100).toFixed(2)}`} />
                      <RateCell v={v} field="security_deposit_cents" editing={editingCell} draft={draftValue} setDraft={setDraftValue} start={startEdit} commit={commitEdit} cancel={() => setEditingCell(null)} saving={saving} />
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Click any value to edit inline. Press Enter to save, Esc to cancel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RateCell({
  v, field, editing, draft, setDraft, start, commit, cancel, saving, formatter, placeholderEmpty,
}: {
  v: CarRentalVehicle;
  field: RateField;
  editing: { id: string; field: RateField } | null;
  draft: string;
  setDraft: (s: string) => void;
  start: (v: CarRentalVehicle, f: RateField) => void;
  commit: () => Promise<void>;
  cancel: () => void;
  saving: boolean;
  formatter?: (cents: number | null) => string;
  placeholderEmpty?: string;
}) {
  const isEditing = editing?.id === v.id && editing.field === field;
  const current = v[field] ?? 0;
  const display = formatter
    ? formatter(current as number | null)
    : current === 0
      ? (placeholderEmpty ?? "—")
      : `$${((current as number) / 100).toFixed(0)}`;

  if (isEditing) {
    return (
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <Input
            autoFocus
            type="number"
            step="0.01"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit();
              if (e.key === "Escape") cancel();
            }}
            className="h-7 w-24 text-right text-xs"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void commit()} disabled={saving}>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    );
  }

  return (
    <td className="px-2 py-2 text-right">
      <button type="button" onClick={() => start(v, field)} className="group inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-muted">
        <span className="font-semibold text-foreground">{display}</span>
        <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      </button>
    </td>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3")}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
