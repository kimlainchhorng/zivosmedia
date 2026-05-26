/**
 * SavedPostsLink — small horizontal pill linking to /saved when the user
 * has at least one bookmark. Self-hides when the count is 0 so brand-new
 * users don't see a useless prompt.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function SavedPostsLink() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["saved-posts-count", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) return 0;
      const [legacy, modern] = await Promise.all([
        (supabase as any)
          .from("bookmarks")
          .select("item_id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("item_type", "post"),
        (supabase as any)
          .from("post_bookmarks")
          .select("post_id, source", { count: "exact" })
          .eq("user_id", user.id),
      ]);
      const unique = new Set<string>();
      for (const row of legacy.data || []) unique.add(String(row.item_id).replace(/^u-/, ""));
      for (const row of modern.data || []) unique.add(`${row.source}:${row.post_id}`);
      return unique.size || legacy.count || modern.count || 0;
    },
  });

  if (!user || count <= 0) return null;

  return (
    <Link
      to="/saved"
      className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-full bg-card border border-border/40 px-3 py-2 active:scale-[0.98] transition-transform"
    >
      <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bookmark className="h-3.5 w-3.5 text-primary" />
      </span>
      <span className="flex-1 text-[12px] font-medium text-foreground">
        {count === 1 ? "1 saved post" : `${count} saved posts`}
        <span className="text-muted-foreground font-normal"> · tap to view</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
