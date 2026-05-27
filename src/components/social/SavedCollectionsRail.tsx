import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Plus from "lucide-react/dist/esm/icons/plus";
import Folder from "lucide-react/dist/esm/icons/folder";
import X from "lucide-react/dist/esm/icons/x";
import { toast } from "sonner";
import {
  Dialog,
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
      <div className="border-b border-border/40 px-2 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {/* "All" pill */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              selectedId === null
                ? "bg-foreground text-background"
                : "bg-muted text-foreground hover:bg-muted/70"
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
              className={`group shrink-0 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                selectedId === c.id
                  ? "text-white"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
              style={selectedId === c.id ? { backgroundColor: c.color ?? "#3b82f6" } : undefined}
              title={`${c.itemCount} ${c.itemCount === 1 ? "post" : "posts"} — tap again to open, double-click to delete`}
            >
              <Folder className="h-3.5 w-3.5" style={{ color: selectedId === c.id ? "white" : c.color ?? "#3b82f6" }} />
              <span className="truncate max-w-[120px]">{c.name}</span>
              <span className={`text-[10px] ${selectedId === c.id ? "text-white/80" : "text-muted-foreground"}`}>
                {c.itemCount}
              </span>
            </button>
          ))}

          {/* New */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Group saved posts into a named folder.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={60}
                placeholder="e.g. Travel inspo"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Color</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setColor(s)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      color === s ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: s }}
                    aria-label={`Pick color ${s}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || create.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
