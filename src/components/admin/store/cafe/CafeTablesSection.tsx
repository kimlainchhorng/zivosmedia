/**
 * CafeTablesSection — manage the cafe's tables and download QR codes that
 * route customers to the public ordering page.
 */
import { useState } from "react";
import { QrCode, Plus, Trash2, Loader2, RefreshCw, Copy, Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCafeTables, type CafeTableDraft, type CafeTable } from "@/hooks/cafe/useCafeTables";
import { toast } from "sonner";
import CafeReservationsCard from "./CafeReservationsCard";

interface Props { storeId: string; storeSlug?: string | null }

const blankTable = (): CafeTableDraft => ({
  label: "", capacity: 2, zone: null, is_active: true,
});

const buildQrUrl = (storeSlug: string | null | undefined, token: string) =>
  `${window.location.origin}/cafe/${encodeURIComponent(storeSlug || "")}?t=${encodeURIComponent(token)}`;

// Use a public QR rendering service for the printable QR — no extra deps.
const qrImage = (data: string, size = 256) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

export default function CafeTablesSection({ storeId, storeSlug }: Props) {
  const { tables, loading, create, update, remove, regenerateQr } = useCafeTables(storeId);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState<CafeTableDraft>(blankTable());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrTable, setQrTable] = useState<CafeTable | null>(null);

  const handleSave = async () => {
    if (!draft.label.trim()) { toast.error("Label required."); return; }
    if (editingId) {
      await update(editingId, draft);
      toast.success("Saved.");
    } else {
      const created = await create(draft);
      if (created) toast.success(`Added ${created.label}.`);
    }
    setDialog(false); setEditingId(null); setDraft(blankTable());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CafeReservationsCard storeId={storeId} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Tables</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline"
                onClick={() => window.open(`/admin/cafe-qr-sheet/${storeId}`, "_blank", "noopener,noreferrer")}
                disabled={tables.length === 0}
                title="Print QR codes for every active table"
              >
                <Printer className="h-4 w-4 mr-1" /> Print all QRs
              </Button>
              <Button size="sm" onClick={() => { setEditingId(null); setDraft(blankTable()); setDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Table
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {tables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Add tables to enable QR ordering. Customers scan and order to their seat.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {tables.map((t) => (
                <li key={t.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-700 font-bold">{t.label.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Table {t.label}</span>
                      {t.zone && <Badge variant="secondary" className="text-[10px]">{t.zone}</Badge>}
                      {!t.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Seats {t.capacity}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setQrTable(t)}>
                    <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                  </Button>
                  <Switch checked={t.is_active} onCheckedChange={(v) => update(t.id, { is_active: v })} />
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingId(t.id);
                    setDraft({ label: t.label, capacity: t.capacity, zone: t.zone, is_active: t.is_active });
                    setDialog(true);
                  }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete table ${t.label}?`)) remove(t.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit table" : "New table"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="5" />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" min={1} max={50} value={String(draft.capacity)}
                  onChange={(e) => setDraft({ ...draft, capacity: Math.max(1, Math.min(50, parseInt(e.target.value || "2", 10))) })} />
              </div>
            </div>
            <div>
              <Label>Zone (optional)</Label>
              <Input value={draft.zone ?? ""} onChange={(e) => setDraft({ ...draft, zone: e.target.value || null })} placeholder="Patio, Counter, Indoor…" />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save" : "Add table"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={!!qrTable} onOpenChange={(v) => !v && setQrTable(null)}>
        <DialogContent>
          {qrTable && (
            <>
              <DialogHeader><DialogTitle>QR code · Table {qrTable.label}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-white p-4 flex items-center justify-center">
                  <img src={qrImage(buildQrUrl(storeSlug, qrTable.qr_token), 256)} alt="" width={256} height={256} />
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={buildQrUrl(storeSlug, qrTable.qr_token)} className="text-xs" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(buildQrUrl(storeSlug, qrTable.qr_token)); toast.success("Copied."); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <Button size="sm" variant="outline" onClick={() => { void regenerateQr(qrTable.id); toast.success("New token issued."); }}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
                  </Button>
                  <a href={qrImage(buildQrUrl(storeSlug, qrTable.qr_token), 512)} download={`table-${qrTable.label}-qr.png`} className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
