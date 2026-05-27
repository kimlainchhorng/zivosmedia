/**
 * Auto Repair — Technicians & Bays
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { HardHat, Plus, Trash2, Pencil, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }

const blankTech = { name: "", email: "", phone: "", hourly_rate_cents: 0, certifications_str: "", specialties_str: "" };
const blankBay = { name: "", lift_type: "" };

export default function AutoRepairTechniciansSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [techDlg, setTechDlg] = useState(false);
  const [editTechId, setEditTechId] = useState<string | null>(null);
  const [bayDlg, setBayDlg] = useState(false);
  const [techForm, setTechForm] = useState(blankTech);
  const [bayForm, setBayForm] = useState(blankBay);

  const { data: techs = [] } = useQuery({
    queryKey: ["ar-technicians", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_technicians" as any).select("*").eq("store_id", storeId).order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: bays = [] } = useQuery({
    queryKey: ["ar-bays", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_bays" as any).select("*").eq("store_id", storeId).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const saveTech = useMutation({
    mutationFn: async () => {
      if (!techForm.name.trim()) throw new Error("Name is required");
      const certifications = techForm.certifications_str
        ? techForm.certifications_str.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      const specialties = techForm.specialties_str
        ? techForm.specialties_str.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      const payload = {
        store_id: storeId,
        name: techForm.name.trim(),
        email: techForm.email.trim() || null,
        phone: techForm.phone.trim() || null,
        hourly_rate_cents: techForm.hourly_rate_cents,
        certifications,
        specialties,
      };
      if (editTechId) {
        const { error } = await supabase.from("ar_technicians" as any).update(payload).eq("id", editTechId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_technicians" as any).insert({ ...payload, active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editTechId ? "Technician updated" : "Technician added");
      qc.invalidateQueries({ queryKey: ["ar-technicians", storeId] });
      setTechDlg(false); setEditTechId(null); setTechForm(blankTech);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggleTech = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ar_technicians" as any).update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-technicians", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const delTech = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_technicians" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Technician removed");
      qc.invalidateQueries({ queryKey: ["ar-technicians", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createBay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ar_bays" as any).insert({ store_id: storeId, ...bayForm });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bay added");
      qc.invalidateQueries({ queryKey: ["ar-bays", storeId] });
      setBayDlg(false); setBayForm(blankBay);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const delBay = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_bays" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-bays", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const openEditTech = (t: any) => {
    setEditTechId(t.id);
    setTechForm({
      name: t.name ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      hourly_rate_cents: t.hourly_rate_cents ?? 0,
      certifications_str: (t.certifications ?? []).join(", "),
      specialties_str: (t.specialties ?? []).join(", "),
    });
    setTechDlg(true);
  };

  const openNewTech = () => { setEditTechId(null); setTechForm(blankTech); setTechDlg(true); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="w-4 h-4" /> Technicians & Bays
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="techs">
        <TabsList>
          <TabsTrigger value="techs">Technicians ({techs.length})</TabsTrigger>
          <TabsTrigger value="bays">Bays ({bays.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="techs" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={openNewTech}>
              <Plus className="w-3.5 h-3.5" /> Add Technician
            </Button>
          </div>
          {techs.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No technicians yet.</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {techs.map((t: any) => (
                <Card key={t.id} className={!t.active ? "opacity-60" : ""}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold">{t.name}</p>
                        {!t.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                        {t.hourly_rate_cents > 0 && (
                          <Badge variant="secondary" className="text-[10px]">${(t.hourly_rate_cents / 100).toFixed(0)}/h</Badge>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        {t.email && <a href={`mailto:${t.email}`} className="flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" />{t.email}</a>}
                        {t.phone && <a href={`tel:${t.phone}`} className="flex items-center gap-1 hover:underline"><Phone className="w-3 h-3" />{t.phone}</a>}
                      </div>
                      {t.certifications?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {t.certifications.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                        </div>
                      )}
                      {t.specialties?.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t.specialties.join(" · ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={!!t.active} onCheckedChange={(v) => toggleTech.mutate({ id: t.id, active: v })} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditTech(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => { if (confirm(`Remove ${t.name}?`)) delTech.mutate(t.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bays" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setBayDlg(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Bay
            </Button>
          </div>
          {bays.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No bays configured yet.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {bays.map((b: any) => (
                <Card key={b.id}>
                  <CardContent className="p-3 text-center space-y-1">
                    <p className="font-semibold">{b.name}</p>
                    {b.lift_type && <p className="text-[11px] text-muted-foreground">{b.lift_type}</p>}
                    <Button size="sm" variant="ghost" className="text-destructive h-7"
                      onClick={() => { if (confirm(`Remove ${b.name}?`)) delBay.mutate(b.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Tech dialog — shared for add & edit */}
      <Dialog open={techDlg} onOpenChange={(v) => { setTechDlg(v); if (!v) { setEditTechId(null); setTechForm(blankTech); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTechId ? "Edit Technician" : "Add Technician"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Full name *</Label>
              <Input placeholder="e.g. Marcus Rivera" value={techForm.name}
                onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="Email" value={techForm.email}
                  onChange={(e) => setTechForm({ ...techForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input type="tel" placeholder="Phone" value={techForm.phone}
                  onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hourly rate (USD)</Label>
              <Input type="number" min="0" placeholder="e.g. 35" value={(techForm.hourly_rate_cents / 100) || ""}
                onChange={(e) => setTechForm({ ...techForm, hourly_rate_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Certifications (comma-separated)</Label>
              <Input placeholder="e.g. ASE A1, ASE A4, Hybrid" value={techForm.certifications_str}
                onChange={(e) => setTechForm({ ...techForm, certifications_str: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Specialties (comma-separated)</Label>
              <Input placeholder="e.g. Brakes, Engine, Diagnostics" value={techForm.specialties_str}
                onChange={(e) => setTechForm({ ...techForm, specialties_str: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTechDlg(false)}>Cancel</Button>
            <Button disabled={!techForm.name.trim() || saveTech.isPending} onClick={() => saveTech.mutate()}>
              {saveTech.isPending ? "Saving..." : editTechId ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bayDlg} onOpenChange={setBayDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Bay</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Bay name (e.g. Bay 1)" value={bayForm.name}
              onChange={(e) => setBayForm({ ...bayForm, name: e.target.value })} />
            <Input placeholder="Lift type (2-post, 4-post, alignment, floor jack…)" value={bayForm.lift_type}
              onChange={(e) => setBayForm({ ...bayForm, lift_type: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBayDlg(false)}>Cancel</Button>
            <Button disabled={!bayForm.name} onClick={() => createBay.mutate()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
