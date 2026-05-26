/**
 * CommentPreview — small "View N comments" line + the most-recent or
 * highest-engaged comment text under a feed post. Tapping opens the full
 * comment sheet.
 */
import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PreviewComment {
  authorName: string;
  text: string;
}

interface Props {
  postId: string;
  source: "store" | "user";
  totalCount: number;
  onOpen: () => void;
}

function CommentPreviewInner({ postId, source, totalCount, onOpen }: Props) {
  const [top, setTop] = useState<PreviewComment | null>(null);

  useEffect(() => {
    if (!postId || totalCount <= 0) {
      setTop(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Pull the most recent comment for the right table
      const table = source === "user" ? "user_post_comments" : "store_post_comments";
      const selectColumns = source === "user"
        ? "user_id, comment, created_at"
        : "user_id, content, created_at";
      const { data } = await (supabase as any)
        .from(table)
        .select(selectColumns)
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !data) return;

      // Comment column varies by table; pick whichever is non-null
      const text = data.comment ?? data.content ?? data.text ?? data.body ?? "";
      if (!text) return;

      let authorName = "User";
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", data.user_id)
          .maybeSingle();
        authorName = profile?.full_name ?? profile?.username ?? "User";
      }
      if (!cancelled) setTop({ authorName, text });
    })();

    return () => { cancelled = true; };
  }, [postId, source, totalCount]);

  if (totalCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="text-left text-white/85 active:opacity-70 max-w-[78%] py-1 -my-1 transition-opacity hover:opacity-100"
    >
      {top && (
        <p className="text-[12px] sm:text-[13px] md:text-sm leading-snug line-clamp-1 drop-shadow">
          <span className="font-semibold">{top.authorName}</span>{" "}
          <span className="opacity-90">{top.text}</span>
        </p>
      )}
      <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-white/60 drop-shadow">
        View {totalCount === 1 ? "1 comment" : `all ${totalCount} comments`}
      </p>
    </button>
  );
}

const CommentPreview = memo(CommentPreviewInner);
export default CommentPreview;
