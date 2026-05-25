/**
 * SalonLoyaltySection — points / rewards configuration + per-client balance.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Star, Loader2, AlertCircle, Search, Plus, Minus, Sparkles, Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSalonClients } from "@/hooks/salon/useSalonClients";

interface SalonLoyaltySectionProps { storeId: string; }

interface LoyaltySettings {
  is_enabled: boolean;
  points_per_dollar: number;
  redemption_value_cents_per_point: number;
  welcome_points: number;
  birthday_points: number;
}

const DEFAULT_SETTINGS: LoyaltySettings = {
  is_enabled: false,
  points_per_dollar: 1,
  redemption_value_cents_per_point: 1,
  welcome_points: 0,
  birthday_points: 0,
};

export default function SalonLoyaltySection({ storeId }: SalonLoyaltySectionProps) {
  const { clients, refresh: refreshClients } = useSalonClients(storeId);
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [adjustDialog, setAdjustDialog] = useState<{ clientId: string; clientName: string; currentPoints: number } | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"earn" | "redeem">("earn");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const { data, error: err } = await supabase
        .from("salon_loyalty_settings").select("*").eq("store_id", storeId).maybeSingle();
      if (cancelled) return;
      if (err) { console.error(err); setError("Couldn't load settings."); setLoading(false); return; }
      if (data) {
        const d = data as any;
        setSettings({
          is_enabled: d.is_enabled,
          points_per_dollar: Number(d.points_per_dollar),
          redemption_value_cents_per_point: d.redemption_value_cents_per_point,
          welcome_points: d.welcome_points,
          birthday_points: d.birthday_points,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const saveSettings = async (patch: Partial<LoyaltySettings>) => {
    setSaving(true); setError(null);
    const next = { ...settings, ...patch };
    const payload = { store_id: storeId, ...next };
    const { error: err } = await supabase
      .from("salon_loyalty_settings").upsert(payload as never, { onConflict: "store_id" });
    setSaving(false);
    if (err) { setError("Couldn't save."); return; }
    setSettings(next);
  };

  const openAdjust = (c: typeof clients[number]) => {
    setAdjustDialog({ clientId: c.id, clientName: c.display_name, currentPoints: c.loyalty_points ?? 0 });
    setAdjustDelta("");
    setAdjustReason("");
    setAdjustType("earn");
  };

  const handleAdjust = async () => {
    if (!adjustDialog) return;
    const n = Math.abs(parseInt(adjustDelta, 10) || 0);
    if (n <= 0) { toast.error("Points must be greater than 0."); return; }
    const delta = adjustType === "earn" ? n : -n;
    if (adjustType === "redeem" && n > adjustDialog.currentPoints) {
      toast.error(`Can't redeem more than ${adjustDialog.currentPoints} points.`);
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from("salon_loyalty_events").insert({
      store_id: storeId,
      client_id: adjustDialog.clientId,
      event_type: adjustType,
      points_delta: delta,
      reason: adjustReason.trim() || null,
    } as never);
    setSaving(false);
    if (err) { setError("Couldn't record event."); return; }
    toast.success(`${adjustType === "earn" ? "Added" : "Redeemed"} ${n} points.`);
    setAdjustDialog(null);
    await refreshClients();
  };

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients
      .filter((c) => !search || c.display_name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q))
      .sort((a, b) => (b.loyalty_points ?? 0) - (a.loyalty_points ?? 0));
  }, [clients, search]);

  const redemptionExample = useMemo(() => {
    if (!settings.is_enabled || settings.points_per_dollar === 0) return null;
    const pointsFor100 = Math.round(100 * settings.points_per_dollar);
    const redeemValue = (100 * settings.redemption_value_cents_per_point) / 100;
    return { pointsFor100, redeemValue };
  }, [settings]);

  return (
    <div className="space-y-4">
      {error && <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Star className="h-5 w-5 text-primary" /> Loyalty program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Enable loyalty points</p>
              <p className="text-xs text-muted-foreground">Clients earn points on services and redeem for discounts.</p>
            </div>
            <Switch checked={settings.is_enabled} onCheckedChange={(v) => void saveSettings({ is_enabled: v })} disabled={saving || loading} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ltPpd">Points per $1 spent</Label>
              <Input id="ltPpd" type="number" min={0} max={100} step="0.5" value={settings.points_per_dollar}
                onChange={(e) => void saveSettings({ points_per_dollar: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} disabled={saving || !settings.is_enabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ltRpv">Cents per redeemed point</Label>
              <Input id="ltRpv" type="number" min={0} value={settings.redemption_value_cents_per_point}
                onChange={(e) => void saveSettings({ redemption_value_cents_per_point: Math.max(0, parseInt(e.target.value, 10) || 0) })} disabled={saving || !settings.is_enabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ltWelcome">Welcome bonus</Label>
              <Input id="ltWelcome" type="number" min={0} value={settings.welcome_points}
                onChange={(e) => void saveSettings({ welcome_points: Math.max(0, parseInt(e.target.value, 10) || 0) })} disabled={saving || !settings.is_enabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ltBirthday">Birthday bonus</Label>
              <Input id="ltBirthday" type="number" min={0} value={settings.birthday_points}
                onChange={(e) => void saveSettings({ birthday_points: Math.max(0, parseInt(e.target.value, 10) || 0) })} disabled={saving || !settings.is_enabled} />
            </div>
          </div>

          {redemptionExample && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-sky-700 dark:text-sky-300">
              <Sparkles className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
              A $100 visit earns <b>{redemptionExample.pointsFor100} pts</b>. 100 pts redeems for <b>${redemptionExample.redeemValue.toFixed(2)}</b>.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Client balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a client…" className="pl-9" />
            </div>
          )}
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add clients first to start tracking points.</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filteredClients.slice(0, 50).map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Star className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.display_name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.loyalty_points ?? 0} pts</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => openAdjust(c)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Adjust</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={adjustDialog !== null} onOpenChange={(o) => !o && setAdjustDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{adjustDialog?.clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Current balance: <b className="text-foreground">{adjustDialog?.currentPoints ?? 0} pts</b></p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAdjustType("earn")}
                className={`rounded-lg border p-3 text-sm font-semibold ${adjustType === "earn" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                <Plus className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Add
              </button>
              <button type="button" onClick={() => setAdjustType("redeem")}
                className={`rounded-lg border p-3 text-sm font-semibold ${adjustType === "redeem" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                <Minus className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Redeem
              </button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ltDelta">Points</Label>
              <Input id="ltDelta" type="number" min={1} value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ltReason">Reason (optional)</Label>
              <Input id="ltReason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Bonus for review" maxLength={200} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAdjustDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAdjust} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />}<Save className="h-3.5 w-3.5" /> Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
