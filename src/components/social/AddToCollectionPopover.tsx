import { useEffect, useState } from "react";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus";
import Check from "lucide-react/dist/esm/icons/check";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import BookmarkPlus from "lucide-react/dist/esm/icons/bookmark-plus";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import { cn } from "@/lib/utils";

interface Props {
  bookmarkId: string;
  className?: string;
}

export default function AddToCollectionPopover({ bookmarkId, className }: Props) {
  const { collections, addBookmark, removeBookmark } = useSavedCollections();
  const [open, setOpen] = useState(false);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCount = memberIds.size;
  const queryText = query.trim().toLowerCase();
  const filteredCollections = queryText
    ? collections.filter((collection) => collection.name.toLowerCase().includes(queryText))
    : collections;
  const searchActive = queryText.length > 0;
  const organizationSignal =
    selectedCount > 1
      ? { label: "Well filed", detail: "Saved across collections", width: "100%" }
      : selectedCount === 1
        ? { label: "Filed once", detail: "Easy to find later", width: "62%" }
        : { label: "Unsorted", detail: "Choose a collection", width: "24%" };

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }

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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn("zivo-social-icon-button flex items-center justify-center rounded-full transition-transform active:scale-95", className)}
          aria-label="Add to collection"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="zivo-social-sheet-panel w-72 rounded-[1.5rem] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zivo-social-header-glass mb-2 flex items-center gap-2 rounded-[1.25rem] px-3 py-2.5">
          <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl">
            <BookmarkPlus className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">Save to collection</p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {selectedCount > 0
                ? `Saved in ${selectedCount} ${selectedCount === 1 ? "folder" : "folders"}`
                : collections.length > 0
                  ? `${collections.length} collection${collections.length === 1 ? "" : "s"} available`
                  : "Organize saved posts"}
            </p>
          </div>
          <span className="zivo-social-chip flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black text-primary">
            {selectedCount}
          </span>
        </div>
        {collections.length > 0 && !loading && (
          <>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Layers3 className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{collections.length}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Folders</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{selectedCount}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Selected</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{filteredCollections.length}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Shown</p>
                </div>
              </div>
            </div>
            <div className="zivo-social-search relative mb-2 rounded-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search collections"
                aria-label="Search saved collections"
                className="h-10 w-full rounded-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="zivo-social-module-tile mb-2 rounded-[1.25rem] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">{organizationSignal.label}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">{organizationSignal.detail}</p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Library
                </span>
              </div>
              <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-fuchsia-500 transition-[width] duration-300"
                  style={{ width: organizationSignal.width }}
                />
              </div>
            </div>
          </>
        )}
        {loading ? (
          <div className="zivo-social-module flex flex-col items-center justify-center rounded-[1.25rem] py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="mt-2 text-[11px] font-semibold">Checking collections</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="zivo-social-module flex flex-col items-center rounded-[1.25rem] px-4 py-6 text-center">
            <span className="zivo-social-share-orb mb-2 flex h-10 w-10 items-center justify-center rounded-2xl">
              <FolderPlus className="h-4 w-4 text-primary" />
            </span>
            <p className="text-xs font-semibold text-foreground">No collections yet</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Create one from the saved rail, then add posts here.
            </p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="zivo-social-module flex flex-col items-center rounded-[1.25rem] px-4 py-6 text-center">
            <span className="zivo-social-share-orb mb-2 flex h-10 w-10 items-center justify-center rounded-2xl">
              <Search className="h-4 w-4 text-primary" />
            </span>
            <p className="text-xs font-semibold text-foreground">No collection found</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {searchActive ? "Try another folder name." : "Your collections will appear here."}
            </p>
          </div>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-0.5 scrollbar-none">
            {filteredCollections.map((c) => {
              const isMember = memberIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    aria-label={`${isMember ? "Remove from" : "Save to"} ${c.name}`}
                    className={cn(
                      "zivo-social-sheet-row flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-sm transition-all hover:-translate-y-0.5 active:scale-[0.99]",
                      isMember && "ring-1 ring-primary/25",
                    )}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/70 shadow-sm"
                      style={{ backgroundColor: c.color ?? "#3b82f6" }}
                    >
                      {isMember && <Check className="h-4 w-4 text-white drop-shadow" />}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {isMember ? "Saved here" : "Tap to add"}
                      </span>
                    </span>
                    <span className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      isMember ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/25",
                    )}>
                      {isMember && <Check className="h-3.5 w-3.5" />}
                    </span>
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
