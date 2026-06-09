import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Search from "lucide-react/dist/esm/icons/search";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Check from "lucide-react/dist/esm/icons/check";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import PackageSearch from "lucide-react/dist/esm/icons/package-search";
import PackageCheck from "lucide-react/dist/esm/icons/package-check";
import Plus from "lucide-react/dist/esm/icons/plus";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import X from "lucide-react/dist/esm/icons/x";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStoreProductSearch } from "@/hooks/usePostProducts";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useStoreProductSearch(storeId, query);
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const inStockCount = products.filter((product) => product.in_stock !== false).length;
  const isAtMax = selectedIds.length >= max;
  const queryActive = query.trim().length > 0;
  const selectedValue = selectedProducts.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const selectedValueLabel = selectedValue > 0 ? `$${selectedValue.toFixed(2)}` : "$0.00";
  const tagSignal =
    selectedIds.length >= Math.min(3, max)
      ? { label: "Shopping stack", detail: `${selectedIds.length} products tagged`, width: "100%" }
      : selectedIds.length > 0
        ? { label: "Focused tag", detail: `${selectedValueLabel} selected`, width: "58%" }
        : { label: "No products tagged", detail: "Add items to make this post shoppable", width: "20%" };

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
      <SheetContent side="bottom" className="zivo-social-sheet-panel flex h-[82vh] flex-col overflow-hidden rounded-t-[1.75rem] p-0">
        <SheetHeader className="zivo-social-header-glass m-2 rounded-[1.25rem] px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5 text-left text-base">
            <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate leading-tight">Tag products</span>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">
                Add shoppable products to this post
              </span>
            </span>
            <span className="zivo-social-chip-active rounded-full px-3 py-1.5 text-[11px] font-bold">
              {selectedIds.length}/{max}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2 px-3 pb-2 pt-1">
          {storeId && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{products.length}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Catalog</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <PackageCheck className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{inStockCount}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">In stock</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${isAtMax ? "bg-amber-500 text-white" : "bg-fuchsia-500/10 text-fuchsia-500"}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{selectedIds.length}/{max}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">{isAtMax ? "Maxed" : "Selected"}</p>
                </div>
              </div>
              <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black leading-none text-foreground">{selectedValueLabel}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Tagged</p>
                </div>
              </div>
            </div>
          )}
          <div className="zivo-social-search relative rounded-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={storeId ? "Search products in this store" : "No store selected"}
              disabled={!storeId}
              aria-label="Search products in this store"
              className="h-10 w-full rounded-full bg-transparent pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted/50 active:scale-95"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {storeId && (
            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="zivo-social-chip border-white/10 bg-white/[0.04] px-2.5 py-1 text-foreground/65">
                {queryActive ? `${products.length} ${products.length === 1 ? "match" : "matches"}` : `${products.length} products`}
              </span>
              <span className="zivo-social-chip border-white/10 bg-white/[0.04] px-2.5 py-1 text-foreground/65">
                {isAtMax ? "Limit reached" : `${max - selectedIds.length} slots left`}
              </span>
            </div>
          )}

          {storeId && (
            <div className="zivo-social-module-tile rounded-[1.25rem] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">{tagSignal.label}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">{tagSignal.detail}</p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Shop
                </span>
              </div>
              <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-amber-400 transition-[width] duration-300"
                  style={{ width: tagSignal.width }}
                />
              </div>
            </div>
          )}

          {selectedProducts.length > 0 && (
            <div className="zivo-social-module-tile flex gap-2 overflow-x-auto rounded-[1.25rem] p-2 scrollbar-none">
              {selectedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggle(product.id)}
                  aria-label={`Remove ${product.name} from tagged products`}
                  className="zivo-social-chip flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-xs font-semibold active:scale-95"
                >
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-7 w-7 rounded-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="zivo-social-share-orb flex h-7 w-7 items-center justify-center rounded-full">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    </span>
                  )}
                  <span className="max-w-[120px] truncate">{product.name}</span>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-none">
          {!storeId ? (
            <div className="zivo-social-module mx-0 my-3 flex flex-col items-center rounded-[1.25rem] px-6 py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20 ring-1 ring-white/10 shadow-[0_4px_24px_rgba(236,72,153,0.10)]">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">No store linked</p>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">Create a store first, then you can tag products from your catalog on any post.</p>
              <button
                type="button"
                onClick={() => { onOpenChange(false); navigate("/app/shop"); }}
                className="mt-4 flex items-center gap-2 rounded-full bg-ig-gradient px-5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(236,72,153,0.30)] transition-transform active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your store
              </button>
            </div>
          ) : isLoading ? (
            <div className="zivo-social-module mx-0 my-3 flex flex-col items-center justify-center rounded-[1.25rem] py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="mt-3 text-xs font-semibold">Finding products</p>
            </div>
          ) : products.length === 0 ? (
            <div className="zivo-social-module mx-0 my-3 flex flex-col items-center rounded-[1.25rem] px-6 py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20 ring-1 ring-white/10 shadow-[0_4px_24px_rgba(236,72,153,0.10)]">
                <PackageSearch className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {query ? "No product match" : "No products yet"}
              </p>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                {query
                  ? `Nothing matched "${query}". Try a different search.`
                  : "Your store has no products. Add some first so you can tag them on posts."}
              </p>
              {!query && (
                <button
                  type="button"
                  onClick={() => { onOpenChange(false); navigate("/app/shop/products"); }}
                  className="mt-4 flex items-center gap-2 rounded-full bg-ig-gradient px-5 py-2 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(236,72,153,0.30)] transition-transform active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add products to your store
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {products.map((p) => {
                const isSel = selectedIds.includes(p.id);
                const atMax = !isSel && selectedIds.length >= max;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={atMax}
                      aria-label={`${isSel ? "Remove" : "Tag"} ${p.name} for ${Number(p.price).toFixed(2)} dollars`}
                      className={cn(
                        "zivo-social-sheet-row flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50",
                        isSel && "ring-2 ring-primary/30",
                      )}
                    >
                      {p.image_url ? (
                        <div className="relative shrink-0">
                          <img src={p.image_url} alt="" loading="lazy" decoding="async" className="h-14 w-14 rounded-2xl object-cover shadow-sm ring-1 ring-white/50" />
                          {p.in_stock !== false && (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.3)]">
                              <PackageCheck className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          <div className="zivo-social-share-orb flex h-14 w-14 items-center justify-center rounded-2xl">
                            <ShoppingBag className="h-5 w-5 text-primary" />
                          </div>
                          {p.in_stock !== false && (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.3)]">
                              <PackageCheck className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-black text-foreground">${Number(p.price).toFixed(2)}</span>
                          {p.in_stock === false ? (
                            <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">Out</span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">In stock</span>
                          )}
                        </div>
                      </div>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSel ? "border-primary bg-ig-gradient text-white" : "border-muted-foreground/30"
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

        <div className="zivo-social-comment-footer flex gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selectedIds.length === 0}
            className="zivo-social-chip min-h-[42px] rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto min-h-[42px] rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
