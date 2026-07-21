/**
 * ChatQuickReplies — Telegram-style saved canned responses.
 * Tap a reply to insert/send it; manage replies (add/edit/delete) inline.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import X from "lucide-react/dist/esm/icons/x";
import Plus from "lucide-react/dist/esm/icons/plus";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Zap from "lucide-react/dist/esm/icons/zap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "zivo:chat:quick-replies";
const MAX_REPLIES = 30;
const MAX_LEN = 500;

const DEFAULT_REPLIES = [
  "👍 Got it, thanks!",
  "On my way 🚗",
  "Sorry, can't talk right now — I'll get back to you.",
  "Running 5 min late 🙏",
  "Sounds good, let's do it.",
  "Could you send me the address?",
];

export interface QuickReply {
  id: string;
  text: string;
}

interface ChatQuickRepliesProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user taps a reply — receives the reply text. */
  onSelect: (text: string) => void;
}

function loadReplies(): QuickReply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(r => r && typeof r.text === "string");
    }
  } catch { /* fall through */ }
  return DEFAULT_REPLIES.map((text, i) => ({ id: `default-${i}`, text }));
}

function saveReplies(list: QuickReply[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
}

export default function ChatQuickReplies({ open, onClose, onSelect }: ChatQuickRepliesProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) setReplies(loadReplies());
  }, [open]);

  // Esc closes the sheet (desktop keyboard UX).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const persist = useCallback((next: QuickReply[]) => {
    setReplies(next);
    saveReplies(next);
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setDraft("");
    setAdding(true);
  };

  const startEdit = (r: QuickReply) => {
    setAdding(false);
    setEditingId(r.id);
    setDraft(r.text);
  };

  const commit = () => {
    const text = draft.trim().slice(0, MAX_LEN);
    if (!text) {
      setAdding(false);
      setEditingId(null);
      setDraft("");
      return;
    }
    if (adding) {
      if (replies.length >= MAX_REPLIES) return;
      persist([...replies, { id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text }]);
    } else if (editingId) {
      persist(replies.map(r => (r.id === editingId ? { ...r, text } : r)));
    }
    setAdding(false);
    setEditingId(null);
    setDraft("");
  };

  const remove = (id: string) => {
    persist(replies.filter(r => r.id !== id));
  };

  const handleSelect = (r: QuickReply) => {
    onSelect(r.text);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="qr-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[1500] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="qr-sheet"
            initial={{ y: "100%", opacity: 0.7 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.7 }}
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-[1501] bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col"
            style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 8px)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-border/30 bg-background/95 backdrop-blur-md rounded-t-3xl">
              <button type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted/50 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold">Quick Replies</p>
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/40 text-[10px] font-mono text-muted-foreground">
                  ⌘K
                </span>
              </div>
              <button type="button"
                onClick={startAdd}
                disabled={replies.length >= MAX_REPLIES}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  replies.length >= MAX_REPLIES ? "opacity-40" : "hover:bg-muted/50"
                )}
                aria-label="Add reply"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {(adding || editingId) && (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {adding ? "New reply" : "Edit reply"}
                  </p>
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                    placeholder="Type your reply…"
                    className="h-10 rounded-xl text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) commit(); }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{draft.length}/{MAX_LEN}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setAdding(false); setEditingId(null); setDraft(""); }}
                        className="h-8 px-3 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={commit}
                        disabled={!draft.trim()}
                        className="h-8 px-3 text-xs font-bold"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {replies.length === 0 && !adding && (
                <div className="text-center py-12 px-4">
                  <Zap className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground mb-1">No quick replies yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Save common phrases to send them in one tap.</p>
                  <Button onClick={startAdd} size="sm" className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add one
                  </Button>
                </div>
              )}

              {replies.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-2 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2.5"
                >
                  <button type="button"
                    onClick={() => handleSelect(r)}
                    className="flex-1 text-left text-sm text-foreground line-clamp-2 break-words min-w-0"
                  >
                    {r.text}
                  </button>
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button type="button"
                      onClick={() => startEdit(r)}
                      className="w-7 h-7 rounded-full hover:bg-muted/70 flex items-center justify-center"
                      aria-label="Edit reply"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button"
                      onClick={() => remove(r.id)}
                      className="w-7 h-7 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"
                      aria-label="Delete reply"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
