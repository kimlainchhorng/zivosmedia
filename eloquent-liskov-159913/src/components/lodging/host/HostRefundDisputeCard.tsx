import { AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LodgingRefundDispute } from "@/hooks/lodging/useLodgingRefundDisputes";

interface Props { disputes: LodgingRefundDispute[]; }
const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;

export default function HostRefundDisputeCard({ disputes }: Props) {
  if (!disputes.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Refund review</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {disputes.map((d) => (
          <div key={d.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold capitalize">{d.reason_category.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">Submitted {format(parseISO(d.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <Badge variant={["pending", "under_review"].includes(d.status) ? "destructive" : "secondary"} className="capitalize">{d.status.replace(/_/g, " ")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-background p-2"><span className="text-muted-foreground">Requested</span><p className="font-semibold">{money(d.requested_amount_cents)}</p></div>
              <div className="rounded-md bg-background p-2"><span className="text-muted-foreground">Resolution</span><p className="font-semibold">{d.resolution_amount_cents == null ? "—" : money(d.resolution_amount_cents)}</p></div>
            </div>
            {d.admin_response && <p className="text-xs rounded-md bg-background p-2"><span className="font-semibold">Admin response:</span> {d.admin_response}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}