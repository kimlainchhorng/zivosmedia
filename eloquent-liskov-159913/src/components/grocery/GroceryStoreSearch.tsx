/**
 * GroceryStoreSearch - Smart search for individual store pages
 * Recent searches, trending items, keyboard submit
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const RECENT_KEY = "zivo-grocery-recent-searches";
const MAX_RECENT = 8;

const TRENDING_ITEMS = [
  "Organic milk", "Chicken breast", "Avocados", "Bread",
  "Eggs", "Bananas", "Greek yogurt", "Coffee",
];

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
    recent.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}
function clearRecentSearches() { localStorage.removeItem(RECENT_KEY); }

interface Props {
  placeholder: string;
  storeName: string;
  query: string;
  onSearch: (val: string) => void;
  onSubmit: (val: string) => void;
  onClear: () => void;
}

export function GroceryStoreSearch({ placeholder, storeName, query, onSearch, onSubmit, onClear }: Props) {
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (focused) setRecent(getRecentSearches()); }, [focused]);

  const handleSelect = (term: string) => {
    saveRecentSearch(term);
    onSubmit(term);
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim().length >= 2) {
      saveRecentSearch(query.trim());
      onSubmit(query.trim());
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && !query;

  return (
    <div className="px-4 pb-2 relative z-20">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-9 rounded-2xl bg-muted/30 border-border/20 h-11 text-sm focus:bg-muted/50 focus:ring-2 focus:ring-primary/20 transition-all"
          aria-label={`Search ${storeName} products`}
        />
        {query && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.8 }}
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 top-full mt-1 bg-card/98 backdrop-blur-xl border border-border/30 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {recent.length > 0 && (
              <div className="p-3 border-b border-border/15">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recent</span>
                  </div>
                  <button type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { clearRecentSearches(); setRecent([]); }}
                    className="text-[10px] text-destructive/70 hover:text-destructive font-medium"
                  >Clear</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((term) => (
                    <button type="button"
                      key={term}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(term)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 text-[11px] font-medium text-foreground/80 transition-colors border border-border/15"
                    >
                      <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />{term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Trending at {storeName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {TRENDING_ITEMS.map((term, i) => (
                  <button type="button"
                    key={term}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(term)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-muted/30 text-left transition-colors"
                  >
                    <span className="text-[10px] font-bold text-primary/50 w-3">{i + 1}</span>
                    <span className="text-[11px] font-medium text-foreground/80 truncate">{term}</span>
                    <ArrowUpRight className="h-2.5 w-2.5 text-muted-foreground/40 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
