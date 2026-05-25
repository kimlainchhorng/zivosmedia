/**
 * SalonGiftCardsSection — issue and track store-credit gift cards.
 * Cards have a unique code, an initial balance, and a running balance that
 * decrements when a redemption row is inserted (Postgres trigger). No
 * external payment is required — this is owner-issued credit.
 */
import { useMemo, useState } from "react";
import { Loader2, Plus, Copy, Check, AlertCircle, Trash2, Power, History, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSalonGiftCards, type SalonGiftCard } from "@/hooks/salon/useSalonGiftCards";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const PRESET_AMOUNTS = [2500, 5000, 7500, 10000, 15000];

export default function SalonGiftCardsSection({ storeId }: Props) {
  const { cards, redemptions, loading, error, refresh, issue, redeem, toggleActive, remove } =
    useSalonGiftCards(storeId);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);
  const [redeemFor, setRedeemFor] = useState<SalonGiftCard | null>(null);
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SalonGiftCard | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    amount: "50.00",
    recipient_name: "",
    recipient_email: "",
    message: "",
  });

  const [redeemDraft, setRedeemDraft] = useState({ amount: "", notes: "" });

  const redemptionsByCard = useMemo(() => {
    const m = new Map<string, typeof redemptions>();
    for (const r of redemptions) {
      const arr = m.get(r.gift_card_id) ?? [];
      arr.push(r);
      m.set(r.gift_card_id, arr);
    }
    return m;
  }, [redemptions]);

  const summary = useMemo(() => {
    let outstanding = 0;
    let issued = 0;
    let active = 0;
    for (const c of cards) {
      if (c.is_active) {
        outstanding += c.balance_cents;
        active += 1;
      }
      issued += c.initial_cents;
    }
    return { outstanding, issued, active };
  }, [cards]);

  const resetIssueDraft = () => setDraft({ amount: "50.00", recipient_name: "", recipient_email: "", message: "" });

  const handleIssue = async () => {
    const cents = Math.round(parseFloat(draft.amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    setIssueBusy(true);
    try {
      const card = await issue({
        initial_cents: cents,
        recipient_name: draft.recipient_name,
        recipient_email: draft.recipient_email,
        message: draft.message,
      });
      toast.success(`Issued ${formatMoney(cents)} — code ${card.code}`);
      resetIssueDraft();
      setIssueOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIssueBusy(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => c === code ? null : c), 1500);
    } catch {
      toast.error("Couldn't copy code.");
    }
  };

  const handleRedeem = async () => {
    if (!redeemFor) return;
    const cents = Math.round(parseFloat(redeemDraft.amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    if (cents > redeemFor.balance_cents) {
      toast.error(`Only ${formatMoney(redeemFor.balance_cents)} left on this card.`);
      return;
    }
    setRedeemBusy(true);
    try {
      await redeem(redeemFor.id, cents, { notes: redeemDraft.notes });
      toast.success(`Redeemed ${formatMoney(cents)}.`);
      setRedeemFor(null);
      setRedeemDraft({ amount: "", notes: "" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRedeemBusy(false);
    }
  };

  const handleToggleActive = async (card: SalonGiftCard) => {
    try {
      await toggleActive(card.id, !card.is_active);
      toast.success(card.is_active ? "Deactivated." : "Reactivated.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast.success("Deleted.");
      setConfirmDelete(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Outstanding balance" value={formatMoney(summary.outstanding)} />
        <Stat label="Active cards" value={String(summary.active)} />
        <Stat label="Total issued" value={formatMoney(summary.issued)} />
      </div>

      <ShareCheckLinkBar />


      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mr-1.5 inline h-4 w-4" /> {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Gift cards</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{cards.length} on file</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setIssueOpen(true)}>
            <Plus className="h-4 w-4" /> Issue card
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No gift cards issued yet. Click <strong>Issue card</strong> to create one.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {cards.map((c) => {
                const reds = redemptionsByCard.get(c.id) ?? [];
                const pctUsed = c.initial_cents === 0 ? 0 : 1 - c.balance_cents / c.initial_cents;
                const usedOut = c.balance_cents === 0;
                const expired = c.expires_at !== null && new Date(c.expires_at) < new Date();
                return (
                  <li key={c.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopy(c.code)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 font-mono text-sm font-bold tracking-wider text-foreground hover:bg-muted"
                            title="Click to copy"
                          >
                            {c.code}
                            {copiedCode === c.code ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </button>
                          {usedOut && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Used up
                            </span>
                          )}
                          {!c.is_active && !usedOut && (
                            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                              Disabled
                            </span>
                          )}
                          {expired && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {c.recipient_name && <span>For {c.recipient_name}</span>}
                          {c.recipient_email && <span>· {c.recipient_email}</span>}
                          <span>· issued {formatDate(c.created_at)}</span>
                          {c.expires_at && <span>· expires {formatDate(c.expires_at)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                          {formatMoney(c.balance_cents)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">of {formatMoney(c.initial_cents)}</p>
                      </div>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full transition-all",
                          usedOut ? "bg-muted-foreground/40" : "bg-emerald-500/70"
                        )}
                        style={{ width: `${Math.min(100, Math.round(pctUsed * 100))}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!c.is_active || usedOut}
                        onClick={() => { setRedeemFor(c); setRedeemDraft({ amount: "", notes: "" }); }}
                      >
                        Redeem
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => void handleToggleActive(c)}
                      >
                        <Power className="h-3.5 w-3.5" /> {c.is_active ? "Disable" : "Reactivate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                      {reds.length > 0 && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <History className="h-3 w-3" /> {reds.length} redemption{reds.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {reds.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {reds.slice(0, 5).map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1">
                            <span className="text-muted-foreground">
                              {formatDate(r.redeemed_at)} {r.notes ? `· ${r.notes}` : ""}
                            </span>
                            <span className="font-mono font-semibold text-foreground">−{formatMoney(r.amount_cents)}</span>
                          </li>
                        ))}
                        {reds.length > 5 && (
                          <li className="text-center text-[11px] text-muted-foreground">
                            + {reds.length - 5} more
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => void refresh()} className="text-xs">Refresh</Button>
      </div>

      <Dialog open={issueOpen} onOpenChange={(o) => { if (!o) resetIssueDraft(); setIssueOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue gift card</DialogTitle>
            <DialogDescription>
              A unique code is generated automatically. Share it with the recipient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="gc-amount">Amount</Label>
              <Input
                id="gc-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_AMOUNTS.map((p) => (
                  <Button
                    key={p} type="button" size="sm" variant="outline"
                    onClick={() => setDraft({ ...draft, amount: (p / 100).toFixed(2) })}
                  >
                    ${p / 100}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gc-name">Recipient name</Label>
                <Input id="gc-name" value={draft.recipient_name}
                  onChange={(e) => setDraft({ ...draft, recipient_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="gc-email">Recipient email</Label>
                <Input id="gc-email" type="email" value={draft.recipient_email}
                  onChange={(e) => setDraft({ ...draft, recipient_email: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="gc-msg">Message</Label>
              <Textarea id="gc-msg" rows={2} value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Optional — e.g. Happy Birthday!"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={issueBusy} onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={issueBusy} className="gap-1.5">
              {issueBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!redeemFor} onOpenChange={(o) => { if (!o) setRedeemFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem {redeemFor?.code}</DialogTitle>
            <DialogDescription>
              Balance available: {redeemFor ? formatMoney(redeemFor.balance_cents) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="r-amount">Amount to redeem</Label>
              <Input id="r-amount" type="number" min="0" step="0.01" inputMode="decimal"
                value={redeemDraft.amount}
                onChange={(e) => setRedeemDraft({ ...redeemDraft, amount: e.target.value })}
                autoFocus
              />
              {redeemFor && (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-primary hover:underline"
                  onClick={() => setRedeemDraft({ ...redeemDraft, amount: (redeemFor.balance_cents / 100).toFixed(2) })}
                >
                  Use full balance ({formatMoney(redeemFor.balance_cents)})
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="r-notes">Notes</Label>
              <Input id="r-notes" value={redeemDraft.notes}
                onChange={(e) => setRedeemDraft({ ...redeemDraft, notes: e.target.value })}
                placeholder="Optional — e.g. Booking #1234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={redeemBusy} onClick={() => setRedeemFor(null)}>Cancel</Button>
            <Button onClick={handleRedeem} disabled={redeemBusy}>
              {redeemBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete gift card {confirmDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the card and all its redemption history. If you only want to prevent
              further use, disable it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ShareCheckLinkBar() {
  const url = typeof window !== "undefined" ? `${window.location.origin}/gift-card` : "/gift-card";
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silent */
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customer balance check</p>
        <p className="truncate font-mono text-xs text-foreground">{url}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleCopy()}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
