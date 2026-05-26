/**
 * DraftsPage — View and manage post drafts & scheduled posts
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Clock, Trash2, Send, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

type DraftTab = "drafts" | "scheduled";

export default function DraftsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DraftTab>("drafts");

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["post-drafts", user?.id, activeTab],
    queryFn: async () => {
      if (!user) return [];
      const query = (supabase as any)
        .from("post_drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", activeTab === "drafts" ? "draft" : "scheduled")
        .order("updated_at", { ascending: false });
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const deleteDraft = async (id: string) => {
    await (supabase as any).from("post_drafts").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["post-drafts"] });
    toast.success("Draft deleted");
  };

  const publishDraft = async (draft: any) => {
    // Move to user_posts
    await (supabase as any).from("user_posts").insert({
      user_id: user!.id,
      caption: draft.caption,
      media_url: draft.media_urls?.[0] || null,
      media_type: draft.media_type || "image",
      filter_css: draft.filter_css,
      is_published: true,
    });
    await (supabase as any).from("post_drafts").delete().eq("id", draft.id);
    queryClient.invalidateQueries({ queryKey: ["post-drafts"] });
    toast.success("Post published!");
  };

  return (
    <div className="zivo-shell-mobile bg-background pb-20">
      <div className="zivo-sticky-mobile-header safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Drafts & Scheduled</h1>
        </div>
        <div className="flex gap-1 px-4 pb-2">
          {(["drafts", "scheduled"] as DraftTab[]).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeTab === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
              )}
            >
              {t === "drafts" ? <FileText className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
              {t === "drafts" ? "Drafts" : "Scheduled"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin mx-auto mt-12 text-muted-foreground" />}
        {!isLoading && drafts.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No {activeTab} yet</p>
          </div>
        )}
        <AnimatePresence>
          {drafts.map((d: any) => (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="p-4 rounded-xl bg-card border border-border/40"
            >
              <p className="text-sm text-foreground line-clamp-2 mb-2">{d.caption || "(No caption)"}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {d.publish_at ? `Scheduled: ${new Date(d.publish_at).toLocaleDateString()}` : `Updated ${formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}`}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => publishDraft(d)} aria-label="Publish draft" title="Publish draft" className="p-2 rounded-full hover:bg-primary/10">
                    <Send className="h-4 w-4 text-primary" />
                  </button>
                  <button type="button" onClick={() => deleteDraft(d.id)} aria-label="Delete draft" title="Delete draft" className="p-2 rounded-full hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ZivoMobileNav />
    </div>
  );
}
