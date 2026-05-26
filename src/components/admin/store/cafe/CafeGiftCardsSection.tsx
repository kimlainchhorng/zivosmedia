/**
 * CafeGiftCardsSection — issue new gift cards, view balance & redemption
 * history, disable / enable cards, manually redeem against a manual amount.
 */
import { useMemo, useState } from "react";
import {
  CreditCard, Plus, Loader2, Copy, MinusCircle, History, Search, ShieldOff, ShieldCheck, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCafeGiftCards, type IssueGiftCardInput, type CafeGiftCard } from "@/hooks/cafe/useCafeGiftCards";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { toast } from "sonner";

interface Props { storeId: string }

export default function CafeGiftCardsSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { cards, redemptionsByCard, loading, saving, issue, redeem, setActive, remove } = useCafeGiftCards(storeId);
  const [issueDialog, setIssueDialog] = useState(false);
  const [draft, setDraft] = useState<IssueGiftCardInput>({ initial_balance_cents: 2500 });
  const [redeemDialog, setRedeemDialog] = useState<{ open: boolean; cardId: string | null }>({ open: false, cardId: null });
  const [redeemAmount, setRedeemAmount] = useState("");
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      c.code.toLowerCase().includes(q) ||
      (c.recipient_name ?? "").toLowerCase().includes(q) ||
      (c.recipient_email ?? "").toLowerCase().includes(q) ||
      (c.recipient_phone ?? "").toLowerCase().includes(q),
    );
  }, [cards, query]);

  const totals = useMemo(() => {
    let outstanding = 0, issued = 0;
    for (const c of cards) {
      if (c.is_active) outstanding += c.balance_cents;
      issued += c.initial_balance_cents;
    }
    return { outstanding, issued, count: cards.length };
  }, [cards]);

  const handleIssue = async () => {
    if (draft.initial_balance_cents <= 0) { toast.error("Amount must be positive."); return; }
    const created = await issue(draft);
    if (created) {
      toast.success(`Issued ${created.code} (${fmt(created.initial_balance_cents)}).`);
      navigator.clipboard?.writeText(created.code).catch(() => {});
      setIssueDialog(false);
      setDraft({ initial_balance_cents: 2500 });
    }
  };

  const handleRedeem = async () => {
    if (!redeemDialog.cardId) return;
    const cents = Math.round(parseFloat(redeemAmount || "0") * 100);
    if (cents <= 0) return;
    const res = await redeem(redeemDialog.cardId, cents);
    if (res.ok) {
      toast.success("Redeemed.");
      setRedeemDialog({ open: false, cardId: null });
      setRedeemAmount("");
    } else {
      toast.error(res.error || "Couldn't redeem.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cards issued</p>
            <p className="text-2xl font-bold tabular-nums">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totals.outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Issued value</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totals.issued)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Gift cards</span>
            <Button size="sm" onClick={() => setIssueDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Issue
            </Button>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code, recipient…" className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {cards.length === 0 ? "No gift cards yet — issue your first card." : "No matches."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((c) => (
                <CardRow
                  key={c.id}
                  card={c}
                  onRedeem={() => { setRedeemAmount(""); setRedeemDialog({ open: true, cardId: c.id }); }}
                  onToggle={() => setActive(c.id, !c.is_active)}
                  onHistory={() => setHistoryId(c.id)}
                  onDelete={() => { if (confirm(`Delete card ${c.code}? Redemption history will be lost.`)) remove(c.id); }}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Issue dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue gift card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={(draft.initial_balance_cents / 100).toString()}
                onChange={(e) => setDraft({ ...draft, initial_balance_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recipient name (optional)</Label>
                <Input value={draft.recipient_name ?? ""} onChange={(e) => setDraft({ ...draft, recipient_name: e.target.value || null })} />
              </div>
              <div>
                <Label>Recipient phone</Label>
                <Input value={draft.recipient_phone ?? ""} onChange={(e) => setDraft({ ...draft, recipient_phone: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea rows={2} value={draft.message ?? ""} onChange={(e) => setDraft({ ...draft, message: e.target.value || null })} />
            </div>
            <div>
              <Label>Expires (optional)</Label>
              <Input type="date" value={draft.expires_at?.slice(0, 10) ?? ""}
                onChange={(e) => setDraft({ ...draft, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIssueDialog(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={saving}>Issue card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem dialog */}
      <Dialog open={redeemDialog.open} onOpenChange={(v) => setRedeemDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual redeem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Amount ($)</Label>
            <Input type="number" step="0.01" min="0" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} placeholder="0.00" />
            <p className="text-xs text-muted-foreground">Redeeming from outside the POS — e.g. legacy ticket or phone order.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRedeemDialog({ open: false, cardId: null })}>Cancel</Button>
            <Button onClick={handleRedeem}>Redeem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyId} onOpenChange={(v) => !v && setHistoryId(null)}>
        <DialogContent>
          {historyId && (() => {
            const card = cards.find((c) => c.id === historyId);
            const rows = redemptionsByCard[historyId] ?? [];
            if (!card) return null;
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {card.code}</DialogTitle></DialogHeader>
                <div className="text-sm text-muted-foreground mb-2">
                  Balance <span className="font-semibold text-foreground">{fmt(card.balance_cents)}</span> / {fmt(card.initial_balance_cents)}
                </div>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No redemptions yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60 max-h-[50vh] overflow-y-auto">
                    {rows.map((r) => (
                      <li key={r.id} className="py-2 flex items-center justify-between text-sm">
                        <span>
                          <span className="tabular-nums">{fmt(r.amount_cents)}</span>
                          {r.notes && <span className="text-muted-foreground ml-2">— {r.notes}</span>}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardRow({ card, onRedeem, onToggle, onHistory, onDelete }: {
  card: CafeGiftCard;
  onRedeem: () => void;
  onToggle: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const handleCopy = () => {
    navigator.clipboard?.writeText(card.code).catch(() => {});
    toast.success("Code copied.");
  };
  return (
    <li className="py-3 flex flex-wrap items-center gap-3">
      <div className="font-mono text-sm font-semibold tracking-wider">{card.code}</div>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <div className="flex-1 min-w-0 text-sm">
        {card.recipient_name && <p className="truncate">{card.recipient_name}</p>}
        <p className="text-[11px] text-muted-foreground">Issued {new Date(card.created_at).toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums">{fmt(card.balance_cents)}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">of {fmt(card.initial_balance_cents)}</p>
      </div>
      <Badge variant={card.is_active ? "secondary" : "outline"} className="text-[10px]">
        {card.is_active ? "Active" : "Disabled"}
      </Badge>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" className="h-8" onClick={onRedeem} disabled={!card.is_active || card.balance_cents === 0}>
          <MinusCircle className="h-3.5 w-3.5 mr-1" /> Redeem
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onHistory} title="History">
          <History className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggle} title={card.is_active ? "Disable" : "Enable"}>
          {card.is_active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
