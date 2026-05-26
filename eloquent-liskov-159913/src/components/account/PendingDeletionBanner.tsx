/**
 * PendingDeletionBanner — Shown when an account deletion request is pending.
 * Lets the user cancel the deletion in-place. Also auto-prompts on sign-in.
 */
import { useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PendingDeletionBanner() {
  const { deletionRequest, hasPendingDeletion, daysRemaining, cancelDeletion, isCancelling } = useAccountDeletion();
  const [dismissed, setDismissed] = useState(false);

  if (!hasPendingDeletion || !deletionRequest || dismissed) return null;

  const handleCancel = async () => {
    try {
      await cancelDeletion();
      toast.success("Account deletion cancelled. Welcome back!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  const scheduledDate = (() => {
    try {
      return format(new Date(deletionRequest.scheduled_for), "MMM d, yyyy");
    } catch {
      return "";
    }
  })();

  return (
    <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-destructive mb-0.5">
            Account deletion scheduled
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Your account will be permanently deleted in{" "}
            <strong className="text-foreground">{daysRemaining} {daysRemaining === 1 ? "day" : "days"}</strong>
            {scheduledDate && <> (on {scheduledDate})</>}. Cancel anytime to keep your account.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleCancel} disabled={isCancelling} className="gap-1.5">
              {isCancelling ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling…</>
              ) : (
                <><ShieldCheck className="w-3.5 h-3.5" /> Keep my account</>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="w-3.5 h-3.5 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
