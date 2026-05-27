/**
 * StoryHighlights — Pinned story highlight circles on profile
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface StoryHighlightsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function StoryHighlights({ userId, isOwnProfile }: StoryHighlightsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: highlights = [] } = useQuery({
    queryKey: ["story-highlights", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("story_highlights")
        .select("id, title, cover_url, sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const createHighlight = async () => {
    if (!user || !newTitle.trim()) return;
    await (supabase as any).from("story_highlights").insert({
      user_id: user.id,
      title: newTitle.trim(),
    });
    queryClient.invalidateQueries({ queryKey: ["story-highlights"] });
    setNewTitle("");
    setShowCreate(false);
    toast.success("Highlight created");
  };

  if (highlights.length === 0 && !isOwnProfile) return null;

  return (
    <div className="py-3">
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
        {/* Add new */}
        {isOwnProfile && (
          <button type="button"
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">New</span>
          </button>
        )}

        {highlights.map((h: any) => (
          <button type="button"
            key={h.id}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="h-16 w-16 rounded-full border-2 border-border/60 overflow-hidden bg-muted/30 flex items-center justify-center">
              {h.cover_url ? (
                <img src={h.cover_url} alt={h.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">📌</span>
              )}
            </div>
            <span className="text-[10px] text-foreground font-medium max-w-[64px] truncate">{h.title}</span>
          </button>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div className="bg-background rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">New Highlight</h3>
              <button type="button" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></button>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Highlight name..."
              className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button type="button"
              onClick={createHighlight}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Create
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
