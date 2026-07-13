import { CheckCircle2, Clock, Loader2, ReceiptText, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservationChangeRequest } from "@/hooks/lodging/useReservationChangeRequests";

interface Props { requests: ReservationChangeRequest[]; isUpdating?: boolean; }

const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;

function addonItems(payload: any) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.selections) ? payload.selections : Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => {
    const quantity = Number(item.quantity || item.qty || 1);
    const explicitAmount = item.line_total_cents ?? item.total_cents ?? item.amount_cents;
    const amount = Number(explicitAmount ?? (item.price_cents ? Number(item.price_cents) * quantity : 0));
    return { name: item.name || item.label || item.id || "Add-on", quantity, amount };
  });
}

function failureReason(request: ReservationChangeRequest) {
  return request.addon_payload?.failure_reason || request.addon_payload?.error || request.host_response || "The saved payment method was not charged.";
}

export default function AddOnStatusTimeline({ requests, isUpdating }: Props) {
  const addons = requests.filter((r) => r.type === "addon");
  return (
    <Card id="addon-status" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" /> Add-on status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isUpdating && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Updating add-on status…
          </div>
        )}
        {!addons.length ? <p className="text-sm text-muted-foreground">Successful and failed add-on purchase attempts will appear here after checkout.</p> : addons.map((r, index) => {
          const payment = String(r.payment_status || "pending").replace(/_/g, " ");
          const items = addonItems(r.addon_payload);
          const failed = r.status === "failed" || String(r.payment_status || "").includes("fail") || Boolean(r.addon_payload?.failure_reason || r.addon_payload?.error);
          const success = r.status === "auto_approved" || r.status === "approved";
          const Icon = failed ? XCircle : success ? CheckCircle2 : Clock;
          return (
            <div key={r.id} className="flex gap-3 rounded-lg border bg-muted/30 p-3">
              <span className={failed ? "text-destructive" : success ? "text-primary" : "text-muted-foreground"}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{items.map((item) => `${item.name} ×${item.quantity}`).join(", ") || "Add-on purchase"}</p>
                  {index === 0 && <Badge variant="outline">Latest</Badge>}
                  <Badge variant={failed ? "destructive" : success ? "default" : "secondary"} className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
                </div>
                {items.length > 0 && (
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {items.map((item, itemIndex) => <p key={`${r.id}-${itemIndex}`}>{item.name} · Qty {item.quantity}{item.amount ? ` · ${money(item.amount)}` : ""}</p>)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{format(parseISO(r.created_at), "MMM d, yyyy h:mm a")} · {money(r.price_delta_cents)} · {payment}</p>
                <p className="text-xs text-muted-foreground">Saved-card charge {failed ? "failed; reservation total was not changed." : success ? "completed and reservation total updated." : "is pending."}</p>
                {r.stripe_payment_intent_id && <p className="text-xs text-muted-foreground">Payment ref: …{r.stripe_payment_intent_id.slice(-8)}</p>}
                {failed && <p className="text-xs text-destructive">{failureReason(r)}</p>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
