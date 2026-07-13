/**
 * Public estimate approval page — accessible via /estimate/:token (no auth required).
 * Customer can view line items, total, and approve or decline.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, XCircle, Car, FileSignature, Wrench } from "lucide-react";

type LineItem = { kind: string; name: string; qty: number; unit_cents: number };

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EstimateApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [est, setEst] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [responding, setResponding] = useState(false);
  const [done, setDone] = useState<"approved" | "declined" | null>(null);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("*")
        .eq("share_token", token)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setEst(data);
      // Mark as viewed (fire and forget)
      if (!(data as any).customer_viewed_at) {
        supabase.from("ar_estimates" as any)
          .update({ customer_viewed_at: new Date().toISOString() })
          .eq("share_token", token);
      }
      // Load store info for branding
      if ((data as any).store_id) {
        const { data: sp } = await supabase
          .from("store_profiles")
          .select("name, logo_url, phone, address")
          .eq("id", (data as any).store_id)
          .single();
        setStore(sp);
      }
      setLoading(false);
      // Pre-fill done state if already responded
      if ((data as any).status === "approved") setDone("approved");
      if ((data as any).status === "declined") setDone("declined");
    })();
  }, [token]);

  const respond = async (decision: "approved" | "declined") => {
    setResponding(true);
    const now = new Date().toISOString();
    await supabase.from("ar_estimates" as any)
      .update({ status: decision, customer_responded_at: now })
      .eq("share_token", token!);
    setDone(decision);
    setResponding(false);
  };

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
          <h1 className="text-xl font-bold">Estimate Not Found</h1>
          <p className="text-muted-foreground text-sm">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const items: LineItem[] = est.line_items ?? [];
  const isExpired = est.expiry_date && new Date(est.expiry_date) < new Date();

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

        {/* Estimate card */}
        <Card>
          <CardContent className="pt-5 space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileSignature className="w-4 h-4 text-primary" />
                  <span className="font-bold text-lg">{est.number}</span>
                </div>
                {isExpired && (
                  <Badge variant="destructive" className="text-[10px] mb-1">Expired</Badge>
                )}
                {est.expiry_date && !isExpired && (
                  <p className="text-xs text-muted-foreground">Valid until {new Date(est.expiry_date).toLocaleDateString()}</p>
                )}
              </div>
              <Badge
                variant={done === "approved" ? "default" : done === "declined" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {done ?? est.status}
              </Badge>
            </div>

            {/* Customer + Vehicle */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Customer</p>
                <p className="font-medium">{est.customer_name || "—"}</p>
                {est.customer_phone && <p className="text-xs text-muted-foreground">{est.customer_phone}</p>}
                {est.customer_email && <p className="text-xs text-muted-foreground">{est.customer_email}</p>}
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle</p>
                <p className="font-medium">{est.vehicle_label || "—"}</p>
              </div>
            </div>

            {/* Line items */}
            {items.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Services & Parts</p>
                <div className="space-y-1.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-muted/30">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{it.name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{it.kind} × {it.qty}</p>
                      </div>
                      <p className="font-medium tabular-nums shrink-0 ml-3">{fmt(it.qty * it.unit_cents)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{fmt(est.subtotal_cents)}</span>
              </div>
              {est.tax_cents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({est.tax_rate}%)</span><span>{fmt(est.tax_cents)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span><span>{fmt(est.total_cents)}</span>
              </div>
            </div>

            {est.notes && (
              <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-0.5">Notes</p>
                <p>{est.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        {done ? (
          <Card>
            <CardContent className="pt-5 text-center space-y-2">
              {done === "approved" ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-emerald-600">Estimate Approved</p>
                  <p className="text-sm text-muted-foreground">The shop has been notified and will start your vehicle soon.</p>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-destructive mx-auto" />
                  <p className="font-semibold text-destructive">Estimate Declined</p>
                  <p className="text-sm text-muted-foreground">The shop has been notified. Please contact them to discuss next steps.</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : isExpired ? (
          <Card>
            <CardContent className="pt-5 text-center">
              <p className="text-sm text-muted-foreground">This estimate has expired. Please contact the shop for an updated quote.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-2"
              disabled={responding}
              onClick={() => respond("declined")}
            >
              <XCircle className="w-4 h-4" /> Decline
            </Button>
            <Button
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={responding}
              onClick={() => respond("approved")}
            >
              {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve
            </Button>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Powered by ZIVO · Estimate {est.number}
        </p>
      </div>
    </div>
  );
}
