/**
 * ShareWatchlistPage — list of share links the user has saved.
 *
 * Mounted at /share/with-me. Pure-localStorage list (no backend) — the user
 * adds entries by tapping "Track this" on any public share page. Each row
 * deep-links back into the corresponding /share/trip/:id or /share/order/:id
 * with the label the user can rename inline.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Eye from "lucide-react/dist/esm/icons/eye";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShareWatchlist, type WatchlistEntry } from "@/hooks/useShareWatchlist";

export default function ShareWatchlistPage() {
  const navigate = useNavigate();
  const { entries, remove } = useShareWatchlist();

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/40 pt-safe">
        <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-primary" /> Sharing with me
            </div>
            <div className="text-lg font-extrabold text-foreground">Friends I'm tracking</div>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {entries.length} link{entries.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pt-5">
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {entries.map((e, i) => (
                <Row
                  key={`${e.kind}-${e.id}`}
                  entry={e}
                  delay={i * 0.02}
                  onOpen={() =>
                    navigate(
                      e.kind === "trip" ? `/share/trip/${e.id}` : `/share/order/${e.id}`,
                    )
                  }
                  onRemove={() => remove(e.kind, e.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border/50 p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
        <Eye className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-base font-bold text-foreground">No share links saved yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
        When a friend shares their ZIVO ride or food order with you, tap "Track this" on the page
        and it'll show up here so you can check back any time.
      </p>
    </div>
  );
}

function Row({
  entry,
  delay,
  onOpen,
  onRemove,
}: {
  entry: WatchlistEntry;
  delay: number;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.label ?? "");
  const Icon = entry.kind === "trip" ? Car : UtensilsCrossed;
  const tone =
    entry.kind === "trip"
      ? "bg-emerald-500/15 text-emerald-600"
      : "bg-orange-500/15 text-orange-600";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay }}
      className="rounded-2xl border border-border/50 bg-card p-3 flex items-center gap-3 shadow-sm"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              renameEntry(entry, draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                renameEntry(entry, draft);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder={entry.kind === "trip" ? "Friend's ride" : "Friend's order"}
            className="h-8 text-sm rounded-lg"
          />
        ) : (
          <div className="text-sm font-bold text-foreground truncate">
            {entry.label?.trim() ||
              (entry.kind === "trip" ? "Untitled trip" : "Untitled order")}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {entry.kind === "trip" ? "Live ride" : "Live order"} · added {timeAgo(entry.addedAt)}
        </div>
      </div>
      <button type="button"
        onClick={() => setEditing(true)}
        className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center"
        aria-label="Rename"
      >
        <Pencil className="w-4 h-4 text-muted-foreground" />
      </button>
      <button type="button"
        onClick={onRemove}
        className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
        aria-label="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <Button
        size="sm"
        className="rounded-lg text-xs h-9 px-3"
        onClick={onOpen}
      >
        Open <ChevronRight className="w-3 h-3 ml-0.5" />
      </Button>
    </motion.div>
  );
}

function renameEntry(entry: WatchlistEntry, newLabel: string) {
  // Tiny inline write to avoid threading a hook setter through every Row.
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem("zivo:watchlist");
    const all: WatchlistEntry[] = raw ? JSON.parse(raw) : [];
    const next = all.map((e) =>
      e.kind === entry.kind && e.id === entry.id ? { ...e, label: newLabel.trim() || null } : e,
    );
    window.localStorage.setItem("zivo:watchlist", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("zivo:watchlist:changed"));
  } catch {
    /* ignore */
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
