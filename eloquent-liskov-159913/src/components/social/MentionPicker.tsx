/**
 * MentionPicker — autocomplete suggestions for @-mentions in a text input.
 *
 * Drop in next to your <input>/<textarea>; the parent owns text + cursor and
 * tells the picker which "@<query>" prefix is being typed. Tapping a result
 * fires onSelect with the chosen handle so the parent can splice it into the
 * input value.
 *
 * Why client-side: keystroke latency must be ~0ms; we cap searches to 10ms
 * debounce + 8 results, and rely on the existing `profiles` index on username.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

export interface MentionResult {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface Props {
  /** "@<this>" — the partial query after the @-symbol, or null to hide */
  query: string | null;
  onSelect: (result: MentionResult) => void;
  onClose: () => void;
  /** Anchor classes for positioning (default: bottom of parent input row) */
  className?: string;
}

const MIN_QUERY_LENGTH = 1;
const DEBOUNCE_MS      = 80;
const MAX_RESULTS      = 8;

/**
 * Detect an active @-mention prefix at the caret. Returns the partial query
 * (without the "@") if one is being typed, or null otherwise.
 *
 * Examples:
 *   detectMention("hi @al", 6)    → "al"
 *   detectMention("hi @al ", 7)   → null  (whitespace ends the mention)
 *   detectMention("foo bar", 3)   → null
 */
export function detectMention(text: string, caret: number): string | null {
  if (caret <= 0 || caret > text.length) return null;
  // Walk backwards to find an @ within the last 30 chars, no whitespace
  for (let i = caret - 1; i >= 0 && i >= caret - 30; i--) {
    const c = text[i];
    if (c === "@") {
      // Must be at start, after whitespace, or after newline
      if (i === 0 || /\s/.test(text[i - 1])) {
        return text.slice(i + 1, caret);
      }
      return null;
    }
    if (/\s/.test(c)) return null;
  }
  return null;
}

/**
 * Replace the active @-prefix in `text` with `@<handle> ` and return the new
 * value + the caret position right after the inserted handle.
 */
export function applyMention(text: string, caret: number, handle: string): { value: string; caret: number } {
  for (let i = caret - 1; i >= 0 && i >= caret - 30; i--) {
    if (text[i] === "@") {
      const before = text.slice(0, i);
      const after  = text.slice(caret);
      const insert = `@${handle} `;
      return { value: before + insert + after, caret: (before + insert).length };
    }
    if (/\s/.test(text[i])) break;
  }
  // No active prefix; just append the handle
  const next = `${text}@${handle} `;
  return { value: next, caret: next.length };
}

export default function MentionPicker({ query, onSelect, onClose, className = "" }: Props) {
  const [results, setResults] = useState<MentionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query == null || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, user_id, username, full_name, avatar_url, is_verified")
          .or(`username.ilike.${query}%,full_name.ilike.${query}%`)
          .limit(MAX_RESULTS);

        const out: MentionResult[] = (data ?? [])
          .filter((p: any) => p.username || p.full_name)
          .map((p: any) => ({
            id: p.user_id ?? p.id,
            username: p.username ?? "",
            fullName: p.full_name,
            avatarUrl: p.avatar_url,
            isVerified: !!p.is_verified,
          }));

        setResults(out);
        setHighlighted(0);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Keyboard navigation hooks (parent forwards events via window listener)
  useEffect(() => {
    if (query == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[highlighted]) {
        e.preventDefault();
        onSelect(results[highlighted]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, results, highlighted, onSelect, onClose]);

  const visible = query != null && (loading || results.length > 0);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className={`absolute bottom-full left-0 right-0 mb-2 z-50 rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden ${className}`}
        >
          {loading && results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 sm:py-2 text-left transition-colors min-h-[52px] sm:min-h-[44px] ${
                      i === highlighted ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                          {(r.fullName ?? r.username ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col">
                      <span className="flex items-center gap-1 truncate text-sm font-semibold">
                        {r.fullName ?? r.username}
                        {r.isVerified && <VerifiedBadge size={14} interactive={false} />}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">@{r.username}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
