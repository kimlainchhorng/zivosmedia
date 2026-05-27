import { useState } from "react";
import Search from "lucide-react/dist/esm/icons/search";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Check from "lucide-react/dist/esm/icons/check";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStoreProductSearch } from "@/hooks/usePostProducts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
}

/**
 * Bottom-sheet product picker for tagging store products onto a post.
 * Caller manages the selectedIds state; on Done the sheet closes.
 */
export default function ProductPickerSheet({
  open,
  onOpenChange,
  storeId,
  selectedIds,
  onChange,
  max = 8,
}: Props) {
  const [query, setQuery] = useState("");
  const { data: products = [], isLoading } = useStoreProductSearch(storeId, query);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= max) return;
      onChange([...selectedIds, id]);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
        <SheetHeader className="border-b border-border/40 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Tag products
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {selectedIds.length}/{max} selected
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={storeId ? "Search products in this store" : "No store selected"}
              disabled={!storeId}
              className="w-full rounded-full border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {!storeId ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Select a store first to tag its products.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query ? `No products match "${query}"` : "This store has no products yet."}
            </p>
          ) : (
            <ul>
              {products.map((p) => {
                const isSel = selectedIds.includes(p.id);
                const atMax = !isSel && selectedIds.length >= max;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={atMax}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                        isSel ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 leading-tight">
                        <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ${Number(p.price).toFixed(2)}
                          {p.in_stock === false && <span className="ml-1 text-red-500">· Out of stock</span>}
                        </div>
                      </div>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                      }`}>
                        {isSel && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/40 px-4 py-3 flex gap-2">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selectedIds.length === 0}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
