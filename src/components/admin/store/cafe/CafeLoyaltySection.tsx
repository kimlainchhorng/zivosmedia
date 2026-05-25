/**
 * CafeLoyaltySection — configure the loyalty program + manage customer
 * balances. Two modes: points-per-dollar or stamp-card.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Star, Plus, Loader2, Settings, MinusCircle, PlusCircle, History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeLoyalty, type CafeLoyaltyMode, type CafeLoyaltyProgramDraft } from "@/hooks/cafe/useCafeLoyalty";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const blankProgram = (): CafeLoyaltyProgramDraft => ({
  mode: "points_per_dollar",
  earn_rate_milli: 10,
  redeem_threshold: 100,
  reward_value_cents: 500,
  birthday_bonus_points: 50,
  referral_bonus_points: 25,
  expire_after_days: null,
  is_active: true,
});

export default function CafeLoyaltySection({ storeId }: Props) {
  const { program, balances, eventsByBalance, loading, saving, saveProgram, findOrCreateBalance, earn, redeem, adjust } = useCafeLoyalty(storeId);

  const [editProgram, setEditProgram] = useState(false);
  const [draft, setDraft] = useState<CafeLoyaltyProgramDraft>(blankProgram());

  const [enrollDialog, setEnrollDialog] = useState(false);
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollName, setEnrollName] = useState("");

  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; balanceId: string | null; kind: "earn" | "redeem" | "adjust" }>({ open: false, balanceId: null, kind: "earn" });
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [historyId, setHistoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (program) {
      setDraft({
        mode: program.mode, earn_rate_milli: program.earn_rate_milli,
        redeem_threshold: program.redeem_threshold, reward_value_cents: program.reward_value_cents,
        birthday_bonus_points: program.birthday_bonus_points, referral_bonus_points: program.referral_bonus_points,
        expire_after_days: program.expire_after_days, is_active: program.is_active,
      });
    }
  }, [program]);

  const filteredBalances = useMemo(() => {
    const q = search.trim().toLowerCase();
    return balances.filter((b) => {
      if (!q) return true;
      return (
        (b.display_name ?? "").toLowerCase().includes(q) ||
        (b.phone ?? "").toLowerCase().includes(q) ||
        (b.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [balances, search]);

  const stats = useMemo(() => {
    let totalPoints = 0, totalEarned = 0, totalRedeemed = 0;
    for (const b of balances) {
      totalPoints += b.points;
      totalEarned += b.total_earned;
      totalRedeemed += b.total_redeemed;
    }
    return { members: balances.length, totalPoints, totalEarned, totalRedeemed };
  }, [balances]);

  const submitProgram = async () => {
    await saveProgram(draft);
    toast.success("Saved.");
    setEditProgram(false);
  };

  const submitEnroll = async () => {
    if (!enrollPhone.trim()) { toast.error("Phone required."); return; }
    const created = await findOrCreateBalance({ phone: enrollPhone.trim(), display_name: enrollName.trim() || undefined });
    if (created) {
      toast.success(`Enrolled ${created.display_name || created.phone}.`);
      setEnrollDialog(false);
      setEnrollPhone(""); setEnrollName("");
    }
  };

  const submitAdjust = async () => {
    if (!adjustDialog.balanceId) return;
    const points = parseInt(adjustPoints || "0", 10);
    if (!points) { toast.error("Points required."); return; }
    const fn = adjustDialog.kind === "earn" ? earn : adjustDialog.kind === "redeem" ? redeem : adjust;
    const signed = adjustDialog.kind === "adjust" ? points : Math.abs(points);
    const res = await fn(adjustDialog.balanceId, signed, null, adjustNotes.trim() || undefined);
    if (res.ok) {
      toast.success(`Saved (${adjustDialog.kind}).`);
      setAdjustDialog({ open: false, balanceId: null, kind: "earn" });
      setAdjustPoints(""); setAdjustNotes("");
    } else {
      toast.error(res.error || "Couldn't save.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Members</p>
          <p className="text-2xl font-bold tabular-nums">{stats.members}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Live points</p>
          <p className="text-2xl font-bold tabular-nums">{stats.totalPoints}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total earned</p>
          <p className="text-2xl font-bold tabular-nums">{stats.totalEarned}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total redeemed</p>
          <p className="text-2xl font-bold tabular-nums">{stats.totalRedeemed}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Star className="h-4 w-4" /> Program</span>
            <Button size="sm" variant="outline" onClick={() => setEditProgram(true)}>
              <Settings className="h-4 w-4 mr-1" /> {program ? "Edit" : "Set up"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!program ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No program yet — set it up to start awarding points.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mode</p>
                <p className="font-medium capitalize">{program.mode.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Earn rate</p>
                <p className="font-medium tabular-nums">{program.earn_rate_milli} pts / $1</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reward</p>
                <p className="font-medium tabular-nums">{program.redeem_threshold} pts = {fmt(program.reward_value_cents)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant={program.is_active ? "default" : "secondary"} className="text-[10px]">
                  {program.is_active ? "Active" : "Paused"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
            <span>Members</span>
            <div className="flex items-center gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone…" className="h-8 w-48 text-xs" />
              <Button size="sm" onClick={() => setEnrollDialog(true)} disabled={!program}>
                <Plus className="h-4 w-4 mr-1" /> Enroll
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredBalances.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              {balances.length === 0 ? "No members yet — enroll your first customer." : "No matches."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredBalances.map((b) => (
                <li key={b.id} className="py-2.5 flex flex-wrap items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 font-bold uppercase">
                    {(b.display_name?.[0] ?? b.phone?.[0] ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.display_name || b.phone || "(no name)"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.phone && <span>{b.phone}</span>}
                      {b.last_activity_at && <span> · Last activity {new Date(b.last_activity_at).toLocaleDateString()}</span>}
                    </p>
                  </div>
                  <span className="tabular-nums font-bold text-lg">{b.points}</span>
                  <span className="text-[11px] text-muted-foreground">pts</span>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { setAdjustPoints(""); setAdjustNotes(""); setAdjustDialog({ open: true, balanceId: b.id, kind: "earn" }); }}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Earn
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => { setAdjustPoints(""); setAdjustNotes(""); setAdjustDialog({ open: true, balanceId: b.id, kind: "redeem" }); }} disabled={b.points <= 0}>
                    <MinusCircle className="h-3.5 w-3.5 mr-1" /> Redeem
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="History" onClick={() => setHistoryId(b.id)}>
                    <History className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Program dialog */}
      <Dialog open={editProgram} onOpenChange={setEditProgram}>
        <DialogContent>
          <DialogHeader><DialogTitle>{program ? "Edit program" : "Set up loyalty"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Mode</Label>
              <Select value={draft.mode} onValueChange={(v) => setDraft({ ...draft, mode: v as CafeLoyaltyMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="points_per_dollar">Points per dollar spent</SelectItem>
                  <SelectItem value="stamp_card">Stamp card (1 stamp per visit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {draft.mode === "points_per_dollar" && (
              <div>
                <Label>Points per $1 spent</Label>
                <Input type="number" step="0.1" min="0" value={String(draft.earn_rate_milli)}
                  onChange={(e) => setDraft({ ...draft, earn_rate_milli: Math.max(0, parseFloat(e.target.value || "0")) })} />
                <p className="text-[11px] text-muted-foreground mt-1">e.g. 10 = 1 point per 10¢, 1 = 1 point per dollar.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{draft.mode === "stamp_card" ? "Stamps to reward" : "Points to reward"}</Label>
                <Input type="number" min={1} value={String(draft.redeem_threshold)}
                  onChange={(e) => setDraft({ ...draft, redeem_threshold: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
              </div>
              <div>
                <Label>Reward value ($)</Label>
                <Input type="number" step="0.01" min={0.01} value={(draft.reward_value_cents / 100).toString()}
                  onChange={(e) => setDraft({ ...draft, reward_value_cents: Math.max(1, Math.round(parseFloat(e.target.value || "0") * 100)) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Birthday bonus (pts)</Label>
                <Input type="number" min={0} value={String(draft.birthday_bonus_points)}
                  onChange={(e) => setDraft({ ...draft, birthday_bonus_points: Math.max(0, parseInt(e.target.value || "0", 10)) })} />
              </div>
              <div>
                <Label>Referral bonus (pts)</Label>
                <Input type="number" min={0} value={String(draft.referral_bonus_points)}
                  onChange={(e) => setDraft({ ...draft, referral_bonus_points: Math.max(0, parseInt(e.target.value || "0", 10)) })} />
              </div>
            </div>
            <div>
              <Label>Points expire after (days, blank = never)</Label>
              <Input type="number" min={1} value={draft.expire_after_days ?? ""}
                onChange={(e) => setDraft({ ...draft, expire_after_days: e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10)) })} />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditProgram(false)}>Cancel</Button>
            <Button onClick={submitProgram} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Phone</Label>
              <Input value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} placeholder="012 345 678" />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input value={enrollName} onChange={(e) => setEnrollName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEnrollDialog(false)}>Cancel</Button>
            <Button onClick={submitEnroll} disabled={saving}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust */}
      <Dialog open={adjustDialog.open} onOpenChange={(v) => setAdjustDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{adjustDialog.kind} points</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{adjustDialog.kind === "adjust" ? "Change (− to deduct)" : "Points"}</Label>
              <Input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustDialog({ open: false, balanceId: null, kind: "earn" })}>Cancel</Button>
            <Button onClick={submitAdjust} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Dialog open={!!historyId} onOpenChange={(v) => !v && setHistoryId(null)}>
        <DialogContent>
          {historyId && (() => {
            const b = balances.find((x) => x.id === historyId);
            if (!b) return null;
            const rows = eventsByBalance[historyId] ?? [];
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {b.display_name || b.phone}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Balance: <span className="font-semibold text-foreground tabular-nums">{b.points} pts</span></p>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No events yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60 max-h-[55vh] overflow-y-auto">
                    {rows.map((e) => (
                      <li key={e.id} className="py-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{e.kind}</Badge>
                          {e.notes && <span className="text-muted-foreground truncate">{e.notes}</span>}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          <span className={`tabular-nums font-semibold ${e.points_change < 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {e.points_change > 0 ? "+" : ""}{e.points_change}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(e.created_at).toLocaleString()}</span>
                        </span>
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
