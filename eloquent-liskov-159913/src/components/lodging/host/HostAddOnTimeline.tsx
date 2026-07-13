import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2, ReceiptText, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservationChangeRequest } from "@/hooks/lodging/useReservationChangeRequests";

interface Props { requests: ReservationChangeRequest[]; isLoading?: boolean; }
const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;

function addonItems(payload: any) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.selections) ? payload.selections : Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => {
    const qty = Number(item.quantity || item.qty || 1);
    const amount = Number(item.line_total_cents ?? item.total_cents ?? item.amount_cents ?? item.price_cents ?? 0);
    return `${item.name || item.label || item.id || "Add-on"} ×${qty}${amount ? ` · ${money(amount)}` : ""}`;
  }).join(", ");
}

function nextStep(r: ReservationChangeRequest, failed: boolean, success: boolean) {
  if (failed) return r.addon_payload?.failure_reason || r.addon_payload?.error || "Saved payment method was not charged; ask guest to update payment or retry later.";
  if (success) return "Reservation total and add-on status are updated. No host action needed.";
  return "Review availability and payment before approving or charging this request.";
}

export default function HostAddOnTimeline({ requests, isLoading }: Props) {
  const addons = requests.filter((r) => r.type === "addon");
  return (
    <Card id="host-addons" className="scroll-mt-24 transition-shadow">
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Charges & add-ons</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading add-on timeline…</div> : !addons.length ? <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">No add-on workflow yet</p><p className="text-xs mt-1">Guest add-on selections, saved-card charges, failures, and approvals will appear here after checkout.</p></div> : addons.map((r) => {
          const failed = r.status === "failed";
          const success = r.status === "auto_approved" || r.status === "approved";
          const Icon = failed ? XCircle : success ? CheckCircle2 : Clock;
          const tone = failed ? "border-destructive/30 bg-destructive/5" : success ? "border-primary/25 bg-primary/5" : "border-border bg-muted/30";
          return (
            <div key={r.id} className={`flex gap-3 rounded-xl border p-3 ${tone}`}>
              <Icon className={failed ? "h-4 w-4 text-destructive" : success ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{addonItems(r.addon_payload) || "Add-on purchase"}</p>
                  <Badge variant={failed ? "destructive" : success ? "default" : "secondary"} className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "MMM d, yyyy h:mm a")} · {money(r.price_delta_cents)} · {String(r.payment_status || "pending").replace(/_/g, " ")}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5"><CreditCard className="h-3 w-3" /> {String(r.payment_status || "pending").replace(/_/g, " ")}</span>
                  {r.stripe_payment_intent_id && <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono">Stripe …{r.stripe_payment_intent_id.slice(-8)}</span>}
                </div>
                <p className={`text-xs flex items-start gap-1 ${failed ? "text-destructive" : success ? "text-primary" : "text-muted-foreground"}`}><AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {nextStep(r, failed, success)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}