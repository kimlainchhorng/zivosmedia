import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTwoStep } from "@/hooks/useTwoStep";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
  title?: string;
  description?: string;
}

/**
 * Re-auth dialog for sensitive actions when two-step is enabled.
 * If two-step is NOT enabled, calls onConfirmed immediately and closes.
 */
export default function ConfirmTwoStepDialog({
  open, onOpenChange, onConfirmed,
  title = "Confirm with two-step password",
  description = "Enter your two-step verification password to continue.",
}: Props) {
  const { isEnabled, row, verify } = useTwoStep();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-pass when not enabled
  if (open && !isEnabled) {
    onConfirmed();
    onOpenChange(false);
    return null;
  }

  const submit = async () => {
    setBusy(true);
    const ok = await verify(password);
    setBusy(false);
    if (!ok) { toast.error("Wrong password"); return; }
    setPassword("");
    onOpenChange(false);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          placeholder="Two-step password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {row?.hint && <div className="text-xs text-muted-foreground">Hint: {row.hint}</div>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || password.length < 1}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
