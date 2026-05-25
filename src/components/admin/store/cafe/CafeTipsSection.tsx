/**
 * CafeTipsSection — show the tip pool collected in a window and split it
 * across baristas (equal / by hours / custom weight).
 *
 * Pool is computed from cafe_payments.tip_cents; this section is read-only
 * for now — the actual payout reconciliation lives in payroll exports.
 */
import { useState } from "react";
import { Banknote, Loader2, Users, Equal, History } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCafeTips, type TipSplitMode } from "@/hooks/cafe/useCafeTips";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtHrs = (mins: number) => `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, "0")}m`;

const MODE_LABEL: Record<TipSplitMode, string> = {
  equal: "Equal split",
  by_hours: "By hours",
  weighted: "Custom weights",
};

const WINDOW_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 1, label: "Today" },
  { days: 7, label: "This week" },
  { days: 30, label: "Last 30d" },
];

export default function CafeTipsSection({ storeId }: Props) {
  const [days, setDays] = useState(1);
  const { poolCents, distribution, mode, setMode, weights, setWeight, payouts, paying, payOut, loading } = useCafeTips(storeId, days);
  const [payDialog, setPayDialog] = useState(false);
  const [payNotes, setPayNotes] = useState("");

  const handlePayOut = async () => {
    const ok = await payOut(payNotes);
    if (ok) { setPayDialog(false); setPayNotes(""); toast.success(`${fmt(poolCents)} paid out across ${distribution.length} ${distribution.length === 1 ? "person" : "people"}.`); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Tip pool</h2>
        <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
          {WINDOW_OPTIONS.map(({ days: d, label }) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn(
              "px-3 py-1 text-xs",
              days === d ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pool</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(poolCents)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Eligible staff</p>
          <p className="text-2xl font-bold tabular-nums">{distribution.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Per person avg</p>
          <p className="text-2xl font-bold tabular-nums">{distribution.length > 0 ? fmt(Math.round(poolCents / distribution.length)) : "—"}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Distribution</span>
            <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
              {(["equal", "by_hours", "weighted"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={cn(
                  "px-3 py-1 text-xs",
                  mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}>{MODE_LABEL[m]}</button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {distribution.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No tips in this window — or no eligible baristas have clocked in.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {distribution.map((line) => {
                const pct = poolCents > 0 ? Math.round((line.payout_cents / poolCents) * 100) : 0;
                return (
                  <li key={line.barista_id} className="py-3 flex items-center gap-3 flex-wrap">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 font-bold uppercase">
                      {line.display_name.slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{line.display_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {fmtHrs(line.minutes_worked)} worked
                        {mode === "weighted" && <span> · weight {weights[line.barista_id] ?? 0}</span>}
                      </p>
                    </div>
                    {mode === "weighted" && (
                      <Input
                        type="number" min={0} step="0.5"
                        value={weights[line.barista_id] ?? 0}
                        onChange={(e) => setWeight(line.barista_id, parseFloat(e.target.value || "0"))}
                        className="h-8 w-20 tabular-nums"
                      />
                    )}
                    <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right">{pct}%</span>
                    <span className="font-semibold tabular-nums w-20 text-right">{fmt(line.payout_cents)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-muted-foreground">
          Pay out to snapshot this distribution. Each barista keeps a record on their profile.
        </p>
        <Button
          size="sm" className="gap-1"
          onClick={() => setPayDialog(true)}
          disabled={poolCents <= 0 || distribution.length === 0}
        >
          <Banknote className="h-3.5 w-3.5" /> Pay out {fmt(poolCents)}
        </Button>
      </div>

      {payouts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Recent payouts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border/60 text-sm">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="min-w-0">
                    <span className="block font-medium tabular-nums">
                      {new Date(p.paid_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(p.paid_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {MODE_LABEL[p.mode]}{p.notes ? ` · ${p.notes}` : ""}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{fmt(p.total_cents)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay out {fmt(poolCents)}?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {distribution.length} {distribution.length === 1 ? "person" : "people"} · {MODE_LABEL[mode]}.
              Snapshots the current split — future changes won&rsquo;t rewrite this record.
            </p>
            <Textarea rows={2}
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayDialog(false)} disabled={paying}>Cancel</Button>
            <Button onClick={handlePayOut} disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirm pay out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
