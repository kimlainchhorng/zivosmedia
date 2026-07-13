/**
 * BugReportSheet — quick bug report form. Opens via global event so the
 * shake-listener can summon it from anywhere in the app.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import X from "lucide-react/dist/esm/icons/x";
import Bug from "lucide-react/dist/esm/icons/bug";

export const BUG_REPORT_OPEN_EVENT = "zivo:bug-report-open";
export function openBugReport() { window.dispatchEvent(new Event(BUG_REPORT_OPEN_EVENT)); }

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function BugReportSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(BUG_REPORT_OPEN_EVENT, handler);
    return () => window.removeEventListener(BUG_REPORT_OPEN_EVENT, handler);
  }, []);

  const submit = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      await (dbFrom("bug_reports") as { insert: (p: unknown) => Promise<unknown> }).insert({
        user_id: user?.id ?? null,
        description: desc,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });
      toast.success("Thanks — we'll look into it");
      setDesc("");
      setOpen(false);
    } catch {
      toast.error("Couldn't send report");
    }
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))]">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <div className="flex items-center gap-2"><Bug className="w-5 h-5 text-primary" /><h3 className="text-base font-bold">Report a problem</h3></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <textarea
                autoFocus
                rows={5}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What went wrong? Screenshots help — but a clear description goes a long way."
                className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <button type="button" onClick={() => void submit()} disabled={busy || !desc.trim()} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                {busy ? "Sending…" : "Send report"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
