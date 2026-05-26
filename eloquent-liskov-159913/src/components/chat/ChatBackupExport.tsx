/**
 * ChatBackupExport — Export chat history as JSON/text
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Download from "lucide-react/dist/esm/icons/download";
import FileText from "lucide-react/dist/esm/icons/file-text";
import FileJson from "lucide-react/dist/esm/icons/file-json";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Check from "lucide-react/dist/esm/icons/check";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface ChatBackupExportProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
}

interface DirectMessageExportRow {
  message: string | null;
  sender_id: string;
  created_at: string;
  message_type: string | null;
}

export default function ChatBackupExport({ open, onClose, recipientId, recipientName }: ChatBackupExportProps) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async (fmt: "json" | "text") => {
    if (!user) return;
    setExporting(true);
    try {
      const { data, error } = await (supabase as any)
        .from("direct_messages" as any)
        .select("message, sender_id, created_at, message_type")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (error) throw error;
      const messages = (data ?? []) as DirectMessageExportRow[];

      let content: string;
      let mimeType: string;
      let extension: string;

      if (fmt === "json") {
        content = JSON.stringify(messages.map((m) => ({
          from: m.sender_id === user.id ? "You" : recipientName,
          message: m.message || `[${m.message_type}]`,
          time: m.created_at,
        })), null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        content = messages.map((m) => {
          const from = m.sender_id === user.id ? "You" : recipientName;
          const time = format(new Date(m.created_at), "MMM d, yyyy h:mm a");
          return `[${time}] ${from}: ${m.message || `[${m.message_type}]`}`;
        }).join("\n");
        mimeType = "text/plain";
        extension = "txt";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-${recipientName.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      setDone(true);
      toast.success("Chat exported successfully!");
      setTimeout(() => { setDone(false); onClose(); }, 1500);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background rounded-t-3xl pb-8"
          >
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold">Export Chat</h3>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Export your conversation with {recipientName} (up to 5,000 messages)
              </p>

              {done ? (
                <div className="flex flex-col items-center py-6">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                    <Check className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium">Exported!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button type="button"
                    onClick={() => handleExport("text")}
                    disabled={exporting}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">Plain Text (.txt)</p>
                      <p className="text-[11px] text-muted-foreground">Human-readable format</p>
                    </div>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  <button type="button"
                    onClick={() => handleExport("json")}
                    disabled={exporting}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <FileJson className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">JSON (.json)</p>
                      <p className="text-[11px] text-muted-foreground">Structured data format</p>
                    </div>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
