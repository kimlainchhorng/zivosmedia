import { useEffect, useState } from "react";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus";
import Check from "lucide-react/dist/esm/icons/check";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useSavedCollections } from "@/hooks/useSavedCollections";

interface Props {
  bookmarkId: string;
  className?: string;
}

export default function AddToCollectionPopover({ bookmarkId, className }: Props) {
  const { collections, addBookmark, removeBookmark } = useSavedCollections();
  const [open, setOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .from("saved_collection_posts")
      .select("collection_id")
      .eq("post_bookmark_id", bookmarkId)
      .then(({ data }: any) => {
        if (cancelled) return;
        setMemberIds(new Set((data ?? []).map((r: any) => r.collection_id)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookmarkId]);

  async function toggle(collectionId: string) {
    const isMember = memberIds.has(collectionId);
    const next = new Set(memberIds);
    if (isMember) next.delete(collectionId);
    else next.add(collectionId);
    setMemberIds(next);
    try {
      if (isMember) {
        await removeBookmark.mutateAsync({ collectionId, postBookmarkId: bookmarkId });
      } else {
        await addBookmark.mutateAsync({ collectionId, postBookmarkId: bookmarkId });
      }
    } catch {
      // revert
      setMemberIds(memberIds);
      toast.error("Couldn't update collection");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={className}
          aria-label="Add to collection"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-60 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-2 pt-1 pb-2 text-xs font-semibold text-muted-foreground">
          Add to collection
        </p>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : collections.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No collections yet — create one from the rail at the top.
          </p>
        ) : (
          <ul className="max-h-60 overflow-y-auto">
            {collections.map((c) => {
              const isMember = memberIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color ?? "#3b82f6" }}
                    />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    {isMember && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
