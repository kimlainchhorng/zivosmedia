/**
 * Auto Repair — Customer Notes & Communication Log
 * Tracks internal notes, customer calls, SMS logs, and messages per store.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, Plus, Search, Phone, MessageSquare, Loader2,
  StickyNote, Trash2, User, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props { storeId: string }

interface Note {
  id: string;
  workorder_id: string | null;
  vehicle_id: string | null;
  customer_name: string | null;
  note_type: string;
  body: string;
  created_at: string;
}

const NOTE_TYPES = [
  { id: "all",      label: "All",       icon: Filter },
  { id: "internal", label: "Internal",  icon: StickyNote },
  { id: "customer", label: "Customer",  icon: User },
  { id: "sms",      label: "SMS",       icon: MessageSquare },
  { id: "call",     label: "Call Log",  icon: Phone },
];

const TYPE_STYLE: Record<string, string> = {
  internal: "bg-slate-500/10 text-slate-700 border-slate-500/30",
  customer: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  sms:      "bg-green-500/10 text-green-700 border-green-500/30",
  call:     "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  internal: StickyNote,
  customer: User,
  sms:      MessageSquare,
  call:     Phone,
};

const QUICK_TEMPLATES = [
  { label: "Vehicle ready", body: "Your vehicle is ready for pickup. Please call us to arrange a convenient time." },
  { label: "Parts ordered", body: "We have ordered the required parts. We'll contact you once they arrive." },
  { label: "Awaiting approval", body: "We've completed our inspection and have an estimate ready for your review." },
  { label: "On hold", body: "Work on your vehicle is temporarily on hold. We'll be in touch shortly." },
  { label: "Call attempted", body: "We attempted to call you but were unable to reach you. Please call us back at your earliest convenience." },
];

export default function AutoRepairCustomerNotesSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState("internal");
  const [customerName, setCustomerName] = useState("");
  const [body, setBody] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["ar-customer-notes", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_customer_notes" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Note[];
    },
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = notes;
    if (typeFilter !== "all") list = list.filter((n) => n.note_type === typeFilter);
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter((n) =>
        `${n.body} ${n.customer_name ?? ""}`.toLowerCase().includes(lq)
      );
    }
    return list;
  }, [notes, typeFilter, q]);

  const addNote = useMutation({
    mutationFn: async () => {
      if (!body.trim()) throw new Error("Note body is required");
      const { error } = await supabase.from("ar_customer_notes" as any).insert({
        store_id: storeId,
        note_type: noteType,
        customer_name: customerName.trim() || null,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["ar-customer-notes", storeId] });
      setBody("");
      setCustomerName("");
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_customer_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      qc.invalidateQueries({ queryKey: ["ar-customer-notes", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { internal: 0, customer: 0, sms: 0, call: 0 };
    notes.forEach((n) => { if (n.note_type in c) c[n.note_type]++; });
    return c;
  }, [notes]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Customer Notes
              <Badge variant="secondary" className="text-[10px]">{notes.length}</Badge>
            </CardTitle>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Internal", value: counts.internal, color: "text-slate-600" },
              { label: "Customer", value: counts.customer, color: "text-blue-600" },
              { label: "SMS",      value: counts.sms,      color: "text-green-600" },
              { label: "Calls",    value: counts.call,     color: "text-amber-600" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl bg-muted/40 p-2.5 text-center">
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Add note form */}
          {showForm && (
            <div className="border border-border/60 rounded-xl p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Type</Label>
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Note</SelectItem>
                      <SelectItem value="customer">Customer Note</SelectItem>
                      <SelectItem value="sms">SMS Log</SelectItem>
                      <SelectItem value="call">Call Log</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Customer (optional)</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Quick templates */}
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Quick templates</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TEMPLATES.map((t) => (
                    <button type="button"
                      key={t.label}
                      onClick={() => setBody(t.body)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your note…"
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="h-7" onClick={() => addNote.mutate()} disabled={addNote.isPending}>
                  {addNote.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Note
                </Button>
              </div>
            </div>
          )}

          {/* Search + type filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{notes.length === 0 ? "No notes yet. Add your first note above." : "No notes match your search."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const Icon = TYPE_ICON[n.note_type] ?? StickyNote;
            const typeStyle = TYPE_STYLE[n.note_type] ?? TYPE_STYLE.internal;
            const typeLabel = NOTE_TYPES.find((t) => t.id === n.note_type)?.label ?? n.note_type;
            return (
              <Card key={n.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${typeStyle}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] border ${typeStyle}`}>{typeLabel}</Badge>
                        {n.customer_name && (
                          <span className="text-[11px] font-medium text-foreground">{n.customer_name}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
                    </div>
                    <button type="button"
                      onClick={() => { if (confirm("Delete this note?")) remove.mutate(n.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
