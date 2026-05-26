/**
 * AffiliateLinkSheet — generate a shareable affiliate link with click + earnings tracking.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import X from "lucide-react/dist/esm/icons/x";
import Copy from "lucide-react/dist/esm/icons/copy";

export const AFFILIATE_OPEN_EVENT = "zivo:affiliate-open";

export interface AffiliateOpenDetail {
  targetUrl: string;
  category?: string;
}

export function openAffiliateSheet(detail: AffiliateOpenDetail) {
  window.dispatchEvent(new CustomEvent<AffiliateOpenDetail>(AFFILIATE_OPEN_EVENT, { detail }));
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) + "-" + Math.random().toString(36).slice(2, 6);

export default function AffiliateLinkSheet() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<AffiliateOpenDetail | null>(null);
  const [shortUrl, setShortUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { setDetail((e as CustomEvent<AffiliateOpenDetail>).detail); setShortUrl(""); setOpen(true); };
    window.addEventListener(AFFILIATE_OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(AFFILIATE_OPEN_EVENT, handler as EventListener);
  }, []);

  const generate = async () => {
    if (!user?.id || !detail) return;
    setBusy(true);
    try {
      const slug = slugify(user.email?.split("@")[0] || "u");
      const { error } = await (dbFrom("affiliate_links") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
        owner_id: user.id, slug, target_url: detail.targetUrl, category: detail.category,
      });
      if (error) throw error;
      setShortUrl(`${window.location.origin}/r/${slug}`);
    } catch {
      toast.error("Couldn't create link");
    }
    setBusy(false);
  };

  const copy = async () => {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Copied — share it anywhere");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm">
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl pb-[max(1rem,var(--zivo-safe-bottom,0px))] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/30">
              <h3 className="text-base font-bold">Share & earn</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-9 w-9 -mr-1.5 flex items-center justify-center rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">Generate a personalized link — earn rewards when friends book through it.</p>
              {!shortUrl ? (
                <button type="button" onClick={() => void generate()} disabled={busy} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
                  {busy ? "Creating…" : "Generate my link"}
                </button>
              ) : (
                <>
                  <div className="rounded-xl bg-muted/40 p-3 break-all font-mono text-sm">{shortUrl}</div>
                  <button type="button" onClick={() => void copy()} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                    <Copy className="w-4 h-4" />Copy link
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
