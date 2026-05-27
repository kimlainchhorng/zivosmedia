/**
 * DeletionReturnDialog — Auto-shown after sign-in if the user has a pending deletion.
 * Offers a one-tap "Cancel deletion" so logging back in effectively reverses the request.
 */
import { useEffect, useState } from "react";
import { Heart, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SHOWN_KEY = "zivo_deletion_return_shown";

export default function DeletionReturnDialog() {
  const { user } = useAuth();
  const { hasPendingDeletion, daysRemaining, cancelDeletion, isCancelling, isLoading } = useAccountDeletion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !user || !hasPendingDeletion) return;
    const key = `${SHOWN_KEY}_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setOpen(true);
  }, [user, hasPendingDeletion, isLoading]);

  const handleCancel = async () => {
    try {
      await cancelDeletion();
      toast.success("Welcome back! Your account is safe.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome back!</DialogTitle>
          <DialogDescription className="text-center">
            Your account is scheduled for deletion in{" "}
            <strong className="text-foreground">{daysRemaining} {daysRemaining === 1 ? "day" : "days"}</strong>.
            Would you like to cancel and keep your account?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCancel} disabled={isCancelling} className="gap-1.5">
            {isCancelling ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Keep my account</>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Continue with deletion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
