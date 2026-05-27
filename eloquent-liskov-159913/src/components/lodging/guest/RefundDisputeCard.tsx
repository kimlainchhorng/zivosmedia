import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, Circle, Clock, FileText, Link as LinkIcon, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RefundDisputeSheet from "./RefundDisputeSheet";
import type { LodgingRefundDispute } from "@/hooks/lodging/useLodgingRefundDisputes";

interface Props {
  reservationId: string;
  disputes: LodgingRefundDispute[];
  canRequest: boolean;
  maxAmountCents: number;
}

const openStatuses = new Set(["pending", "under_review", "approved"]);
const money = (cents?: number | null) => `$${((Number(cents) || 0) / 100).toFixed(2)}`;
const highlightTarget = (href: string) => {
  const target = document.querySelector(href) as HTMLElement | null;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.add("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  window.setTimeout(() => target.classList.remove("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 1600);
};

export default function RefundDisputeCard({ reservationId, disputes, canRequest, maxAmountCents }: Props) {
  const [open, setOpen] = useState(false);
  const hasOpen = disputes.some((d) => openStatuses.has(d.status));
  if (!canRequest && !disputes.length) return null;
  const latest = disputes[0];
  const resolvedDelta = latest?.resolution_amount_cents == null ? null : latest.resolution_amount_cents - latest.requested_amount_cents;

  const steps = latest ? [
    { key: "pending", label: "Request submitted", done: true },
    { key: "under_review", label: "Under review", done: ["under_review", "approved", "declined", "paid", "closed"].includes(latest.status) },
    { key: "approved", label: latest.status === "declined" ? "Declined" : "Resolution", done: ["approved", "declined", "paid", "closed"].includes(latest.status) },
    { key: "paid", label: latest.status === "closed" ? "Closed" : "Paid / closed", done: ["paid", "closed"].includes(latest.status) },
  ] : [];

  return (
    <Card id="refund-disputes" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Refund / dispute request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latest && (
          <div className={`rounded-lg border p-3 space-y-3 ${latest.status === "declined" ? "bg-destructive/10" : "bg-muted/30"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Latest update</p>
                <p className="text-sm font-semibold capitalize">{latest.status.replace(/_/g, " ")}</p>
              </div>
              <span className="text-xs text-muted-foreground">Updated {format(parseISO(latest.updated_at), "MMM d, yyyy h:mm a")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-background/70 p-2 text-xs">
              <div><span className="text-muted-foreground">Requested</span><p className="font-semibold">{money(latest.requested_amount_cents)}</p></div>
              <div><span className="text-muted-foreground">Resolution</span><p className="font-semibold">{latest.resolution_amount_cents == null ? "Pending" : money(latest.resolution_amount_cents)}</p></div>
              <div><span className="text-muted-foreground">Difference</span><p className="font-semibold">{resolvedDelta == null ? "Pending" : `${resolvedDelta >= 0 ? "+" : ""}${money(resolvedDelta)}`}</p></div>
              <div><span className="text-muted-foreground">Reason</span><p className="font-semibold capitalize">{latest.reason_category.replace(/_/g, " ")}</p></div>
            </div>
            {latest.admin_response && <p className="rounded-md bg-background p-2 text-xs">{latest.admin_response}</p>}
            <div className="grid gap-2">
              {steps.map((step) => {
                const current = step.key === latest.status || (latest.status === "declined" && step.key === "approved");
                const Icon = latest.status === "declined" && current ? XCircle : step.done ? CheckCircle2 : current ? Clock : Circle;
                return (
                  <div key={step.key} className="flex items-center gap-2 text-sm">
                    <Icon className={latest.status === "declined" && current ? "h-4 w-4 text-destructive" : step.done || current ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
                    <span className={current ? "font-semibold" : "text-muted-foreground"}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => highlightTarget("#stay-summary")}><LinkIcon className="h-3.5 w-3.5" /> Reservation details</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => highlightTarget("#payment-summary")}><LinkIcon className="h-3.5 w-3.5" /> Payment summary</Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => highlightTarget("#request-history")}><LinkIcon className="h-3.5 w-3.5" /> Request history</Button>
            </div>
          </div>
        )}
        {!disputes.length ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">If your cancellation refund needs review, submit one request tied to this reservation.</div>
        ) : disputes.map((d) => (
          <div key={d.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={d.status === "declined" ? "destructive" : d.status === "paid" || d.status === "approved" ? "default" : "secondary"} className="capitalize">{d.status.replace(/_/g, " ")}</Badge>
              <span className="text-xs text-muted-foreground">{format(parseISO(d.created_at), "MMM d, yyyy h:mm a")}</span>
            </div>
            <p className="text-sm font-medium">{money(d.requested_amount_cents)} requested · {d.reason_category.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground">{d.description}</p>
            {d.admin_response && <p className="rounded-md bg-background p-2 text-xs">{d.admin_response}</p>}
            {d.resolution_amount_cents != null && <p className="text-xs text-muted-foreground">Resolution amount: {money(d.resolution_amount_cents)}</p>}
          </div>
        ))}
        {canRequest && !hasOpen && (
          <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}><AlertTriangle className="h-4 w-4" /> Request refund review</Button>
        )}
        <RefundDisputeSheet open={open} onOpenChange={setOpen} reservationId={reservationId} maxAmountCents={maxAmountCents} />
      </CardContent>
    </Card>
  );
}
