import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import PackageCheck from "lucide-react/dist/esm/icons/package-check";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Tags from "lucide-react/dist/esm/icons/tags";
import { usePostProducts } from "@/hooks/usePostProducts";

interface Props {
  postId: string;
  /** Visual variant: full chips (default) or single compact pill. */
  variant?: "chips" | "pill";
  className?: string;
}

/**
 * Renders shoppable product tags attached to a post. Renders nothing when the
 * post has no tagged products. Tapping a chip navigates to the store profile
 * with the product highlighted via ?product=<id>.
 */
export default function PostProductsChips({ postId, variant = "chips", className }: Props) {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = usePostProducts(postId);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

  if (isLoading || products.length === 0) return null;
  const inStockCount = products.filter((product) => product.in_stock !== false).length;
  const totalValue = products.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const hasMultipleProducts = products.length > 1;
  const featuredProduct = products.find((product) => product.in_stock !== false) ?? products[0];
  const stockLabel = inStockCount === products.length ? "All live" : `${inStockCount}/${products.length} live`;
  const prices = products.map((product) => Number(product.price || 0)).filter((price) => Number.isFinite(price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange = minPrice === maxPrice
    ? `$${minPrice.toFixed(0)}`
    : `$${minPrice.toFixed(0)}-${maxPrice.toFixed(0)}`;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => navigate(`/store/${products[0].store_id}?product=${products[0].store_product_id}`)}
        className={`zivo-social-chip-active inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:scale-95 ${className ?? ""}`}
        aria-label={products.length === 1 ? `Shop ${products[0].name || "this product"}` : `Shop ${products.length} tagged products`}
      >
        <ShoppingBag className="h-3 w-3" aria-hidden="true" />
        {products.length === 1 ? "Shop this" : `Shop ${products.length} items`}
        {hasMultipleProducts && (
          <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black">
            {stockLabel}
          </span>
        )}
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-2 scrollbar-none ${className ?? ""}`} aria-label="Tagged products">
      <div className="zivo-social-chip flex shrink-0 items-center gap-2 rounded-[1.15rem] px-3 py-2 text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[11px] font-black">Shop post</span>
          <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
            <Layers3 className="h-3 w-3" aria-hidden="true" />
            {products.length} item{products.length === 1 ? "" : "s"} · {stockLabel}
          </span>
        </span>
        {hasMultipleProducts && (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black tabular-nums text-primary">
            ${totalValue.toFixed(0)}
          </span>
        )}
      </div>
      {featuredProduct && hasMultipleProducts && (
        <button
          type="button"
          onClick={() => navigate(`/store/${featuredProduct.store_id}?product=${featuredProduct.store_product_id}`)}
          className="zivo-social-share-preview group flex shrink-0 items-center gap-2 rounded-[1.15rem] px-3 py-2 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          aria-label={`Shop featured product ${featuredProduct.name || "product"} for $${featuredProduct.price.toFixed(2)}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              Featured
            </span>
            <span className="block max-w-[130px] truncate text-[11px] font-bold text-foreground">
              {featuredProduct.name || "Product"}
            </span>
          </span>
          <span className="zivo-social-chip-active rounded-full px-2 py-1 text-[10px] font-black tabular-nums">
            ${featuredProduct.price.toFixed(0)}
          </span>
        </button>
      )}
      {hasMultipleProducts && (
        <div className="zivo-social-module-tile flex shrink-0 items-center gap-2 rounded-[1.15rem] px-3 py-2 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
            <Tags className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              Shop signal
            </span>
            <span className="block truncate text-[11px] font-bold text-foreground">
              {priceRange} · {stockLabel}
            </span>
          </span>
        </div>
      )}
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(`/store/${p.store_id}?product=${p.store_product_id}`)}
          className="zivo-social-module-tile group flex shrink-0 items-center gap-2 rounded-[1.15rem] py-1.5 pl-1.5 pr-3 text-foreground transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          aria-label={`Shop ${p.name || "product"} for $${p.price.toFixed(2)}${p.in_stock === false ? ", out of stock" : ", in stock"}`}
        >
          <div className="relative shrink-0">
            {p.image_url && !brokenImages[p.id] ? (
              <img
                src={p.image_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-11 w-11 rounded-2xl object-cover shadow-sm ring-1 ring-white/50 transition-transform group-hover:scale-105"
                onError={() => {
                  setBrokenImages((prev) => ({ ...prev, [p.id]: true }));
                }}
              />
            ) : (
              <div className="zivo-social-share-orb flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105">
                <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-[0_8px_18px_rgba(16,185,129,0.3)] ${p.in_stock === false ? "bg-muted-foreground" : "bg-emerald-500"}`}>
              {p.in_stock === false ? (
                <ShoppingBag className="h-3 w-3" aria-hidden="true" />
              ) : (
                <PackageCheck className="h-3 w-3" aria-hidden="true" />
              )}
            </span>
          </div>
          <div className="min-w-0 text-left leading-tight">
            <div className="text-[11px] font-semibold text-foreground line-clamp-1 max-w-[140px]">{p.name || "Product"}</div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-black text-foreground">${p.price.toFixed(2)}</span>
              {p.in_stock === false ? (
                <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 font-bold text-red-500">Out</span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-600">In stock</span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
