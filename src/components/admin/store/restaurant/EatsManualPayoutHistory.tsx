import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EatsManualPayoutHistoryProps {
  restaurantId?: string | null;
}

interface PayoutHistoryRow {
  id: string;
  restaurant_id: string;
  amount_cents: number;
  currency: string;
  rail: string;
  status: string;
  owner_status_note: string | null;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

const PAYOUT_HISTORY_PAGE_SIZE = 100;
const PAYOUT_HISTORY_MAX_PAGES = 200;

async function loadPayoutHistory(
  restaurantId: string | null,
): Promise<PayoutHistoryRow[]> {
  const rows: PayoutHistoryRow[] = [];
  for (let page = 0; page < PAYOUT_HISTORY_MAX_PAGES; page += 1) {
    const from = page * PAYOUT_HISTORY_PAGE_SIZE;
    const { data, error } = await (supabase as any).rpc(
      "list_own_eats_payout_requests",
      {
        p_restaurant_id: restaurantId,
        p_offset: from,
        p_limit: PAYOUT_HISTORY_PAGE_SIZE,
      },
    );
    if (error) throw error;
    const pageRows = (data || []) as PayoutHistoryRow[];
    rows.push(...pageRows);
    if (pageRows.length < PAYOUT_HISTORY_PAGE_SIZE) return rows;
  }
  throw new Error("The payout request history is too large to load safely");
}

const statusLabel = (status: string) => {
  switch (String(status || "pending").toLowerCase()) {
    case "processing":
      return "Transfer in progress";
    case "paid":
      return "Paid";
    case "rejected":
      return "Rejected";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "pending":
      return "Pending review";
    default:
      return "Status unavailable";
  }
};

const statusTone = (status: string) => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["rejected", "failed", "cancelled"].includes(normalized))
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (normalized === "processing")
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
};

const statusIcon = (status: string) => {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid") return CheckCircle2;
  if (["rejected", "failed", "cancelled"].includes(normalized)) return XCircle;
  return Clock3;
};

const money = (cents: number, currency: string) => {
  const normalizedCurrency = /^[A-Z]{3}$/.test(
    String(currency || "").toUpperCase(),
  )
    ? String(currency).toUpperCase()
    : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(Number(cents || 0) / 100);
};

const dateTime = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Unavailable"
    : parsed.toLocaleString();
};

export default function EatsManualPayoutHistory({
  restaurantId = null,
}: EatsManualPayoutHistoryProps) {
  const { user } = useAuth();
  const historyQuery = useQuery({
    queryKey: ["eats-payout-history", user?.id, restaurantId || "all"],
    queryFn: () => loadPayoutHistory(restaurantId),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-primary" /> Manual payout history
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Track every request from review through settlement. Bank destination
            details and internal finance notes are never shown here.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={historyQuery.isFetching}
          onClick={() => void historyQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "mr-1.5 h-3.5 w-3.5",
              historyQuery.isFetching && "animate-spin",
            )}
          />
          Refresh
        </Button>
      </div>

      {historyQuery.isError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-100"
        >
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Payout history unavailable</p>
              <p className="mt-0.5 opacity-80">
                Status and settlement details could not be verified. Try again
                before submitting another request.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={historyQuery.isFetching}
            onClick={() => void historyQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : historyQuery.isLoading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-4 text-xs text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Loading verified payout
          history…
        </p>
      ) : (historyQuery.data || []).length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No manual payout requests yet.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {(historyQuery.data || []).map((row) => {
            const Icon = statusIcon(row.status);
            const status = String(row.status || "pending").toLowerCase();
            return (
              <article key={row.id} className="space-y-2 p-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold tabular-nums">
                      {money(row.amount_cents, row.currency)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Requested {dateTime(row.created_at)} · {row.rail}
                      {!restaurantId
                        ? ` · Restaurant ${row.restaurant_id.slice(0, 8)}…`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusTone(status)}>
                    <Icon className="mr-1 h-3 w-3" /> {statusLabel(status)}
                  </Badge>
                </div>

                {row.owner_status_note ? (
                  <p className="rounded bg-muted/50 p-2 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Status note:{" "}
                    </span>
                    {row.owner_status_note}
                  </p>
                ) : null}

                {row.reference ? (
                  <p className="break-all text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Settlement reference:{" "}
                    </span>
                    {row.reference}
                  </p>
                ) : null}

                {status === "paid" ? (
                  <p className="text-muted-foreground">
                    Paid {dateTime(row.paid_at)}
                  </p>
                ) : null}

                {![
                  "pending",
                  "processing",
                  "paid",
                  "rejected",
                  "failed",
                  "cancelled",
                ].includes(status) ? (
                  <p role="alert" className="text-destructive">
                    This request has an unavailable status. Contact support and
                    do not submit a duplicate payout.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
