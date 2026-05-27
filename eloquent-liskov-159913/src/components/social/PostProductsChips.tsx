import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
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

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => navigate(`/store/${products[0].store_id}?product=${products[0].store_product_id}`)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-3 py-1 text-xs font-semibold text-background backdrop-blur-sm ${className ?? ""}`}
      >
        <ShoppingBag className="h-3 w-3" />
        {products.length === 1 ? "Shop this" : `Shop ${products.length} items`}
      </button>
    );
  }

  return (
    <div className={`-mx-1 flex gap-2 overflow-x-auto px-1 py-2 scrollbar-hide ${className ?? ""}`}>
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(`/store/${p.store_id}?product=${p.store_product_id}`)}
          className="group shrink-0 flex items-center gap-2 rounded-xl border border-border bg-background text-foreground pl-1 pr-3 py-1 hover:bg-muted/50 transition-colors"
        >
          {p.image_url && !brokenImages[p.id] ? (
            <img
              src={p.image_url}
	              alt=""
	              loading="lazy"
	              decoding="async"
	              className="h-9 w-9 rounded-lg object-cover"
              onError={() => {
                setBrokenImages((prev) => ({ ...prev, [p.id]: true }));
              }}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="text-left leading-tight min-w-0">
            <div className="text-[11px] font-semibold text-foreground line-clamp-1 max-w-[140px]">{p.name || "Product"}</div>
            <div className="text-[10px] text-muted-foreground">
              ${p.price.toFixed(2)}
              {p.in_stock === false && <span className="ml-1 text-red-500">· Out</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
