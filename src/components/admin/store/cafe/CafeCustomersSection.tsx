/**
 * CafeCustomersSection — list of customers derived from completed orders,
 * sorted by lifetime spend. Has search + a "show only regulars" filter.
 */
import { useMemo, useState } from "react";
import { Users, Search, Loader2, Phone, Mail, Star, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCafeCustomers } from "@/hooks/cafe/useCafeCustomers";
import { useCafeCustomerNotes } from "@/hooks/cafe/useCafeCustomerNotes";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const REGULAR_MIN_ORDERS = 5;

export default function CafeCustomersSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { customers, loading } = useCafeCustomers(storeId);
  const { byPhone: notesByPhone, save: saveNote, saving: savingNote } = useCafeCustomerNotes(storeId);
  const [query, setQuery] = useState("");
  const [regularsOnly, setRegularsOnly] = useState(false);

  // Note editor state — keyed on phone so it works across re-renders.
  const [noteDialog, setNoteDialog] = useState<{ phone: string; displayName: string } | null>(null);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftVip, setNoteDraftVip] = useState(false);

  const openNoteEditor = (phone: string, displayName: string) => {
    const existing = notesByPhone.get(phone);
    setNoteDraftText(existing?.notes ?? "");
    setNoteDraftVip(existing?.is_vip ?? false);
    setNoteDialog({ phone, displayName });
  };

  const handleSaveNote = async () => {
    if (!noteDialog) return;
    const ok = await saveNote(noteDialog.phone, { is_vip: noteDraftVip, notes: noteDraftText });
    if (ok) { toast.success("Saved."); setNoteDialog(null); }
  };

  const toggleVipQuick = async (phone: string, current: boolean) => {
    const ok = await saveNote(phone, { is_vip: !current });
    if (ok) toast.success(!current ? "Marked VIP." : "VIP removed.");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (regularsOnly && c.orders_count < REGULAR_MIN_ORDERS) return false;
      if (!q) return true;
      return (
        c.display_name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query, regularsOnly]);

  const regulars = customers.filter((c) => c.orders_count >= REGULAR_MIN_ORDERS).length;
  const totalLtv = customers.reduce((s, c) => s + c.lifetime_spend_cents, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Customers</p>
            <p className="text-2xl font-bold tabular-nums">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Regulars</p>
            <p className="text-2xl font-bold tabular-nums">{regulars}</p>
            <p className="text-[10px] text-muted-foreground">{REGULAR_MIN_ORDERS}+ orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lifetime value</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalLtv)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Customer book</span>
            <Button size="sm" variant={regularsOnly ? "default" : "outline"} onClick={() => setRegularsOnly((v) => !v)} className="h-8 text-xs gap-1.5">
              <Star className="h-3.5 w-3.5" /> Regulars only
            </Button>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, email…" className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              {customers.length === 0 ? "No completed orders yet — customers will appear here automatically." : "No matches."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((c) => {
                const note = c.phone ? notesByPhone.get(c.phone) : undefined;
                return (
                <li key={c.key} className="py-3 flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 font-bold uppercase">
                    {c.display_name.slice(0, 1) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{c.display_name}</span>
                      {note?.is_vip && (
                        <Badge className="text-[10px] gap-1 bg-violet-500/15 text-violet-700 hover:bg-violet-500/15">
                          <Star className="h-3 w-3 fill-current" /> VIP
                        </Badge>
                      )}
                      {c.orders_count >= REGULAR_MIN_ORDERS && (
                        <Badge className={cn("text-[10px] gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15")}>
                          <Star className="h-3 w-3" /> Regular
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                      {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                      <span>Last visit {new Date(c.last_seen).toLocaleDateString()}</span>
                    </div>
                    {c.favourite_items.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        Loves: {c.favourite_items.map((f) => `${f.name} (${f.count}×)`).join(" · ")}
                      </p>
                    )}
                    {note?.notes && (
                      <p className="text-[11px] mt-1 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20 text-amber-900 dark:text-amber-100 truncate">
                        📝 {note.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="font-semibold tabular-nums">{fmt(c.lifetime_spend_cents)}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{c.orders_count} order{c.orders_count === 1 ? "" : "s"}</p>
                    {c.phone && (
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title={note?.is_vip ? "Remove VIP" : "Mark VIP"}
                          disabled={savingNote}
                          onClick={() => void toggleVipQuick(c.phone!, note?.is_vip ?? false)}
                        >
                          <Star className={cn("h-3.5 w-3.5", note?.is_vip ? "fill-violet-500 text-violet-500" : "text-muted-foreground")} />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7"
                          title="Edit note"
                          onClick={() => openNoteEditor(c.phone!, c.display_name)}
                        >
                          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!noteDialog} onOpenChange={(v) => { if (!v) setNoteDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteDialog?.displayName ?? "Customer"} · note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Note keyed to <span className="font-mono">{noteDialog?.phone}</span>.
              Only staff see this — never shown to the customer.
            </p>
            <div className="flex items-center justify-between">
              <Label htmlFor="vip-switch" className="text-sm cursor-pointer">Mark as VIP</Label>
              <Switch id="vip-switch" checked={noteDraftVip} onCheckedChange={setNoteDraftVip} disabled={savingNote} />
            </div>
            <Textarea
              rows={4}
              value={noteDraftText}
              onChange={(e) => setNoteDraftText(e.target.value)}
              placeholder="e.g. Always oat milk, no foam. Allergic to nuts."
              disabled={savingNote}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteDialog(null)} disabled={savingNote}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={savingNote}>
              {savingNote && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
