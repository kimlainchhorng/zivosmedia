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
import { AtSign, Loader2, Search, Sparkles, UserRoundCheck } from "lucide-react";

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

  const visible = query != null && query.length >= MIN_QUERY_LENGTH;
  const verifiedCount = results.filter((result) => result.isVerified).length;
  const mentionSignal = loading
    ? { label: "Searching live", detail: `Looking for @${query}`, width: "48%" }
    : results.length > 0
      ? { label: "People found", detail: `${results.length} match${results.length === 1 ? "" : "es"} · ${verifiedCount} verified`, width: `${Math.min(100, Math.max(34, results.length * 13))}%` }
      : { label: "No match yet", detail: "Try more letters or another name", width: "22%" };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className={`zivo-social-composer-panel absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-[1.25rem] p-2 ${className}`}
        >
          <div className="zivo-social-header-glass mb-2 flex items-center gap-2.5 rounded-2xl px-3 py-2">
            <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary">
              <AtSign className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold text-foreground">Mention someone</p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {query ? `Searching @${query}` : "Type a username"}
              </p>
            </div>
            <span className="zivo-social-chip-active inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {loading ? "Live" : `${results.length}/${MAX_RESULTS}`}
            </span>
          </div>
          <div className="zivo-social-module-tile mb-2 rounded-2xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="zivo-social-share-orb flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-primary">
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-foreground">{mentionSignal.label}</span>
                  <span className="block truncate text-[10px] font-semibold text-muted-foreground">{mentionSignal.detail}</span>
                </span>
              </span>
              <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase text-primary">
                @{query}
              </span>
            </div>
            <div className="zivo-social-chip mt-2 h-1.5 overflow-hidden rounded-full p-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-emerald-400 transition-[width] duration-300"
                style={{ width: mentionSignal.width }}
              />
            </div>
          </div>
          {loading && results.length === 0 ? (
            <div className="zivo-social-sheet-row flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              Searching people...
            </div>
          ) : results.length === 0 ? (
            <div className="zivo-social-sheet-row flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              No matches yet
            </div>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r)}
                    onMouseEnter={() => setHighlighted(i)}
                    aria-label={`Mention ${r.fullName ?? r.username} as @${r.username}`}
                    className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.99] sm:min-h-[46px] sm:py-2 ${
                      i === highlighted ? "zivo-social-sheet-row" : "hover:bg-white/55"
                    }`}
                  >
                    <div className="zivo-social-avatar-ring h-9 w-9 shrink-0 overflow-hidden rounded-full">
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
                    {i === highlighted && <UserRoundCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
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
