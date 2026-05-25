/**
 * CafeModifiersSection — manage modifier groups (Size, Milk, Extras) and the
 * options inside each group.
 */
import { useState } from "react";
import { Layers, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeMenu, type CafeModifierGroupDraft, type CafeModifierDraft } from "@/hooks/cafe/useCafeMenu";
import { toast } from "sonner";

interface Props { storeId: string }

const fmtDelta = (cents: number) => {
  if (cents === 0) return "—";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
};

const blankGroup = (): CafeModifierGroupDraft => ({
  name: "", description: null, selection_type: "single",
  min_select: 0, max_select: 1, is_active: true,
});
const blankMod = (): CafeModifierDraft => ({
  group_id: "", name: "", price_delta_cents: 0,
  is_default: false, is_active: true,
});

export default function CafeModifiersSection({ storeId }: Props) {
  const menu = useCafeMenu(storeId);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupDraft, setGroupDraft] = useState<CafeModifierGroupDraft>(blankGroup());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [modDialog, setModDialog] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null });
  const [modDraft, setModDraft] = useState<CafeModifierDraft>(blankMod());

  const handleSaveGroup = async () => {
    if (!groupDraft.name.trim()) { toast.error("Group needs a name."); return; }
    if (groupDraft.min_select > groupDraft.max_select) { toast.error("Min selects can't exceed max."); return; }
    if (editingGroupId) {
      await menu.updateGroup(editingGroupId, groupDraft);
      toast.success("Updated.");
    } else {
      const created = await menu.createGroup(groupDraft);
      if (created) toast.success(`Added "${created.name}".`);
    }
    setGroupDialog(false);
    setGroupDraft(blankGroup());
    setEditingGroupId(null);
  };

  const handleSaveMod = async () => {
    if (!modDraft.name.trim() || !modDialog.groupId) return;
    const created = await menu.createModifier(modDialog.groupId, { ...modDraft, group_id: modDialog.groupId });
    if (created) toast.success(`Added "${created.name}".`);
    setModDialog({ open: false, groupId: null });
    setModDraft(blankMod());
  };

  if (menu.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Modifier groups</span>
            <Button size="sm" onClick={() => { setEditingGroupId(null); setGroupDraft(blankGroup()); setGroupDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Group
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {menu.groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No modifier groups yet. Create one like <em>Size</em>, <em>Milk</em>, or <em>Extras</em>.
            </div>
          ) : (
            menu.groups.map((g) => {
              const groupMods = menu.modifiers.filter((m) => m.group_id === g.id);
              return (
                <div key={g.id} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between p-3 border-b border-border/60">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{g.name}</span>
                        <Badge variant="secondary" className="text-[10px] uppercase">{g.selection_type}</Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {g.min_select === 0 && g.max_select === 1 ? "optional" : `pick ${g.min_select}–${g.max_select}`}
                        </span>
                      </div>
                      {g.description && <p className="text-[12px] text-muted-foreground">{g.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={g.is_active} onCheckedChange={(v) => menu.updateGroup(g.id, { is_active: v })} />
                      <Button size="sm" variant="ghost" onClick={() => { setEditingGroupId(g.id); setGroupDraft({ name: g.name, description: g.description, selection_type: g.selection_type, min_select: g.min_select, max_select: g.max_select, is_active: g.is_active }); setGroupDialog(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete group "${g.name}"?`)) menu.removeGroup(g.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    {groupMods.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-2">No options yet.</p>
                    ) : (
                      <ul className="divide-y divide-border/40 mb-2">
                        {groupMods.map((m) => (
                          <li key={m.id} className="flex items-center justify-between py-1.5">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="truncate">{m.name}</span>
                              {m.is_default && <Badge variant="outline" className="text-[10px]">default</Badge>}
                              {!m.is_active && <Badge variant="secondary" className="text-[10px]">off</Badge>}
                            </span>
                            <span className="flex items-center gap-3 shrink-0">
                              <span className="tabular-nums text-sm text-muted-foreground">{fmtDelta(m.price_delta_cents)}</span>
                              <Switch checked={m.is_active} onCheckedChange={(v) => menu.updateModifier(m.id, { is_active: v })} />
                              <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => { if (confirm(`Delete "${m.name}"?`)) menu.removeModifier(m.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setModDraft(blankMod()); setModDialog({ open: true, groupId: g.id }); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Option
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroupId ? "Edit group" : "New group"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label>
              <Input value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} placeholder="Size" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={groupDraft.selection_type} onValueChange={(v) => setGroupDraft({ ...groupDraft, selection_type: v as "single" | "multi" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="multi">Multi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min picks</Label>
                <Input type="number" min={0} value={String(groupDraft.min_select)}
                  onChange={(e) => setGroupDraft({ ...groupDraft, min_select: Math.max(0, parseInt(e.target.value || "0", 10)) })} />
              </div>
              <div>
                <Label>Max picks</Label>
                <Input type="number" min={1} max={20} value={String(groupDraft.max_select)}
                  onChange={(e) => setGroupDraft({ ...groupDraft, max_select: Math.max(1, Math.min(20, parseInt(e.target.value || "1", 10))) })} />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={groupDraft.is_active} onCheckedChange={(v) => setGroupDraft({ ...groupDraft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveGroup} disabled={menu.saving}>{editingGroupId ? "Save" : "Add group"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modDialog.open} onOpenChange={(v) => setModDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>New option</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label>
              <Input value={modDraft.name} onChange={(e) => setModDraft({ ...modDraft, name: e.target.value })} placeholder="Large" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price delta ($)</Label>
                <Input type="number" step="0.01" value={(modDraft.price_delta_cents / 100).toString()}
                  onChange={(e) => setModDraft({ ...modDraft, price_delta_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <label className="flex items-end justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Default</span>
                <Switch checked={modDraft.is_default} onCheckedChange={(v) => setModDraft({ ...modDraft, is_default: v })} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModDialog({ open: false, groupId: null })}>Cancel</Button>
            <Button onClick={handleSaveMod} disabled={menu.saving}>Add option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
