import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NativeBackButton from "@/components/shared/NativeBackButton";
import { cn } from "@/lib/utils";
import { readCarDealershipCustomerAccessToken } from "@/lib/carDealershipCustomerAccess";

const supabase: any = typedSupabase;

type TestDriveStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

interface CustomerTestDrive {
  id: string;
  store_id: string;
  vehicle_label: string;
  scheduled_at: string;
  duration_minutes: number;
  status: TestDriveStatus;
  cancellation_reason: string | null;
  store_name: string;
  store_slug: string;
  store_logo_url: string | null;
  store_address: string | null;
  store_phone: string | null;
}

type LoadState = "loading" | "ready" | "unavailable";

const firstRow = (data: unknown) => {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as CustomerTestDrive) : null;
};

const STATUS_LABEL: Record<TestDriveStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_STYLE: Record<TestDriveStatus, string> = {
  scheduled:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  confirmed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  in_progress:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "border-border bg-muted text-muted-foreground",
  cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
  no_show:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

export default function PublicCarDealershipTestDrivePage() {
  const { slug, testDriveId } = useParams<{
    slug: string;
    testDriveId: string;
  }>();
  const [accessToken] = useState(() =>
    testDriveId
      ? readCarDealershipCustomerAccessToken(
          "test-drive",
          testDriveId,
          "manage",
        )
      : null,
  );
  const [testDrive, setTestDrive] = useState<CustomerTestDrive | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadTestDrive = useCallback(async () => {
    if (!slug || !testDriveId) {
      setLoadState("unavailable");
      return;
    }

    setLoadState("loading");
    const { data, error } = await supabase.rpc(
      "car_dealership_customer_get_test_drive",
      {
        p_test_drive_id: testDriveId,
        p_access_token: accessToken,
      },
    );
    const row = firstRow(data);
    if (error || !row || row.id !== testDriveId || row.store_slug !== slug) {
      setTestDrive(null);
      setLoadState("unavailable");
      return;
    }

    setTestDrive(row);
    setLoadState("ready");
  }, [accessToken, slug, testDriveId]);

  useEffect(() => {
    void loadTestDrive();
  }, [loadTestDrive]);

  const handleCancel = async () => {
    if (!testDriveId) return;
    setCancelling(true);
    setCancelError(null);
    const { data, error } = await supabase.rpc(
      "car_dealership_customer_cancel_test_drive",
      {
        p_test_drive_id: testDriveId,
        p_access_token: accessToken,
        p_reason: cancelReason.trim() || null,
      },
    );
    const updated = firstRow(data);
    setCancelling(false);

    if (
      error ||
      !updated ||
      updated.id !== testDriveId ||
      updated.store_slug !== slug
    ) {
      setCancelError(
        "We couldn't cancel this test drive. Refresh the secure link or contact the dealership.",
      );
      return;
    }

    setTestDrive(updated);
    setCancelOpen(false);
    setCancelReason("");
  };

  const inventoryPath = slug ? `/car-dealership/${slug}` : "/";
  const currentPath =
    slug && testDriveId
      ? `/car-dealership/${slug}/test-drive/${testDriveId}`
      : "/";

  if (loadState === "loading") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background safe-area-top safe-area-bottom text-muted-foreground">
        <div className="flex items-center gap-2" role="status">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          Loading test drive…
        </div>
      </div>
    );
  }

  if (loadState === "unavailable" || !testDrive) {
    return (
      <div className="min-h-[100dvh] bg-background safe-area-top safe-area-bottom">
        <NativeBackButton
          to={inventoryPath}
          label="Back to dealership inventory"
        />
        <main className="mx-auto flex min-h-[100dvh] max-w-lg items-center px-4 py-10">
          <Card className="w-full space-y-4 p-6 text-center">
            <AlertTriangle className="mx-auto h-11 w-11 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Secure link unavailable
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This test-drive link is invalid or expired. Sign in if this
                appointment belongs to your account, or ask the dealership for a
                fresh secure link.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                asChild
                className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link to={`/login?redirect=${encodeURIComponent(currentPath)}`}>
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link to={inventoryPath}>Back to inventory</Link>
              </Button>
            </div>
            <Button
              asChild
              variant="ghost"
              className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/">Back to ZIVO Home</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const canCancel =
    testDrive.status === "scheduled" || testDrive.status === "confirmed";

  return (
    <div className="min-h-[100dvh] bg-background safe-area-bottom">
      <Helmet>
        <title>Test drive · {testDrive.store_name}</title>
      </Helmet>
      <NativeBackButton
        to={inventoryPath}
        label="Back to dealership inventory"
      />

      <header className="border-b border-border bg-card safe-area-top">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-11 min-h-11 w-11 min-w-11 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Link to={inventoryPath} aria-label="Back to dealership inventory">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          {testDrive.store_logo_url ? (
            <img
              src={testDrive.store_logo_url}
              alt=""
              className="h-11 w-11 rounded-xl object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">
              {testDrive.store_name}
            </p>
            <p className="text-xs text-muted-foreground">Your test drive</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Card className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Vehicle
              </p>
              <h1 className="mt-1 text-xl font-bold text-foreground">
                {testDrive.vehicle_label}
              </h1>
            </div>
            <Badge
              className={cn("shrink-0 border", STATUS_STYLE[testDrive.status])}
            >
              {STATUS_LABEL[testDrive.status]}
            </Badge>
          </div>

          <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatDate(testDrive.scheduled_at)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatTime(testDrive.scheduled_at)} ·{" "}
                  {testDrive.duration_minutes} min
                </p>
              </div>
            </div>
          </div>

          {testDrive.status === "cancelled" && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle className="h-4 w-4" /> Test drive cancelled
              </div>
              {testDrive.cancellation_reason && (
                <p className="mt-1 text-xs">{testDrive.cancellation_reason}</p>
              )}
            </div>
          )}

          {testDrive.status === "completed" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> This test drive is complete.
            </div>
          )}

          {canCancel && (
            <Button
              variant="outline"
              className="min-h-11 w-full border-destructive/30 text-destructive hover:bg-destructive/5 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                setCancelError(null);
                setCancelOpen(true);
              }}
            >
              Cancel test drive
            </Button>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-bold text-foreground">
            Dealership contact
          </h2>
          {testDrive.store_address && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {testDrive.store_address}
            </p>
          )}
          {testDrive.store_phone && (
            <Button
              asChild
              variant="outline"
              className="min-h-11 w-full focus-visible:ring-2 focus-visible:ring-ring"
            >
              <a href={`tel:${testDrive.store_phone}`}>
                <Phone className="mr-2 h-4 w-4" /> Call {testDrive.store_name}
              </a>
            </Button>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              asChild
              variant="outline"
              className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to={inventoryPath}>Back to inventory</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="min-h-11 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/">Back to ZIVO Home</Link>
            </Button>
          </div>
        </Card>
      </main>

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!cancelling) setCancelOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this test drive?</AlertDialogTitle>
            <AlertDialogDescription>
              The dealership will see the updated status immediately. A reason
              is optional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="test-drive-cancel-reason">Reason (optional)</Label>
            <Textarea
              id="test-drive-cancel-reason"
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(event.target.value.slice(0, 300))
              }
              placeholder="For example: My plans changed"
              rows={3}
              maxLength={300}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {cancelReason.length} / 300
            </p>
            {cancelError && (
              <p role="alert" className="text-sm text-destructive">
                {cancelError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling} className="min-h-11">
              Keep appointment
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelling}
              onClick={(event) => {
                event.preventDefault();
                void handleCancel();
              }}
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                  Cancelling…
                </>
              ) : (
                "Cancel test drive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
