/**
 * SavedCollectionPage — `/saved-collections/:id`
 * Detail view for a single Saved Collection. Shows the collection's posts as
 * an Instagram-style grid with a header carrying the collection name + color.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Folder from "lucide-react/dist/esm/icons/folder";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Play from "lucide-react/dist/esm/icons/play";
import Image from "lucide-react/dist/esm/icons/image";

import ReelThumbnail from "@/components/social/ReelThumbnail";
import { useSavedCollections } from "@/hooks/useSavedCollections";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CollectionTile {
  joinId: string;
  bookmarkId: string;
  postId: string;
  source: "store" | "user";
  caption: string | null;
  thumbnail: string | null;
  isVideo: boolean;
  feedHref: string;
}

interface CollectionMeta {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export default function SavedCollectionPage() {
  const navigate = useNavigate();
  const { id: collectionId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { rename, remove } = useSavedCollections();
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Collection metadata.
  const { data: meta, isLoading: metaLoading } = useQuery<CollectionMeta | null>({
    queryKey: ["saved-collection-meta", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("saved_collections")
        .select("id, name, color, created_at")
        .eq("id", collectionId)
        .maybeSingle();
      if (error) throw error;
      return data as CollectionMeta | null;
    },
  });

  useEffect(() => {
    if (meta?.name) setNewName(meta.name);
  }, [meta?.name]);

  // Tiles in this collection (resolves bookmark → post → thumbnail).
  const { data: tiles = [], isLoading: tilesLoading, refetch } = useQuery<CollectionTile[]>({
    queryKey: ["saved-collection-tiles", collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data: joins, error } = await (supabase as any)
        .from("saved_collection_posts")
        .select(
          "id, post_bookmark_id, sort_order, created_at, post_bookmarks(id, post_id, source)",
        )
        .eq("collection_id", collectionId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = (joins ?? []).filter((r: any) => r.post_bookmarks);
      const storeIds = rows.filter((r: any) => r.post_bookmarks.source === "store").map((r: any) => r.post_bookmarks.post_id);
      const userIds = rows.filter((r: any) => r.post_bookmarks.source === "user").map((r: any) => r.post_bookmarks.post_id);

      const [{ data: storePosts }, { data: userPosts }] = await Promise.all([
        storeIds.length
          ? supabase.from("store_posts").select("id, caption, media_urls, media_type").in("id", storeIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? (supabase as any).from("user_posts").select("id, caption, media_url, media_urls, media_type").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const storeMap = new Map<string, any>((storePosts ?? []).map((p: any) => [p.id, p]));
      const userMap = new Map<string, any>((userPosts ?? []).map((p: any) => [p.id, p]));

      return rows.map((r: any): CollectionTile | null => {
        const src: "store" | "user" = r.post_bookmarks.source;
        const postId: string = r.post_bookmarks.post_id;
        const post = src === "store" ? storeMap.get(postId) : userMap.get(postId);
        if (!post) return null;
        const urls: string[] = Array.isArray(post.media_urls) && post.media_urls.length > 0
          ? post.media_urls
          : post.media_url ? [post.media_url] : [];
        return {
          joinId: r.id,
          bookmarkId: r.post_bookmark_id,
          postId,
          source: src,
          caption: post.caption ?? null,
          thumbnail: urls[0] ?? null,
          isVideo: post.media_type === "video" || post.media_type === "reel",
          feedHref: src === "store" ? `/feed?post=${postId}` : `/feed?post=u-${postId}`,
        };
      }).filter((t): t is CollectionTile => t !== null);
    },
  });

  async function handleRemoveFromCollection(joinId: string) {
    try {
      await (supabase as any).from("saved_collection_posts").delete().eq("id", joinId);
      toast.success("Removed from collection");
      refetch();
      qc.invalidateQueries({ queryKey: ["saved-collections"] });
    } catch {
      toast.error("Couldn't remove");
    }
  }

  async function handleRename() {
    const trimmed = newName.trim();
    if (!trimmed || !collectionId || trimmed === meta?.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await rename.mutateAsync({ id: collectionId, name: trimmed });
      toast.success("Collection renamed");
      setRenameOpen(false);
      qc.invalidateQueries({ queryKey: ["saved-collection-meta", collectionId] });
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Name already used" : "Couldn't rename");
    }
  }

  async function handleDelete() {
    if (!collectionId) return;
    if (!confirm(`Delete collection "${meta?.name ?? "this collection"}"? Saved posts inside stay saved.`)) return;
    try {
      await remove.mutateAsync(collectionId);
      toast.success("Collection deleted");
      navigate("/saved-posts", { replace: true });
    } catch {
      toast.error("Couldn't delete");
    }
  }

  if (!collectionId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Missing collection id
      </div>
    );
  }

  const color = meta?.color ?? "#3b82f6";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/40 bg-background/95 px-3 py-3 backdrop-blur"
        style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}22` }}
          >
            <Folder className="h-4 w-4" style={{ color }} />
          </div>
          <h1 className="truncate text-lg font-bold text-foreground">
            {metaLoading ? "…" : (meta?.name ?? "Collection")}
          </h1>
          <span className="ml-1 text-sm text-muted-foreground">
            {tiles.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRenameOpen(true)}
          disabled={!meta}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"
          aria-label="Rename collection"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!meta}
          className="rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"
          aria-label="Delete collection"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      {tilesLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : tiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          <Folder className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold">This collection is empty</p>
          <p className="text-sm text-muted-foreground">
            Open your saved posts and tap the folder icon to add posts here.
          </p>
          <button
            type="button"
            onClick={() => navigate("/saved-posts")}
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Browse saved
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 max-w-7xl mx-auto">
          {tiles.map((tile) => (
            <motion.div
              key={tile.joinId}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]"
            >
              {tile.thumbnail ? (
                tile.isVideo ? (
                  <ReelThumbnail url={tile.thumbnail} className="group-hover:scale-105" />
                ) : (
                  <img
                    src={tile.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}

              {tile.isVideo && (
                <div className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white text-white" />
                </div>
              )}

              {tile.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 text-white">
                  <p className="line-clamp-2 text-[11px] leading-tight">{tile.caption}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate(tile.feedHref)}
                className="absolute inset-0 cursor-pointer focus:outline-none"
                aria-label={`Open: ${tile.caption ?? "post"}`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromCollection(tile.joinId);
                }}
                className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500/90 p-2 text-white shadow-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity active:scale-90"
                aria-label="Remove from collection"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename collection</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            maxLength={60}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRename}
              disabled={!newName.trim() || newName.trim() === meta?.name || rename.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {rename.isPending ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
