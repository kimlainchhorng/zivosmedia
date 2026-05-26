/**
 * ChatSecurity — Block/report users, message retention controls, E2E encryption indicator
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, ShieldCheck, Ban, Flag, Trash2, Clock, Lock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatSecurityProps {
  open: boolean;
  onClose: () => void;
  chatPartnerId: string;
  chatPartnerName: string;
  onBlock?: () => void;
}

const REPORT_REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Inappropriate content",
  "Impersonation",
  "Threatening behavior",
  "Other",
];

const RETENTION_OPTIONS = [
  { days: 0, label: "Keep forever" },
  { days: 1, label: "1 day" },
  { days: 7, label: "1 week" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

type BlockedUserRow = {
  id: string;
};

type ChatSettingsRow = {
  retention_days: number | null;
};

const dbFrom = (table: string): any => (supabase as any).from(table);

export default function ChatSecurity({ open, onClose, chatPartnerId, chatPartnerName, onBlock }: ChatSecurityProps) {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [retentionDays, setRetentionDays] = useState(0);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    const load = async () => {
      // Check if blocked
      const { data: blockDataRaw } = await dbFrom("blocked_users")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", chatPartnerId)
        .maybeSingle();
      const blockData = blockDataRaw as BlockedUserRow | null;
      setIsBlocked(!!blockData);

      // Load retention setting
      const { data: settingsRaw } = await dbFrom("chat_settings")
        .select("retention_days")
        .eq("user_id", user.id)
        .eq("chat_partner_id", chatPartnerId)
        .maybeSingle();
      const settings = settingsRaw as ChatSettingsRow | null;
      if (settings) setRetentionDays(settings.retention_days || 0);
    };
    load();
  }, [open, user?.id, chatPartnerId]);

  const handleBlock = async () => {
    if (!user?.id) return;
    if (isBlocked) {
      await dbFrom("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", chatPartnerId);
      setIsBlocked(false);
      toast.success(`${chatPartnerName} unblocked`);
    } else {
      await dbFrom("blocked_users").insert({ blocker_id: user.id, blocked_id: chatPartnerId });
      setIsBlocked(true);
      toast.success(`${chatPartnerName} blocked`);
      onBlock?.();
    }
    setShowBlockConfirm(false);
  };

  const handleReport = async () => {
    if (!reportReason) { toast.error("Select a reason"); return; }
    await dbFrom("user_reports").insert({
      reporter_id: user!.id,
      reported_id: chatPartnerId,
      reason: reportReason,
      details: reportDetails || null,
    });
    toast.success("Report submitted — our team will review it");
    setShowReportForm(false);
    setReportReason("");
    setReportDetails("");
  };

  const handleRetention = async (days: number) => {
    setRetentionDays(days);
    await dbFrom("chat_settings")
      .upsert({
        user_id: user!.id,
        chat_partner_id: chatPartnerId,
        retention_days: days,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,chat_partner_id" });
    toast.success(days === 0 ? "Messages will be kept forever" : `Messages older than ${days} days will be auto-deleted`);
  };

  const handleClearChat = async () => {
    await dbFrom("direct_messages")
      .delete()
      .eq("sender_id", user!.id)
      .eq("receiver_id", chatPartnerId);
    toast.success("Your messages have been cleared");
    setShowClearConfirm(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative bg-background rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-background/95 backdrop-blur-xl z-10 px-5 pt-5 pb-3 border-b border-border/30 pt-safe">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Privacy & Security
              </h3>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Encryption indicator */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Messages are encrypted</p>
                <p className="text-[10px] text-muted-foreground">Your messages are secured in transit with TLS encryption</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>

            {/* Message Retention */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Message Retention
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {RETENTION_OPTIONS.map((opt) => (
                  <button type="button"
                    key={opt.days}
                    onClick={() => handleRetention(opt.days)}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      retentionDays === opt.days ? "border-primary bg-primary/10 text-primary" : "border-border/30 text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Block user */}
            <button type="button"
              onClick={() => isBlocked ? handleBlock() : setShowBlockConfirm(true)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                isBlocked ? "border-destructive/30 bg-destructive/5" : "border-border/30 hover:bg-muted/30"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isBlocked ? "bg-destructive/10" : "bg-muted"
              }`}>
                <Ban className={`w-5 h-5 ${isBlocked ? "text-destructive" : "text-muted-foreground"}`} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-foreground">{isBlocked ? "Unblock" : "Block"} {chatPartnerName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isBlocked ? "This user is currently blocked" : "They won't be able to message you"}
                </p>
              </div>
            </button>

            {/* Report */}
            <button type="button"
              onClick={() => setShowReportForm(!showReportForm)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/30 hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-foreground">Report {chatPartnerName}</p>
                <p className="text-[10px] text-muted-foreground">Report inappropriate behavior</p>
              </div>
            </button>

            {showReportForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <button type="button"
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                        reportReason === reason ? "border-primary bg-primary/10 text-primary font-medium" : "border-border/30 text-foreground"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Additional details (optional)"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full h-20 px-3 py-2 rounded-xl border border-border/40 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                />
                <button type="button" onClick={handleReport} className="w-full h-10 rounded-xl bg-amber-500 text-white text-sm font-semibold">
                  Submit Report
                </button>
              </motion.div>
            )}

            {/* Clear chat */}
            <button type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-destructive/20 hover:bg-destructive/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-destructive">Clear Chat History</p>
                <p className="text-[10px] text-muted-foreground">Delete all your sent messages</p>
              </div>
            </button>
          </div>

          {/* Block confirmation */}
          <AnimatePresence>
            {showBlockConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 rounded-t-3xl"
              >
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7 text-destructive" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">Block {chatPartnerName}?</h4>
                  <p className="text-xs text-muted-foreground">They won't be able to send you messages or see your online status.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowBlockConfirm(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-semibold text-foreground">
                      Cancel
                    </button>
                    <button type="button" onClick={handleBlock} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">
                      Block
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear confirmation */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 rounded-t-3xl"
              >
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <Trash2 className="w-7 h-7 text-destructive" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">Clear all messages?</h4>
                  <p className="text-xs text-muted-foreground">This will delete all messages you sent in this conversation. This can't be undone.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowClearConfirm(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-semibold text-foreground">
                      Cancel
                    </button>
                    <button type="button" onClick={handleClearChat} className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold">
                      Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
