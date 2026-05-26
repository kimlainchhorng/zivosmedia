/**
 * Auto Repair — Service Reminders & Recalls
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BellRing, Plus, Search, ShieldAlert, CheckCircle2, Trash2, Clock, Car } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }

const REMINDER_TYPES = [
  "Oil change", "Tire rotation", "Brake inspection", "Air filter", "Cabin filter",
  "Transmission service", "Coolant flush", "Spark plugs", "Battery check",
  "Wheel alignment", "Timing belt", "30k service", "60k service", "90k service", "Other",
];

export default function AutoRepairRemindersSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [recallLoading, setRecallLoading] = useState(false);
  const [form, setForm] = useState({
    reminder_type: "Oil change",
    channel: "email",
    message: "",
    due_at: "",
    due_mileage: "",
    customer_name: "",
    customer_phone: "",
    vehicle_label: "",
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["ar-reminders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_service_reminders" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: recalls = [] } = useQuery({
    queryKey: ["ar-recalls", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_recall_checks" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("fetched_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const upcoming = reminders.filter((r: any) => r.status !== "sent" && r.status !== "dismissed");
  const sent = reminders.filter((r: any) => r.status === "sent" || r.status === "dismissed");

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        store_id: storeId,
        reminder_type: form.reminder_type,
        channel: form.channel,
        message: form.message || null,
        status: "scheduled",
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        vehicle_label: form.vehicle_label || null,
        due_mileage: form.due_mileage ? parseInt(form.due_mileage, 10) : null,
      };
      if (form.due_at) payload.due_at = form.due_at;
      const { error } = await supabase.from("ar_service_reminders" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder scheduled");
      qc.invalidateQueries({ queryKey: ["ar-reminders", storeId] });
      setOpen(false);
      setForm({ reminder_type: "Oil change", channel: "email", message: "", due_at: "", due_mileage: "", customer_name: "", customer_phone: "", vehicle_label: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const markSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_service_reminders" as any)
        .update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as sent");
      qc.invalidateQueries({ queryKey: ["ar-reminders", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_service_reminders" as any)
        .update({ status: "dismissed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-reminders", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_service_reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder deleted");
      qc.invalidateQueries({ queryKey: ["ar-reminders", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRecall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_recall_checks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-recalls", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const lookupRecall = async () => {
    if (!vin || vin.length < 11) { toast.error("Enter a valid VIN (at least 11 characters)"); return; }
    setRecallLoading(true);
    try {
      const decode = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`).then(r => r.json());
      const rec = decode?.Results?.[0] || {};
      const make = rec.Make, model = rec.Model, year = rec.ModelYear;
      let summary = "No recalls found.";
      let severity = "none";
      let campaignId: string | null = null;
      if (make && model && year) {
        const r = await fetch(`https://api.nhtsa.gov/recalls/recallsByVehicle?make=${make}&model=${model}&modelYear=${year}`).then(r => r.json());
        const items = r?.results || [];
        if (items.length > 0) {
          summary = `${items.length} recall(s): ${items.slice(0, 2).map((i: any) => i.Component).join("; ")}`;
          severity = "high";
          campaignId = items[0]?.NHTSACampaignNumber ?? null;
        }
      }
      const { error } = await supabase.from("ar_recall_checks" as any).insert({
        store_id: storeId, vin, summary, severity, campaign_id: campaignId,
      });
      if (error) throw error;
      toast.success("Recall check saved");
      qc.invalidateQueries({ queryKey: ["ar-recalls", storeId] });
      setVin("");
    } catch (e: any) {
      toast.error(e.message ?? "Lookup failed");
    } finally {
      setRecallLoading(false);
    }
  };

  const isOverdue = (r: any) => r.due_at && new Date(r.due_at) < new Date() && r.status === "scheduled";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4" /> Reminders & Recalls</CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders">Reminders ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="recalls">Recalls ({recalls.length})</TabsTrigger>
          {sent.length > 0 && <TabsTrigger value="history">History ({sent.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="reminders" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Schedule Reminder
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No active reminders.</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {upcoming.map((r: any) => (
                <Card key={r.id} className={isOverdue(r) ? "border-orange-500/50 bg-orange-500/5" : ""}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm">{r.reminder_type}</p>
                        {isOverdue(r) && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        <Badge variant="outline" className="text-[10px] capitalize">{r.channel}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {r.customer_name && <span>{r.customer_name}</span>}
                        {r.vehicle_label && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{r.vehicle_label}</span>}
                        {r.due_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.due_at).toLocaleDateString()}</span>}
                        {r.due_mileage && <span>{r.due_mileage.toLocaleString()} mi</span>}
                      </div>
                      {r.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.message}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        onClick={() => markSent.mutate(r.id)}>
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => deleteReminder.mutate(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recalls" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> NHTSA Recall Lookup by VIN
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Enter VIN (17 chars)" className="pl-9 font-mono uppercase" maxLength={17}
                    value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && lookupRecall()} />
                </div>
                <Button onClick={lookupRecall} disabled={recallLoading || vin.length < 11}>
                  {recallLoading ? "Checking…" : "Check"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {recalls.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No recall checks yet.</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {recalls.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{r.vin}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.summary}</p>
                      {r.campaign_id && <p className="text-[10px] text-muted-foreground">Campaign: {r.campaign_id}</p>}
                      {r.fetched_at && <p className="text-[10px] text-muted-foreground">{new Date(r.fetched_at).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={r.severity === "high" ? "destructive" : "outline"}>{r.severity ?? "—"}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => deleteRecall.mutate(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {sent.length > 0 && (
          <TabsContent value="history" className="space-y-2">
            {sent.map((r: any) => (
              <Card key={r.id} className="opacity-70">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.reminder_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.customer_name ?? ""}{r.vehicle_label ? ` · ${r.vehicle_label}` : ""}
                      {r.sent_at ? ` · Sent ${new Date(r.sent_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => deleteReminder.mutate(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Service Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Reminder type</Label>
              <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Customer name</Label>
                <Input placeholder="Full name" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input type="tel" placeholder="Phone" value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle</Label>
              <Input placeholder="e.g. 2019 Honda Civic" value={form.vehicle_label}
                onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Due date</Label>
                <Input type="datetime-local" value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due mileage</Label>
                <Input type="number" placeholder="e.g. 55000" value={form.due_mileage}
                  onChange={(e) => setForm({ ...form, due_mileage: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Send via</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="inapp">In-app</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message (optional)</Label>
              <Textarea placeholder="Custom message to customer…" value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
