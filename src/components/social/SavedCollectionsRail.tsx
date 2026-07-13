import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Plus from "lucide-react/dist/esm/icons/plus";
import Folder from "lucide-react/dist/esm/icons/folder";
import Bookmark from "lucide-react/dist/esm/icons/bookmark";
import Check from "lucide-react/dist/esm/icons/check";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSavedCollections, type SavedCollection } from "@/hooks/useSavedCollections";

const SWATCHES = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function SavedCollectionsRail({ selectedId, onSelect }: Props) {
  const navigate = useNavigate();
  const { collections, isLoading, create, remove } = useSavedCollections();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[5]);
  const totalItems = collections.reduce((sum, collection) => sum + collection.itemCount, 0);
  const activeCollection = collections.find((collection) => collection.id === selectedId);
  const largestCollection = collections.reduce<SavedCollection | null>(
    (largest, collection) => (!largest || collection.itemCount > largest.itemCount ? collection : largest),
    null,
  );
  const organizedCount = collections.filter((collection) => collection.itemCount > 0).length;
  const libraryHealth = totalItems === 0
    ? "Ready to start"
    : organizedCount >= 3
      ? "Well organized"
      : organizedCount > 0
        ? "Taking shape"
        : "Needs folders";

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await create.mutateAsync({ name: trimmed, color });
      toast.success(`Collection "${trimmed}" created`);
      setName("");
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message?.includes("duplicate") ? "Name already used" : "Couldn't create");
    }
  }

  async function handleDelete(c: SavedCollection) {
    if (!confirm(`Delete collection "${c.name}"? Saved posts inside stay saved.`)) return;
    try {
      await remove.mutateAsync(c.id);
      if (selectedId === c.id) onSelect(null);
      toast.success("Collection deleted");
    } catch {
      toast.error("Couldn't delete");
    }
  }

  if (isLoading) return null;

  return (
    <>
      <div className="zivo-social-header-glass mx-2 my-2 rounded-[1.25rem] px-3 py-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <Bookmark className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-bold text-foreground">Saved collections</h3>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {activeCollection ? `${activeCollection.name} selected` : "Filter saved posts by folder"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="Create a new saved collection"
            className="zivo-social-chip-active flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <div className="mb-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <Bookmark className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black leading-none text-foreground">{totalItems}</p>
              <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Saved</p>
            </div>
          </div>
          <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${selectedId ? "bg-fuchsia-500/10 text-fuchsia-500" : "bg-muted text-muted-foreground"}`}>
              <Check className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black leading-none text-foreground">{selectedId ? "On" : "All"}</p>
              <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Filter</p>
            </div>
          </div>
          <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black leading-none text-foreground">
                {largestCollection ? largestCollection.itemCount : 0}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Top folder</p>
            </div>
          </div>
        </div>
        <div className="zivo-social-share-preview mb-2.5 flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Library focus</p>
            <p className="truncate text-sm font-bold text-foreground">
              {activeCollection
                ? activeCollection.name
                : largestCollection
                  ? `${largestCollection.name} leads your saved library`
                  : "All saved posts"}
            </p>
          </div>
          <span className="zivo-social-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-primary">
            {activeCollection ? `${activeCollection.itemCount} saved` : `${totalItems} total`}
          </span>
        </div>
        <div className="zivo-social-module-tile mb-2.5 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Gauge className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Library health
              </span>
              <span className="block truncate text-xs font-black text-foreground">{libraryHealth}</span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Folder className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Active folders
              </span>
              <span className="block truncate text-xs font-black text-foreground">{organizedCount}/{collections.length || 0}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {/* "All" pill */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label="Show all saved posts"
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition-all active:scale-95 ${
              selectedId === null
                ? "bg-foreground text-background"
                : "zivo-social-chip text-foreground"
            }`}
          >
            All saved
          </button>

          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                // Tap once: filter; tap again on same chip: open detail page.
                if (selectedId === c.id) navigate(`/saved-collections/${c.id}`);
                else onSelect(c.id);
              }}
              onDoubleClick={() => handleDelete(c)}
              aria-label={
                selectedId === c.id
                  ? `Open ${c.name} collection with ${c.itemCount} saved posts`
                  : `Filter saved posts by ${c.name}, ${c.itemCount} saved posts`
              }
              className={`group flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition-all hover:-translate-y-0.5 active:scale-95 ${
                selectedId === c.id
                  ? "text-white shadow-lg"
                  : "zivo-social-chip text-foreground"
              }`}
              style={selectedId === c.id ? { backgroundColor: c.color ?? "#3b82f6", boxShadow: `0 16px 34px ${c.color ?? "#3b82f6"}33` } : undefined}
              title={`${c.itemCount} ${c.itemCount === 1 ? "post" : "posts"} — tap again to open, double-click to delete`}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70"
                style={selectedId === c.id ? { backgroundColor: "rgba(255,255,255,0.2)" } : undefined}
              >
                {selectedId === c.id ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Folder className="h-3.5 w-3.5" style={{ color: c.color ?? "#3b82f6" }} />
                )}
              </span>
              <span className="truncate max-w-[120px]">{c.name}</span>
              <span className={`text-[10px] ${selectedId === c.id ? "text-white/80" : "text-muted-foreground"}`}>
                {c.itemCount}
              </span>
            </button>
          ))}

        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent hideClose className="zivo-social-sheet-panel overflow-hidden border-0 p-0 sm:max-w-md">
          <div className="px-3 pt-3">
            <DialogHeader className="zivo-social-header-glass rounded-[1.25rem] px-4 py-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="flex items-center gap-3 text-base font-bold">
                  <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <Folder className="h-4 w-4 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">New collection</span>
                    <DialogDescription className="block truncate text-[11px] font-medium text-muted-foreground">
                      Group saved posts into a named folder.
                    </DialogDescription>
                  </span>
                </DialogTitle>
                <DialogClose
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-1 ring-black/10 transition-all hover:opacity-90 active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={60}
                placeholder="e.g. Travel inspo"
                aria-label="Collection name"
                className="zivo-social-sheet-input mt-1 w-full rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
                <span>{name.trim() ? "Ready to create" : "Name required"}</span>
                <span>{name.length}/60</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Color</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setColor(s)}
                    className={`h-8 w-8 rounded-full border-2 shadow-sm transition-transform active:scale-95 ${
                      color === s ? "border-foreground scale-110 ring-2 ring-primary/20" : "border-white/70"
                    }`}
                    style={{ backgroundColor: s }}
                    aria-label={`Pick color ${s}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="zivo-social-comment-footer grid grid-cols-2 gap-2 px-5 py-3 sm:flex sm:gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="zivo-social-chip min-h-[40px] rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || create.isPending}
              className="min-h-[40px] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
