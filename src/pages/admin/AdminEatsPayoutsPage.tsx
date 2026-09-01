import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useStepUpMfa } from "@/hooks/useStepUpMfa";
import { useUserAccess } from "@/hooks/useUserAccess";
import { supabase } from "@/integrations/supabase/client";
import { isAal2 } from "@/lib/security/mfa";
import { loadAllFinancePayoutMethods } from "@/lib/payoutMethods";
import { invokeSensitive } from "@/lib/security/sensitiveInvoke";

type PageTab = "requests" | "destinations";
type Selection =
  | { kind: "request"; row: PayoutRequest }
  | { kind: "method"; row: PayoutMethod };

interface PayoutRequest {
  id: string;
  restaurant_id: string;
  requested_by: string;
  amount_cents: number;
  currency: string;
  rail: string;
  status: string;
  note: string | null;
  admin_note: string | null;
  failure_reason: string | null;
  reference: string | null;
  paid_at: string | null;
  processing_by: string | null;
  processing_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  payout_destination_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface PayoutMethod {
  id: string;
  user_id: string;
  store_id: string | null;
  method_type: string;
  rail: string | null;
  label: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  aba_account_id: string | null;
  country_code: string | null;
  is_verified: boolean;
  verification_status: string | null;
  verification_note: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 250;
const MAX_PAGES = 100;

async function loadAll<T>(
  page: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const next = data || [];
    rows.push(...next);
    if (next.length < PAGE_SIZE) return rows;
  }
  throw new Error("The finance queue is too large to verify safely");
}

const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(Number(cents || 0) / 100);

const statusClass = (status: string) => {
  const normalized = String(status || "pending").toLowerCase();
  if (["paid", "verified"].includes(normalized))
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (["rejected", "failed"].includes(normalized))
    return "bg-destructive/10 text-destructive";
  if (normalized === "processing")
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
};

const shortId = (value: string | null | undefined) =>
  value ? `${value.slice(0, 8)}…` : "—";

export default function AdminEatsPayoutsPage() {
  const { user } = useAuth();
  const { data: access } = useUserAccess(user?.id);
  const queryClient = useQueryClient();
  const { ensureAal2, dialog: mfaDialog } = useStepUpMfa();
  const [sensitiveAccess, setSensitiveAccess] = useState<
    "checking" | "locked" | "granted"
  >("checking");
  const [unlocking, setUnlocking] = useState(false);
  const [tab, setTab] = useState<PageTab>("requests");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [note, setNote] = useState("");
  const [methodInternalEvidence, setMethodInternalEvidence] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const retryRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    setSensitiveAccess("checking");
    void isAal2().then((allowed) => {
      if (active) setSensitiveAccess(allowed ? "granted" : "locked");
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const requestsQuery = useQuery({
    queryKey: ["admin-eats-payout-requests"],
    queryFn: () =>
      loadAll<PayoutRequest>((from, to) =>
        (supabase.from("eats_payout_requests") as any)
          .select(
            "id,restaurant_id,requested_by,amount_cents,currency,rail,status,note,admin_note,failure_reason,reference,paid_at,processing_by,processing_at,resolved_by,resolved_at,payout_destination_snapshot,created_at,updated_at",
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      ),
    enabled: sensitiveAccess === "granted",
  });

  const methodsQuery = useQuery({
    queryKey: ["admin-payout-method-reviews"],
    queryFn: () => loadAllFinancePayoutMethods() as Promise<PayoutMethod[]>,
    enabled: sensitiveAccess === "granted",
  });

  const requests = useMemo(
    () => requestsQuery.data || [],
    [requestsQuery.data],
  );
  const methods = useMemo(() => methodsQuery.data || [], [methodsQuery.data]);
  const query = search.trim().toLowerCase();
  const visibleRequests = useMemo(
    () =>
      requests.filter((row) =>
        !query
          ? true
          : [
              row.id,
              row.restaurant_id,
              row.requested_by,
              row.status,
              row.rail,
              row.reference,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(query),
            ),
      ),
    [query, requests],
  );
  const visibleMethods = useMemo(
    () =>
      methods.filter((row) =>
        !query
          ? true
          : [
              row.id,
              row.user_id,
              row.store_id,
              row.label,
              row.bank_name,
              row.account_holder_name,
              row.method_type,
              row.verification_status,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(query),
            ),
      ),
    [methods, query],
  );

  const openSelection = (next: Selection) => {
    setSelection(next);
    setNote("");
    setMethodInternalEvidence("");
    setReference(next.kind === "request" ? next.row.reference || "" : "");
    retryRef.current = null;
  };

  const actionKey = (payload: Record<string, unknown>) => {
    const fingerprint = JSON.stringify(payload);
    if (retryRef.current?.fingerprint !== fingerprint) {
      retryRef.current = { fingerprint, key: crypto.randomUUID() };
    }
    return retryRef.current.key;
  };

  const reviewMethod = async (decision: "verified" | "rejected") => {
    if (selection?.kind !== "method") return;
    const cleanNote = note.trim();
    if (cleanNote.length < 10) {
      toast.error("Add at least 10 characters of owner-visible status copy");
      return;
    }
    const cleanInternalEvidence = methodInternalEvidence.trim();
    if (cleanInternalEvidence.length < 10) {
      toast.error("Add at least 10 characters of internal finance evidence");
      return;
    }
    const payload = {
      method_id: selection.row.id,
      decision,
      owner_status_note: cleanNote,
      internal_evidence: cleanInternalEvidence,
    };
    setBusy(true);
    try {
      const { data, error } = await invokeSensitive<{ error?: string }>(
        "payout-method-verification",
        {
          body: payload,
          headers: { "Idempotency-Key": actionKey(payload) },
        },
        ensureAal2,
        `${decision === "verified" ? "Verify" : "Reject"} payout destination`,
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      retryRef.current = null;
      toast.success(`Payout destination ${decision}`);
      setSelection(null);
      await queryClient.invalidateQueries({
        queryKey: ["admin-payout-method-reviews"],
      });
    } catch (error: any) {
      toast.error(error?.message || "Could not record destination review");
    } finally {
      setBusy(false);
    }
  };

  const resolveRequest = async (
    decision: "processing" | "paid" | "rejected" | "released",
  ) => {
    if (selection?.kind !== "request") return;
    const cleanNote = note.trim();
    const cleanReference = reference.trim();
    if (cleanNote.length < 10) {
      toast.error("Add at least 10 characters of finance evidence");
      return;
    }
    if (decision === "paid" && cleanReference.length < 4) {
      toast.error("A settled transfer reference is required");
      return;
    }
    const payload = {
      request_id: selection.row.id,
      decision,
      reference: cleanReference || null,
      note: cleanNote,
    };
    setBusy(true);
    try {
      const { data, error } = await invokeSensitive<{ error?: string }>(
        "eats-payout-admin",
        {
          body: payload,
          headers: { "Idempotency-Key": actionKey(payload) },
        },
        ensureAal2,
        `${decision === "processing" ? "Claim" : decision === "paid" ? "Record" : decision === "released" ? "Release" : "Reject"} Eats payout`,
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      retryRef.current = null;
      toast.success(`Payout request ${decision}`);
      setSelection(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-eats-payout-requests"],
        }),
        queryClient.invalidateQueries({ queryKey: ["eats-payouts-summary"] }),
      ]);
    } catch (error: any) {
      toast.error(error?.message || "Could not record payout decision");
    } finally {
      setBusy(false);
    }
  };

  const activeQuery = tab === "requests" ? requestsQuery : methodsQuery;
  const pendingRequests = requests.filter((row) =>
    ["pending", "processing"].includes(row.status),
  ).length;
  const pendingMethods = methods.filter(
    (row) => !row.is_verified && row.verification_status !== "rejected",
  ).length;

  const unlockFinanceQueue = async () => {
    setUnlocking(true);
    try {
      if (await ensureAal2("Unlock sensitive payout details")) {
        setSensitiveAccess("granted");
      }
    } finally {
      setUnlocking(false);
    }
  };

  if (sensitiveAccess !== "granted") {
    return (
      <AdminLayout title="Eats Payouts">
        {mfaDialog}
        <Card className="mx-auto mt-10 max-w-lg space-y-4 p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Finance verification required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete two-factor verification before payout destination or
              transfer details are loaded.
            </p>
          </div>
          {sensitiveAccess === "checking" ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking secure
              session…
            </div>
          ) : (
            <Button
              disabled={unlocking}
              onClick={() => void unlockFinanceQueue()}
            >
              {unlocking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Verify and unlock
            </Button>
          )}
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Eats Payouts">
      {mfaDialog}
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Eats payout operations</h2>
            <p className="text-sm text-muted-foreground">
              Verify destinations, claim manual transfers, and record settled
              evidence. This screen never initiates a bank transfer.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={activeQuery.isFetching}
            onClick={() => void activeQuery.refetch()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${activeQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Open requests</p>
            <p className="text-2xl font-bold">{pendingRequests}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">
              Destinations awaiting review
            </p>
            <p className="text-2xl font-bold">{pendingMethods}</p>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as PageTab)}>
          <TabsList>
            <TabsTrigger value="requests">Payout requests</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search IDs, owner, bank, status, rail, or reference"
            className="pl-9"
          />
        </div>

        {activeQuery.isError ? (
          <Card
            role="alert"
            className="flex items-start gap-3 border-amber-500/30 bg-amber-500/10 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold">Finance queue unavailable</p>
              <p className="text-sm text-muted-foreground">
                No payout action is enabled until the complete queue loads.
              </p>
            </div>
          </Card>
        ) : activeQuery.isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading finance
            records…
          </div>
        ) : tab === "requests" ? (
          <Card className="divide-y divide-border overflow-hidden">
            {visibleRequests.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No payout requests match this view.
              </p>
            ) : (
              visibleRequests.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => openSelection({ kind: "request", row })}
                  className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {money(row.amount_cents, row.currency)}
                      </span>
                      <Badge className={statusClass(row.status)}>
                        {row.status}
                      </Badge>
                      <Badge variant="outline">{row.rail}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Restaurant {shortId(row.restaurant_id)} · Request{" "}
                      {shortId(row.id)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {visibleMethods.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No payout destinations match this view.
              </p>
            ) : (
              visibleMethods.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => openSelection({ kind: "method", row })}
                  className="flex w-full flex-col gap-2 p-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {row.label || row.method_type}
                      </span>
                      <Badge
                        className={statusClass(
                          row.verification_status || "pending",
                        )}
                      >
                        {row.verification_status || "pending"}
                      </Badge>
                      <Badge variant="outline">
                        {row.rail || row.method_type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.account_holder_name || "Missing holder"} · Owner{" "}
                      {shortId(row.user_id)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {row.bank_name || row.country_code || "No bank label"}
                  </span>
                </button>
              ))
            )}
          </Card>
        )}
      </div>

      <Sheet
        open={selection !== null}
        onOpenChange={(open) => !open && !busy && setSelection(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selection?.kind === "method" ? (
            <MethodReview
              method={selection.row}
              note={note}
              setNote={setNote}
              internalEvidence={methodInternalEvidence}
              setInternalEvidence={setMethodInternalEvidence}
              busy={busy}
              onVerify={() => void reviewMethod("verified")}
              onReject={() => void reviewMethod("rejected")}
            />
          ) : selection?.kind === "request" ? (
            <RequestReview
              request={selection.row}
              reviewerId={user?.id || null}
              isAdminReviewer={access?.isAdmin === true}
              note={note}
              setNote={setNote}
              reference={reference}
              setReference={setReference}
              busy={busy}
              onResolve={(decision) => void resolveRequest(decision)}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}

function MethodReview({
  method,
  note,
  setNote,
  internalEvidence,
  setInternalEvidence,
  busy,
  onVerify,
  onReject,
}: {
  method: PayoutMethod;
  note: string;
  setNote: (value: string) => void;
  internalEvidence: string;
  setInternalEvidence: (value: string) => void;
  busy: boolean;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Review payout destination</SheetTitle>
        <SheetDescription>
          Confirm the exact owner and account using independent finance
          evidence.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-5 space-y-4">
        <Card className="space-y-2 p-4 text-sm">
          <Detail label="Owner user" value={method.user_id} />
          <Detail
            label="Store scope"
            value={method.store_id || "Personal / global"}
          />
          <Detail label="Rail" value={method.rail || method.method_type} />
          <Detail
            label="Country"
            value={method.country_code || "Not recorded"}
          />
          <Detail
            label="Account holder"
            value={method.account_holder_name || "Missing"}
          />
          <Detail label="Bank" value={method.bank_name || "Not applicable"} />
          <Detail
            label={method.method_type === "aba" ? "ABA ID / phone" : "Account"}
            value={
              method.method_type === "aba"
                ? method.aba_account_id || "Missing"
                : method.account_number || "Missing"
            }
          />
          <Detail
            label="Current status"
            value={method.verification_status || "pending"}
          />
        </Card>
        {method.verification_note ? (
          <Card className="p-3 text-xs">
            <p className="font-semibold">Existing owner-visible note</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {method.verification_note}
            </p>
          </Card>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="method-review-note">Account-owner status note</Label>
          <Textarea
            id="method-review-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Plain-language result for the account owner. Do not include internal evidence, reviewer identities, or secrets."
            maxLength={500}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method-review-internal-evidence">
            Internal verification evidence
          </Label>
          <Textarea
            id="method-review-internal-evidence"
            value={internalEvidence}
            onChange={(event) => setInternalEvidence(event.target.value)}
            placeholder="Record the independent checks and results used by finance. This is never shown to the account owner."
            maxLength={1000}
            rows={5}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="destructive" disabled={busy} onClick={onReject}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
          <Button disabled={busy} onClick={onVerify}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Verify exact account
          </Button>
        </div>
      </div>
    </>
  );
}

function RequestReview({
  request,
  reviewerId,
  isAdminReviewer,
  note,
  setNote,
  reference,
  setReference,
  busy,
  onResolve,
}: {
  request: PayoutRequest;
  reviewerId: string | null;
  isAdminReviewer: boolean;
  note: string;
  setNote: (value: string) => void;
  reference: string;
  setReference: (value: string) => void;
  busy: boolean;
  onResolve: (
    decision: "processing" | "paid" | "rejected" | "released",
  ) => void;
}) {
  const status = String(request.status || "pending").toLowerCase();
  const canClaim = status === "pending";
  const ownsClaim =
    status === "processing" && request.processing_by === reviewerId;
  const claimedElsewhere =
    status === "processing" && request.processing_by !== reviewerId;
  const staleClaim =
    claimedElsewhere &&
    !!request.processing_at &&
    Date.parse(request.processing_at) <= Date.now() - 30 * 60 * 1000;
  const destination = request.payout_destination_snapshot || {};

  return (
    <>
      <SheetHeader>
        <SheetTitle>Process Eats payout</SheetTitle>
        <SheetDescription>
          Claim first, perform the external transfer, then record its settled
          reference. The server rechecks current refunds and holds before the
          claim authorizes any transfer; recording paid then preserves the real
          outbound-transfer evidence.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-5 space-y-4">
        <Card className="space-y-2 p-4 text-sm">
          <Detail
            label="Amount"
            value={money(request.amount_cents, request.currency)}
          />
          <Detail label="Status" value={request.status} />
          <Detail label="Restaurant" value={request.restaurant_id} />
          <Detail label="Requested by" value={request.requested_by} />
          <Detail label="Rail" value={request.rail} />
          <Detail
            label="Destination holder"
            value={String(destination.account_holder_name || "Missing")}
          />
          <Detail
            label="Destination bank"
            value={String(destination.bank_name || "Not applicable")}
          />
          <Detail
            label="Destination account"
            value={String(
              destination.account_number ||
                destination.aba_account_id ||
                "Missing",
            )}
          />
          <Detail label="Request ID" value={request.id} />
          {request.processing_by ? (
            <Detail label="Claimed by" value={request.processing_by} />
          ) : null}
          {request.reference ? (
            <Detail label="Transfer reference" value={request.reference} />
          ) : null}
        </Card>

        {claimedElsewhere ? (
          <Card
            role="alert"
            className="border-amber-500/30 bg-amber-500/10 p-3 text-sm"
          >
            <p className="font-semibold">Claimed by another reviewer</p>
            <p className="text-xs text-muted-foreground">
              Do not send a second transfer. Reviewer{" "}
              {shortId(request.processing_by)} owns this claim.
            </p>
          </Card>
        ) : null}

        {staleClaim && isAdminReviewer ? (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label htmlFor="stale-payout-release-note">
              Stale-claim release evidence
            </Label>
            <Textarea
              id="stale-payout-release-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="How finance confirmed no transfer was sent…"
              maxLength={1000}
              rows={3}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => onResolve("released")}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Release stale claim after confirming no transfer
            </Button>
          </div>
        ) : null}

        {request.note ? (
          <Card className="p-3 text-xs">
            <p className="font-semibold">Merchant note</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {request.note}
            </p>
          </Card>
        ) : null}

        {(canClaim || ownsClaim) && (
          <>
            <div className="space-y-2">
              <Label htmlFor="payout-finance-note">
                Internal finance evidence
              </Label>
              <Textarea
                id="payout-finance-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Review or transfer evidence. Restaurant owners receive separate generic status copy."
                maxLength={1000}
                rows={4}
              />
            </div>
            {ownsClaim ? (
              <div className="space-y-2">
                <Label htmlFor="payout-reference">
                  Settled transfer reference
                </Label>
                <Input
                  id="payout-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="ABA, bank, PayPal, or provider reference"
                  maxLength={160}
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => onResolve("rejected")}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
              {canClaim ? (
                <Button disabled={busy} onClick={() => onResolve("processing")}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock3 className="mr-2 h-4 w-4" />
                  )}
                  Claim transfer
                </Button>
              ) : (
                <div className="grid gap-2">
                  <Button disabled={busy} onClick={() => onResolve("paid")}>
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Mark paid
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => onResolve("released")}
                  >
                    Release unsent claim
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {["paid", "rejected", "failed", "cancelled"].includes(status) ? (
          <Card className="p-3 text-xs text-muted-foreground">
            This request is terminal and cannot be reopened.
          </Card>
        ) : null}
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}
