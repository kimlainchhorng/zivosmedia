/**
 * Public digital vehicle inspection viewer — /inspection/:token (no auth).
 * Customer sees the 20-point checklist, status counts, and shop notes for the
 * inspection their mechanic shared. RLS policy "Public inspection view by
 * token" on ar_inspections (migration 20260526240000) allows the anonymous read.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ClipboardCheck, XCircle, Car, User, CalendarDays, Wrench } from "lucide-react";
import { POINTS, COLORS, ICONS, type Status } from "@/lib/autorepair/inspectionPoints";

export default function InspectionViewPage() {
  const { token } = useParams<{ token: string }>();
  const [insp, setInsp] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("ar_inspections")
        .select("*")
        .eq("share_token", token)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setInsp(data);

      if ((data as any).store_id) {
        const { data: sp } = await supabase
          .from("store_profiles")
          .select("name, logo_url, phone, address")
          .eq("id", (data as any).store_id)
          .single();
        setStore(sp);
      }

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
          <h1 className="text-xl font-bold">Inspection Not Found</h1>
          <p className="text-muted-foreground text-sm">This link may be invalid or expired. Contact the shop for an update.</p>
        </div>
      </div>
    );
  }

  const checklist = (insp.checklist || {}) as Record<string, Status>;
  const counts = POINTS.reduce(
    (acc, p) => {
      const s = (checklist[p] ?? "good") as Status;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { good: 0, attention: 0, urgent: 0 } as Record<Status, number>,
  );
  const hasFindings = counts.attention + counts.urgent > 0;
  const customerName = (insp as any).customer_name as string | null | undefined;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Shop header */}
        <div className="flex items-center gap-3">
          {store?.logo_url ? (
            <img src={store.logo_url} alt={store?.name} className="w-12 h-12 rounded-xl object-cover border" loading="lazy" decoding="async" />
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

        {/* Headline */}
        <Card className={hasFindings ? "border-amber-500/40" : "border-emerald-500/40"}>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">Vehicle Inspection</span>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(insp.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <Badge variant="outline" className="capitalize">{(insp.status || "").replace("_", " ")}</Badge>
            </div>

            {/* Vehicle / customer / tech */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle</p>
                <p className="font-medium truncate">{insp.vehicle_label || "—"}</p>
              </div>
              {customerName && (
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Customer</p>
                  <p className="font-medium truncate">{customerName}</p>
                </div>
              )}
              {insp.technician_name && (
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Technician</p>
                  <p className="font-medium truncate">{insp.technician_name}</p>
                </div>
              )}
              {insp.sent_at && (
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Sent</p>
                  <p className="font-medium">{new Date(insp.sent_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Status pill summary */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/40">● Good · {counts.good}</Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-500/40">● Attention · {counts.attention}</Badge>
              <Badge variant="outline" className="text-red-600 border-red-500/40">● Urgent · {counts.urgent}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* 20-point checklist */}
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Inspection Points</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POINTS.map(point => {
                const s = (checklist[point] ?? "good") as Status;
                const Icon = ICONS[s];
                return (
                  <div key={point} className={`flex items-center gap-2 p-2.5 rounded-xl border ${COLORS[s]}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium truncate">{point}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {insp.summary && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Technician Notes</p>
              <Separator className="mb-3" />
              <p className="text-sm whitespace-pre-wrap">{insp.summary}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Powered by ZIVO
        </p>
      </div>
    </div>
  );
}
