/**
 * ChatSearchBar — search within current conversation
 */
import { useState, useCallback } from "react";
import Search from "lucide-react/dist/esm/icons/search";
import X from "lucide-react/dist/esm/icons/x";

export const CHAT_SEARCH_EVENT = "zivo:chat-search";

export interface ChatSearchDetail {
  query: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export default function ChatSearchBar({ visible, onClose, onSearch }: Props) {
  const [query, setQuery] = useState("");

  const handleChange = useCallback((val: string) => {
    setQuery(val);
    if (val.trim()) onSearch(val);
  }, [onSearch]);

  if (!visible) return null;

  return (
    <div className="px-4 py-2 border-b border-border/20 bg-muted/20 flex items-center gap-2">
      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        autoFocus
        type="text"
        placeholder="Search messages..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      <button type="button"
        onClick={() => { setQuery(""); onClose(); }}
        className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90"
        aria-label="Close search"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
