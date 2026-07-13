/**
 * CafeTillCard — open / close the cash drawer for a shift. While open the
 * card lives-shows expected cash (starting float + net cash payments so
 * far). At close the manager enters what they counted; we save the
 * variance for audit.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2, Lock, Unlock, AlertTriangle, ArrowDownToLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCafeTill } from "@/hooks/cafe/useCafeTill";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";

interface Props { storeId: string }

export default function CafeTillCard({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (cents: number | null | undefined) =>
    cents == null ? "—" : formatCafeMoney(cents, currencyCode);
  const { current, recent, drops, expectedLive, loading, working, error, openTill, closeTill, recordDrop, refresh } = useCafeTill(storeId);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [dropDialog, setDropDialog] = useState(false);
  const [startCashInput, setStartCashInput] = useState("");
  const [countedInput, setCountedInput] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [dropAmount, setDropAmount] = useState("");
  const [dropNote, setDropNote] = useState("");

  const handleDrop = async () => {
    const cents = Math.round(parseFloat(dropAmount || "0") * 100);
    if (!cents || cents <= 0) { toast.error("Enter a positive amount."); return; }
    const ok = await recordDrop(cents, dropNote);
    if (ok) { setDropDialog(false); setDropAmount(""); setDropNote(""); toast.success(`Dropped ${`$${(cents / 100).toFixed(2)}`}.`); }
  };

  const handleOpen = async () => {
    const cents = Math.round(parseFloat(startCashInput || "0") * 100);
    const ok = await openTill(isNaN(cents) ? 0 : cents);
    if (ok) { setOpenDialog(false); setStartCashInput(""); }
  };

  const handleClose = async () => {
    const cents = Math.round(parseFloat(countedInput || "0") * 100);
    const ok = await closeTill(isNaN(cents) ? 0 : cents, closeNotes);
    if (ok) { setCloseDialog(false); setCountedInput(""); setCloseNotes(""); }
  };

  const liveVariance = (() => {
    if (!current || expectedLive == null) return null;
    const counted = parseFloat(countedInput || "");
    if (isNaN(counted)) return null;
    return Math.round(counted * 100) - expectedLive;
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Banknote className="h-4 w-4 text-emerald-600" /> Cash till</span>
          {!loading && (
            current
              ? <Badge variant="default" className="text-[10px]">OPEN</Badge>
              : <Badge variant="secondary" className="text-[10px]">CLOSED</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : current ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starting</p>
                <p className="font-bold tabular-nums">{fmt(current.starting_cash_cents)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expected now</p>
                <p className="font-bold tabular-nums">{fmt(expectedLive)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Opened</p>
                <p className="font-bold tabular-nums">{new Date(current.opened_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="default" onClick={() => setCloseDialog(true)} className="gap-1">
                <Lock className="h-3.5 w-3.5" /> Close till
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDropDialog(true)} className="gap-1">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Drop cash
              </Button>
              <Button size="sm" variant="ghost" onClick={refresh} className="text-xs">Refresh</Button>
            </div>
            {drops.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Drops this shift · −{fmt(drops.reduce((s, d) => s + d.amount_cents, 0))}
                </p>
                <ul className="space-y-1 text-sm">
                  {drops.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(d.dropped_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <span className="flex-1 px-2 text-muted-foreground truncate">{d.note ?? ""}</span>
                      <span className="tabular-nums font-medium">−{fmt(d.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No till open. Open the till at the start of the shift to track cash variance.</p>
            <Button size="sm" onClick={() => setOpenDialog(true)} className="gap-1">
              <Unlock className="h-3.5 w-3.5" /> Open till
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        {recent.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Recent shifts</p>
            <ul className="divide-y divide-border/60 text-sm">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground tabular-nums text-[12px]">
                    {new Date(s.opened_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(s.opened_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {s.closed_at ? ` – ${new Date(s.closed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums text-[12px]">
                    <span className="text-muted-foreground">exp {fmt(s.expected_cash_cents)}</span>
                    <span>cnt {fmt(s.counted_cash_cents)}</span>
                    <span className={cn(
                      "font-semibold",
                      s.variance_cents == null ? "" :
                      s.variance_cents === 0 ? "text-emerald-600" :
                      Math.abs(s.variance_cents) <= 500 ? "text-amber-600" : "text-destructive",
                    )}>
                      {s.variance_cents != null && s.variance_cents > 0 ? "+" : ""}{fmt(s.variance_cents)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={dropDialog} onOpenChange={setDropDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Drop cash</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="till-drop-amount">Amount ($)</Label>
            <Input id="till-drop-amount" type="number" step="0.01" min="0" autoFocus
              value={dropAmount} onChange={(e) => setDropAmount(e.target.value)}
              placeholder="100.00"
            />
            <Label htmlFor="till-drop-note">Note (optional)</Label>
            <Input id="till-drop-note"
              value={dropNote} onChange={(e) => setDropNote(e.target.value)}
              placeholder="e.g. Bank drop"
            />
            <p className="text-[11px] text-muted-foreground">Removes the amount from the expected drawer total so close-of-shift variance stays accurate.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDropDialog(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleDrop} disabled={working || !dropAmount}>
              {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Drop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open till</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="till-start">Starting cash ($)</Label>
            <Input id="till-start" type="number" step="0.01" min="0" autoFocus
              value={startCashInput}
              onChange={(e) => setStartCashInput(e.target.value)}
              placeholder="50.00"
            />
            <p className="text-[12px] text-muted-foreground">Count the float you put in the drawer. Tracked against cash payments until you close the till.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleOpen} disabled={working}>
              {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Open till
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close till</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starting cash</p>
                <p className="font-bold tabular-nums">{fmt(current?.starting_cash_cents)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expected in drawer</p>
                <p className="font-bold tabular-nums">{fmt(expectedLive)}</p>
              </div>
            </div>
            <div>
              <Label htmlFor="till-counted">Counted cash ($)</Label>
              <Input id="till-counted" type="number" step="0.01" min="0" autoFocus
                value={countedInput}
                onChange={(e) => setCountedInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {liveVariance != null && (
              <div className={cn(
                "rounded-md border px-3 py-2 text-sm flex items-center justify-between",
                liveVariance === 0 ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" :
                Math.abs(liveVariance) <= 500 ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300" :
                "border-destructive/40 bg-destructive/5 text-destructive",
              )}>
                <span>Variance</span>
                <span className="font-bold tabular-nums">
                  {liveVariance > 0 ? "+" : ""}{fmt(liveVariance)}
                </span>
              </div>
            )}
            <div>
              <Label htmlFor="till-notes">Notes (optional)</Label>
              <Textarea id="till-notes" rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="e.g. $5 short — gave change from purse"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleClose} disabled={working || !countedInput}>
              {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Close till
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
