/**
 * Public repair status page — /repair/:token (no auth required).
 * Customer sees live work order status, tech, photos, and invoice state.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Car, Wrench, CheckCircle2, Clock, ShieldCheck,
  Star, XCircle, Camera, Receipt, User, CalendarDays,
} from "lucide-react";

const STEPS = [
  { id: "awaiting",    label: "Received",      icon: Clock },
  { id: "in_progress", label: "In Progress",   icon: Wrench },
  { id: "on_hold",     label: "On Hold",       icon: XCircle },
  { id: "qc",         label: "Final Check",   icon: ShieldCheck },
  { id: "done",       label: "Ready",         icon: Star },
] as const;

const STEP_ORDER = ["awaiting", "in_progress", "qc", "done"];

function stepIndex(status: string) {
  if (status === "on_hold") return STEP_ORDER.indexOf("in_progress");
  return Math.max(0, STEP_ORDER.indexOf(status));
}

const STATUS_COLOR: Record<string, string> = {
  awaiting: "text-muted-foreground",
  in_progress: "text-blue-600",
  on_hold: "text-amber-600",
  qc: "text-violet-600",
  done: "text-emerald-600",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting: "Received — Awaiting Service",
  in_progress: "In Progress",
  on_hold: "Work Paused — We'll Be In Touch",
  qc: "Final Quality Check",
  done: "✓ Your Vehicle Is Ready for Pickup",
};

export default function RepairStatusPage() {
  const { token } = useParams<{ token: string }>();
  const [wo, setWo] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [tech, setTech] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("ar_work_orders" as any)
        .select("*")
        .eq("share_token", token)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setWo(data);

      // Load store branding
      if ((data as any).store_id) {
        const { data: sp } = await supabase
          .from("store_profiles")
          .select("name, logo_url, phone, address")
          .eq("id", (data as any).store_id)
          .single();
        setStore(sp);
      }

      // Load technician name
      if ((data as any).technician_id) {
        const { data: t } = await supabase
          .from("ar_technicians" as any)
          .select("name")
          .eq("id", (data as any).technician_id)
          .single();
        setTech((t as any)?.name ?? null);
      }

      // Load linked invoice (by source_workorder_id)
      const { data: inv } = await supabase
        .from("ar_invoices" as any)
        .select("id, number, status, total_cents, amount_paid_cents")
        .eq("source_workorder_id", (data as any).id)
        .maybeSingle();
      setInvoice(inv);

      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center space-y-3 max-w-sm">
          <XCircle className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h1 className="text-xl font-bold">Status Not Found</h1>
          <p className="text-muted-foreground text-sm">This link may be invalid or expired. Contact the shop for an update.</p>
        </div>
      </div>
    );
  }

  const photos: string[] = Array.isArray(wo.photos) ? wo.photos.filter((p: any) => typeof p === "string") : [];
  const activeStep = stepIndex(wo.status);
  const isDone = wo.status === "done";
  const isOnHold = wo.status === "on_hold";
  const fmt = (c: number) => `$${((c ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Shop header */}
        <div className="flex items-center gap-3">
          {store?.logo_url ? (
            <img src={store.logo_url} alt={store?.name} className="w-12 h-12 rounded-xl object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-semibold text-base">{store?.name || "Auto Repair Shop"}</p>
            {store?.phone && <p className="text-xs text-muted-foreground">{store.phone}</p>}
            {store?.address && <p className="text-xs text-muted-foreground">{store.address}</p>}
          </div>
        </div>

        {/* Status headline */}
        <Card className={isDone ? "border-emerald-500/50 bg-emerald-500/5" : isOnHold ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${STATUS_COLOR[wo.status]}`}>
                  {STATUS_LABEL[wo.status] ?? wo.status}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{wo.number}</p>
              </div>
              {isDone ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 shrink-0" />
              ) : (
                <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLOR[wo.status]}`}>
                  {wo.status?.replace("_", " ")}
                </Badge>
              )}
            </div>

            {/* Progress stepper */}
            <div className="flex items-center gap-0">
              {STEP_ORDER.map((s, i) => {
                const step = STEPS.find((st) => st.id === s)!;
                const Icon = step.icon;
                const active = i === activeStep && !isOnHold;
                const done = i < activeStep || isDone;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        done ? "bg-emerald-500 border-emerald-500 text-white" :
                        active ? "bg-primary border-primary text-white" :
                        "bg-background border-border text-muted-foreground"
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] mt-1 text-center leading-tight ${
                        done || active ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}>{step.label}</span>
                    </div>
                    {i < STEP_ORDER.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 mx-1 rounded ${done ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {isOnHold && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700">
                Work has been paused on your vehicle. The shop will contact you shortly.
              </div>
            )}

            {wo.ready_message && isDone && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-700">
                {wo.ready_message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle + tech info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium">{wo.vehicle_label || "—"}</p>
                </div>
              </div>
              {tech && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Technician</p>
                    <p className="text-sm font-medium">{tech}</p>
                  </div>
                </div>
              )}
              {wo.customer_name && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{wo.customer_name}</p>
                  </div>
                </div>
              )}
              {wo.eta_date && (
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Est. Ready</p>
                    <p className="text-sm font-medium">{new Date(wo.eta_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  </div>
                </div>
              )}
            </div>

            {wo.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Shop Notes</p>
                  <p className="text-sm text-muted-foreground">{wo.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Repair photos */}
        {photos.length > 0 && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Repair Photos</p>
                <span className="text-xs text-muted-foreground">({photos.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Repair photo ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-xl border hover:opacity-90 transition"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice status */}
        {invoice && (
          <Card className={invoice.status === "paid" ? "border-emerald-500/40" : "border-amber-500/40"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Invoice {invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.status === "paid"
                        ? "Paid in full — thank you!"
                        : `Balance due: ${fmt((invoice.total_cents ?? 0) - (invoice.amount_paid_cents ?? 0))}`}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={invoice.status === "paid" ? "default" : "outline"}
                  className={invoice.status === "paid" ? "bg-emerald-500" : "text-amber-600 border-amber-500/40"}
                >
                  {invoice.status === "paid" ? "Paid" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Powered by ZIVO · {wo.number}
        </p>
      </div>
    </div>
  );
}
