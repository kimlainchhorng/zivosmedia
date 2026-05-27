/**
 * DeleteAccountFlow — Multi-step guided account deletion modal
 *
 * Steps:
 *  1. Reason — pick why they're leaving
 *  2. Alternatives — offer pause/quiet-mode/support based on reason
 *  3. Consequences — what gets deleted, what's retained, 30-day grace
 *  4. Verify — re-enter password + type DELETE
 *  5. Done — show pending state with countdown
 *
 * Cancellation: signing back in within 30 days auto-cancels deletion.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Trash2,
  PauseCircle, BellOff, MessageCircle, Shield, Clock, Database, CreditCard,
  Heart, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Step = "reason" | "alternatives" | "consequences" | "verify" | "done";

const REASONS = [
  { id: "too_much_time", label: "Spending too much time on the app", icon: Clock },
  { id: "not_useful", label: "Not useful for me anymore", icon: X },
  { id: "privacy", label: "Privacy or data concerns", icon: Shield },
  { id: "too_many_notifs", label: "Too many notifications", icon: BellOff },
  { id: "found_alternative", label: "Found a better alternative", icon: Heart },
  { id: "second_account", label: "I have another account", icon: Database },
  { id: "technical", label: "Technical issues / bugs", icon: AlertTriangle },
  { id: "other", label: "Other", icon: MessageCircle },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAccountFlow({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const { requestDeletion, isRequesting } = useAccountDeletion();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("reason");
  const [reasonId, setReasonId] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [acks, setAcks] = useState({ data: false, billing: false, irreversible: false });
  const [verifying, setVerifying] = useState(false);

  const reasonObj = REASONS.find((r) => r.id === reasonId);
  const allAcked = acks.data && acks.billing && acks.irreversible;
  const canConfirm = allAcked && confirmText.trim().toUpperCase() === "DELETE" && password.length >= 6;

  const reset = () => {
    setStep("reason");
    setReasonId("");
    setFeedback("");
    setConfirmText("");
    setPassword("");
    setAcks({ data: false, billing: false, irreversible: false });
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!user?.email) {
      toast.error("Not signed in");
      return;
    }
    setVerifying(true);
    try {
      // Re-verify password
      const { error: pwdError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (pwdError) {
        toast.error("Incorrect password");
        setVerifying(false);
        return;
      }

      const reasonPayload = JSON.stringify({
        reason: reasonId,
        reason_label: reasonObj?.label ?? "Unspecified",
        feedback: feedback.trim(),
        requested_from: "security_settings",
        ts: new Date().toISOString(),
      });

      await requestDeletion(reasonPayload);
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-4 h-4 text-destructive" />
              Delete account
            </DialogTitle>
            <span className="text-xs text-muted-foreground">
              {step === "reason" && "Step 1 of 4"}
              {step === "alternatives" && "Step 2 of 4"}
              {step === "consequences" && "Step 3 of 4"}
              {step === "verify" && "Step 4 of 4"}
              {step === "done" && "Done"}
            </span>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1 — Reason */}
            {step === "reason" && (
              <motion.div
                key="reason"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">Why are you leaving?</h3>
                  <p className="text-sm text-muted-foreground">
                    Your feedback helps us improve. This is optional but appreciated.
                  </p>
                </div>

                <RadioGroup value={reasonId} onValueChange={setReasonId} className="space-y-2">
                  {REASONS.map((r) => {
                    const Icon = r.icon;
                    const selected = reasonId === r.id;
                    return (
                      <label
                        key={r.id}
                        htmlFor={r.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={r.id} id={r.id} />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{r.label}</span>
                      </label>
                    );
                  })}
                </RadioGroup>

                {reasonId === "other" && (
                  <Textarea
                    placeholder="Tell us more..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                )}
                {reasonId && reasonId !== "other" && (
                  <Textarea
                    placeholder="Anything else you'd like to share? (optional)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    maxLength={500}
                    rows={2}
                  />
                )}
              </motion.div>
            )}

            {/* STEP 2 — Alternatives */}
            {step === "alternatives" && (
              <motion.div
                key="alt"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">Before you go…</h3>
                  <p className="text-sm text-muted-foreground">
                    Maybe one of these works better than deleting your account.
                  </p>
                </div>

                <div className="space-y-2">
                  {(reasonId === "too_much_time" || reasonId === "too_many_notifs") && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/account/notifications");
                      }}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/50 text-left"
                    >
                      <BellOff className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Mute notifications instead</p>
                        <p className="text-xs text-muted-foreground">Turn off pings without losing your data.</p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/account/privacy");
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/50 text-left"
                  >
                    <PauseCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Take a break (deactivate)</p>
                      <p className="text-xs text-muted-foreground">
                        Hide your profile temporarily. Reactivate anytime by signing in.
                      </p>
                    </div>
                  </button>

                  {(reasonId === "privacy" || reasonId === "technical") && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/support");
                      }}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/50 text-left"
                    >
                      <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Talk to support</p>
                        <p className="text-xs text-muted-foreground">
                          Let us help fix the issue before you go.
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  Still want to delete? You'll have <strong className="text-foreground">30 days to change your mind</strong> — just sign in again to cancel.
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Consequences */}
            {step === "consequences" && (
              <motion.div
                key="cons"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">What will happen</h3>
                  <p className="text-sm text-muted-foreground">
                    Please review carefully before continuing.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/40">
                    <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">30-day grace period</p>
                      <p className="text-muted-foreground">Your account is held — sign in anytime in 30 days to cancel.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/40">
                    <Database className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">Data permanently removed after 30 days</p>
                      <p className="text-muted-foreground">Profile, posts, messages, and preferences cannot be recovered.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/40">
                    <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">Active orders & subscriptions</p>
                      <p className="text-muted-foreground">Outstanding bookings must be settled. Active subscriptions will be cancelled.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-muted/40">
                    <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-foreground">Some data is retained by law</p>
                      <p className="text-muted-foreground">Tax, transaction, and fraud-prevention records (kept up to 7 years).</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={acks.data} onCheckedChange={(v) => setAcks((s) => ({ ...s, data: !!v }))} />
                    <span className="text-xs text-muted-foreground">I understand my profile, posts and messages will be deleted.</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={acks.billing} onCheckedChange={(v) => setAcks((s) => ({ ...s, billing: !!v }))} />
                    <span className="text-xs text-muted-foreground">I understand active subscriptions and bookings will be affected.</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={acks.irreversible} onCheckedChange={(v) => setAcks((s) => ({ ...s, irreversible: !!v }))} />
                    <span className="text-xs text-muted-foreground">I understand deletion is permanent after the 30-day grace period.</span>
                  </label>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Verify */}
            {step === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-4"
              >
                <div>
                  <h3 className="text-base font-semibold mb-1">Confirm it's you</h3>
                  <p className="text-sm text-muted-foreground">
                    For your security, re-enter your password and type DELETE to continue.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="del-pwd" className="text-xs">Your password</Label>
                    <Input
                      id="del-pwd"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="del-confirm" className="text-xs">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                    <Input
                      id="del-confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                      autoCapitalize="characters"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    You'll be signed out on this device. Sign back in within 30 days to cancel deletion.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 5 — Done */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Deletion scheduled</h3>
                  <p className="text-sm text-muted-foreground">
                    Your account will be permanently deleted in <strong className="text-foreground">30 days</strong>.
                    Sign in anytime before then to cancel.
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  We've sent a confirmation to <strong className="text-foreground">{user?.email}</strong>.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          {step === "reason" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
              <Button size="sm" onClick={() => setStep("alternatives")} disabled={!reasonId}>
                Continue <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </>
          )}
          {step === "alternatives" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("reason")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStep("consequences")}>
                Continue deleting
              </Button>
            </>
          )}
          {step === "consequences" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("alternatives")}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStep("verify")} disabled={!allAcked}>
                Continue
              </Button>
            </>
          )}
          {step === "verify" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("consequences")} disabled={verifying || isRequesting}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleSubmit}
                disabled={!canConfirm || verifying || isRequesting}
              >
                {verifying || isRequesting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Submitting…</>
                ) : (
                  <>Schedule deletion</>
                )}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              size="sm"
              className="ml-auto"
              onClick={async () => {
                handleClose(false);
                await signOut();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
