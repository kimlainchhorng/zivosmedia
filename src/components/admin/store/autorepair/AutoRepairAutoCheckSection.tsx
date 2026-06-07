/**
 * Auto Repair — Auto Check (VIN decoder + NHTSA recalls + persisted history)
 * Uses vin-decode edge function; saves lookups to ar_vin_lookups.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import Search from "lucide-react/dist/esm/icons/search";
import Car from "lucide-react/dist/esm/icons/car";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Shield from "lucide-react/dist/esm/icons/shield";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import History from "lucide-react/dist/esm/icons/history";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import Mail from "lucide-react/dist/esm/icons/mail";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import { toast } from "sonner";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";

interface VinResult {
  vin: string;
  make?: string; model?: string; year?: string; bodyClass?: string;
  engine?: string; fuel?: string; manufacturer?: string; plant?: string;
  driveType?: string; transmission?: string;
}

interface Recall {
  NHTSACampaignNumber?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
}

interface Props { storeId: string }

export default function AutoRepairAutoCheckSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VinResult | null>(null);
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [recallLoading, setRecallLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ owner_name: "", owner_phone: "", owner_email: "", plate: "", mileage: "", notes: "" });
  const [saving, setSaving] = useState(false);
  // If a vehicle with this VIN already exists for the store, the dialog flips
  // to update-mode: form is prefilled from the existing row, the Save button
  // becomes "Update Existing", and the user can opt out with "Create new anyway".
  const [existingMatch, setExistingMatch] = useState<{ id: string; owner_name: string; owner_phone: string | null; owner_email: string | null; plate: string | null; mileage: number | null; notes: string | null } | null>(null);
  const [forceCreateNew, setForceCreateNew] = useState(false);
  // Customer-of-record for the currently-decoded VIN (if it's in the garage).
  // Drives the "Notify customer about recalls" buttons in the recall card.
  const [vehicleOwner, setVehicleOwner] = useState<{ owner_name: string; owner_phone: string | null; owner_email: string | null } | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ["ar-vin-lookups", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_vin_lookups")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; vin: string; decoded: any; created_at: string }>;
    },
  });

  useEffect(() => {
    if (!result && history.length > 0) {
      setResult({ vin: history[0].vin, ...(history[0].decoded as object) });
    }
  }, [history, result]);

  // When the displayed result changes, look up the customer-of-record for this
  // VIN. Lets the Recalls section offer a one-click "Notify customer" action.
  useEffect(() => {
    let cancelled = false;
    setVehicleOwner(null);
    if (!result?.vin) return;
    (async () => {
      const { data } = await supabase
        .from("ar_customer_vehicles")
        .select("owner_name, owner_phone, owner_email")
        .eq("store_id", storeId)
        .eq("vin", result.vin)
        .maybeSingle();
      if (!cancelled && data) setVehicleOwner(data as any);
    })();
    return () => { cancelled = true; };
  }, [result?.vin, storeId]);

  const fetchRecalls = async (make: string, model?: string, year?: string) => {
    setRecallLoading(true);
    setRecalls([]);
    try {
      // NHTSA accepts model + modelYear to scope the search; passing only make
      // returns noisy fleet-wide recalls. All three together gives the most
      // accurate per-vehicle list.
      const params = new URLSearchParams({
        make,
        model: model ?? "",
        modelYear: year ?? "",
      });
      const res = await fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setRecalls((json.results ?? []).slice(0, 10));
    } catch {
      // NHTSA recall lookup is best-effort
    } finally {
      setRecallLoading(false);
    }
  };

  const decode = async () => {
    const v = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (v.length !== 17) { toast.error("VIN must be 17 characters (no I, O, Q)"); return; }
    setLoading(true);
    setRecalls([]);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: v } });
      if (error) throw new Error(error.message || "Function call failed");
      if (!data?.ok) throw new Error(data?.error || "No vehicle data found");

      const decoded: VinResult = {
        vin: data.vin || v,
        make: data.make, model: data.model, year: data.year,
        bodyClass: data.bodyClass, engine: data.engine, fuel: data.fuel,
        manufacturer: data.manufacturer, plant: data.plant,
        driveType: data.driveType, transmission: data.transmission,
      };
      setResult(decoded);

      if (data.make) fetchRecalls(data.make, data.model, data.year);

      const { error: insertErr } = await supabase.from("ar_vin_lookups").insert({
        store_id: storeId,
        vin: v,
        decoded: { ...decoded, vin: undefined } as any,
      });
      if (insertErr) console.warn("Could not save VIN history:", insertErr.message);
      qc.invalidateQueries({ queryKey: ["ar-vin-lookups", storeId] });

      toast.success(data.partial ? "VIN decoded (partial)" : "VIN decoded successfully");
    } catch (e: any) {
      toast.error(`Failed to decode VIN: ${e?.message || "network error"}`);
    } finally { setLoading(false); }
  };

  const deleteHistory = async (id: string) => {
    await supabase.from("ar_vin_lookups").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ar-vin-lookups", storeId] });
    if (result?.vin === history.find(h => h.id === id)?.vin) setResult(null);
    toast.success("Lookup removed");
  };

  // Open the Save dialog and check for an existing vehicle with this VIN to
  // avoid duplicate rows in the customer garage.
  const openSaveDialog = async () => {
    if (!result) return;
    setForceCreateNew(false);
    setExistingMatch(null);
    setSaveForm({ owner_name: "", owner_phone: "", owner_email: "", plate: "", mileage: "", notes: "" });
    setSaveOpen(true);
    if (!result.vin) return;
    const { data, error } = await supabase
      .from("ar_customer_vehicles")
      .select("id, owner_name, owner_phone, owner_email, plate, mileage, notes")
      .eq("store_id", storeId)
      .eq("vin", result.vin)
      .maybeSingle();
    if (!error && data) {
      setExistingMatch(data as any);
      // Prefill form from the existing row so update-mode is one-click.
      setSaveForm({
        owner_name: data.owner_name ?? "",
        owner_phone: (data as any).owner_phone ?? "",
        owner_email: (data as any).owner_email ?? "",
        plate: data.plate ?? "",
        mileage: data.mileage != null ? String(data.mileage) : "",
        notes: data.notes ?? "",
      });
    }
  };

  const saveToVehicles = async () => {
    if (!result) return;
    if (!saveForm.owner_name.trim()) { toast.error("Owner name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        store_id: storeId,
        owner_name: saveForm.owner_name.trim(),
        owner_phone: saveForm.owner_phone.trim() || null,
        owner_email: saveForm.owner_email.trim() || null,
        make: result.make ?? "Unknown",
        model: result.model ?? "Unknown",
        year: result.year ? parseInt(result.year, 10) : null,
        vin: result.vin,
        plate: saveForm.plate.trim() || null,
        mileage: saveForm.mileage ? parseInt(saveForm.mileage, 10) : null,
        notes: saveForm.notes.trim() || null,
      };
      const updateExisting = existingMatch && !forceCreateNew;
      if (updateExisting) {
        const { error } = await supabase
          .from("ar_customer_vehicles")
          .update(payload)
          .eq("id", existingMatch!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_customer_vehicles").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["ar-customer-vehicles", storeId] });
      toast.success(updateExisting ? "Vehicle updated" : "Vehicle saved to garage");
      setSaveOpen(false);
      setSaveForm({ owner_name: "", owner_phone: "", owner_email: "", plate: "", mileage: "", notes: "" });
      setExistingMatch(null);
      setForceCreateNew(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  // Compose a customer-facing recall summary suitable for email body / SMS text.
  const buildRecallMessage = () => {
    const signOff = typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname)
      ? "Your business"
      : "Your shop";
    const ownerFirstName = (vehicleOwner?.owner_name ?? "").trim().split(/\s+/)[0] || "there";
    const vehicle = [result?.year, result?.make, result?.model].filter(Boolean).join(" ") || "your vehicle";
    const lines = [
      `Hi ${ownerFirstName},`,
      ``,
      `Our routine recall check on ${vehicle} (VIN ${result?.vin ?? ""}) turned up ${recalls.length} active NHTSA recall${recalls.length !== 1 ? "s" : ""}:`,
      ...recalls.slice(0, 5).map((r, i) => `${i + 1}. ${r.Component || "General"}${r.NHTSACampaignNumber ? ` (campaign ${r.NHTSACampaignNumber})` : ""}`),
      ``,
      `These are typically repaired free of charge by a franchised dealer. Reply or call us to discuss next steps.`,
      ``,
      `— ${signOff}`,
    ];
    return lines.join("\n");
  };

  const notifyRecallsByEmail = () => {
    if (!vehicleOwner?.owner_email) { toast.error("No email on file for this vehicle's owner"); return; }
    const subject = encodeURIComponent(`Recall notice for your ${[result?.year, result?.make, result?.model].filter(Boolean).join(" ") || "vehicle"}`);
    const body = encodeURIComponent(buildRecallMessage());
    window.open(`mailto:${vehicleOwner.owner_email}?subject=${subject}&body=${body}`);
  };

  const notifyRecallsBySms = () => {
    if (!vehicleOwner?.owner_phone) { toast.error("No phone on file for this vehicle's owner"); return; }
    const body = encodeURIComponent(buildRecallMessage().slice(0, 480));
    const tel = vehicleOwner.owner_phone.replace(/[^\d+]/g, "");
    window.open(`sms:${tel}?&body=${body}`);
  };

  const loadHistory = (h: typeof history[0]) => {
    setResult({ vin: h.vin, ...(h.decoded as object) });
    setVin(h.vin);
    setRecalls([]);
    if (h.decoded?.make) fetchRecalls(h.decoded.make, h.decoded.model, h.decoded.year);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> VIN Auto Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Enter 17-character VIN" value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17}
              className="font-mono uppercase" onKeyDown={e => e.key === "Enter" && decode()} />
            <Button onClick={decode} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Decode
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Powered by NHTSA · Decodes Year, Make, Model, Engine, Drive, Transmission & more.</p>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                {[result.year, result.make, result.model].filter(Boolean).join(" ") || "Vehicle"}
                <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openSaveDialog}>
                <Plus className="w-3.5 h-3.5" /> Save to Vehicles
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Info label="VIN" value={result.vin} mono />
              <Info label="Body" value={result.bodyClass} />
              <Info label="Engine" value={result.engine} />
              <Info label="Fuel" value={result.fuel} />
              <Info label="Drive" value={result.driveType} />
              <Info label="Transmission" value={result.transmission} />
              <Info label="Manufacturer" value={result.manufacturer} />
              <Info label="Plant" value={result.plant} />
            </div>

            {/* NHTSA Recalls */}
            {recallLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking NHTSA recalls…
              </div>
            )}
            {!recallLoading && recalls.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 flex items-center gap-1.5">
                    <TriangleAlert className="w-3.5 h-3.5" /> {recalls.length} Active Recall{recalls.length !== 1 ? "s" : ""} Found
                  </p>
                  {vehicleOwner && (vehicleOwner.owner_email || vehicleOwner.owner_phone) && (
                    <div className="flex gap-1.5">
                      {vehicleOwner.owner_email && (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                          onClick={notifyRecallsByEmail}
                          title={`Email recall details to ${vehicleOwner.owner_email}`}>
                          <Mail className="w-3 h-3" /> Email customer
                        </Button>
                      )}
                      {vehicleOwner.owner_phone && (
                        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                          onClick={notifyRecallsBySms}
                          title={`SMS recall details to ${vehicleOwner.owner_phone}`}>
                          <MessageSquare className="w-3 h-3" /> SMS customer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {vehicleOwner && (
                  <p className="text-[11px] text-muted-foreground">
                    Customer on file: <strong>{vehicleOwner.owner_name}</strong>
                  </p>
                )}
                {recalls.slice(0, 3).map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 text-xs space-y-1">
                    <p className="font-medium">{r.Component || "General"}</p>
                    {r.NHTSACampaignNumber && <p className="text-muted-foreground">Campaign: {r.NHTSACampaignNumber}</p>}
                    {r.Summary && <p className="text-muted-foreground line-clamp-2">{r.Summary}</p>}
                    {r.Remedy && <p className="text-emerald-700"><b>Remedy:</b> {r.Remedy}</p>}
                  </div>
                ))}
                {recalls.length > 3 && <p className="text-xs text-muted-foreground">+{recalls.length - 3} more recalls — check NHTSA.gov for full list.</p>}
              </div>
            )}
            {!recallLoading && recalls.length === 0 && result.make && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> No active NHTSA recalls found for this make.
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Title, accident, and odometer history require a paid CARFAX/AutoCheck integration. Contact ZIVO Partner Support to enable.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Recent Lookups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between group">
                <button type="button" onClick={() => loadHistory(h)}
                  className="flex-1 text-left flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 min-w-0">
                  <span className="font-mono text-xs truncate">{h.vin}</span>
                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <span className="text-xs text-muted-foreground">
                      {[h.decoded?.year, h.decoded?.make, h.decoded?.model].filter(Boolean).join(" ") || "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{timeAgo(h.created_at)}</span>
                  </div>
                </button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => deleteHistory(h.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save to Vehicles dialog */}
      <Dialog open={saveOpen} onOpenChange={(o) => { setSaveOpen(o); if (!o) { setExistingMatch(null); setForceCreateNew(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {existingMatch && !forceCreateNew ? "Update Existing Vehicle" : "Save to Vehicle Garage"}
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="p-3 rounded-lg bg-muted/40 text-sm mb-2">
              <p className="font-medium">{[result.year, result.make, result.model].filter(Boolean).join(" ")}</p>
              <p className="text-xs text-muted-foreground font-mono">{result.vin}</p>
            </div>
          )}
          {existingMatch && !forceCreateNew && (
            <div className="p-3 rounded-lg border border-blue-500/40 bg-blue-500/5 text-xs space-y-2 mb-2">
              <p className="text-blue-700">
                This VIN is already in your garage as <strong>{existingMatch.owner_name || "an unnamed owner"}</strong>.
                Saving will update that record. Changes won't create a duplicate.
              </p>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setForceCreateNew(true); setSaveForm({ owner_name: "", owner_phone: "", owner_email: "", plate: "", mileage: "", notes: "" }); }}>
                Create new record anyway
              </Button>
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Owner name *</Label>
              <Input placeholder="Customer full name" value={saveForm.owner_name}
                onChange={e => setSaveForm(f => ({ ...f, owner_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input type="tel" placeholder="(555) 123-4567" value={saveForm.owner_phone}
                  onChange={e => setSaveForm(f => ({ ...f, owner_phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="customer@example.com" value={saveForm.owner_email}
                  onChange={e => setSaveForm(f => ({ ...f, owner_email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">License plate</Label>
                <Input placeholder="ABC-1234" value={saveForm.plate}
                  onChange={e => setSaveForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mileage</Label>
                <Input placeholder="52000" inputMode="numeric" value={saveForm.mileage}
                  onChange={e => setSaveForm(f => ({ ...f, mileage: e.target.value.replace(/\D/g, "") }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="Any extra notes…" value={saveForm.notes}
                onChange={e => setSaveForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={saveToVehicles} disabled={saving}>
              {saving
                ? "Saving…"
                : existingMatch && !forceCreateNew
                  ? "Update Existing"
                  : "Save Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : "font-medium"}`}>{value || "—"}</p>
    </div>
  );
}
