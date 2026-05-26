/**
 * ImportProductPage - Detail view for a cross-border product.
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Truck, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportProduct, useImportCart } from "@/hooks/useImportShop";
import { toast } from "sonner";

export default function ImportProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useImportProduct(id);
  const { addItem, itemCount } = useImportCart();
  const [activeImage, setActiveImage] = useState(0);
  const [variant, setVariant] = useState<string | undefined>();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="aspect-square w-full" />
        <div className="p-3 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Product not found
      </div>
    );
  }

  const images = product.images?.length ? product.images : ["/placeholder.svg"];
  const price = (product.final_price_cents / 100).toFixed(2);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      title: product.title,
      image: images[0],
      price_cents: product.final_price_cents,
      weight_grams: product.weight_grams,
      variant,
    });
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    handleAdd();
    navigate("/shop/cart");
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-3 py-2.5 gap-2" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <Button variant="ghost" size="icon" aria-label="Go back" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-bold flex-1 truncate">{product.title}</h1>
        <Button variant="ghost" size="icon" aria-label="View cart" className="h-9 w-9 relative" onClick={() => navigate("/shop/cart")}>
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </header>

      {/* Gallery */}
      <div className="aspect-square bg-muted/40 overflow-hidden">
        <img src={images[activeImage]} alt={product.title} className="w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 px-3 pt-2 overflow-x-auto">
          {images.map((src, i) => (
            <button type="button"
              key={i}
              onClick={() => setActiveImage(i)}
              className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 ${
                activeImage === i ? "border-primary" : "border-transparent"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="px-3 pt-3 space-y-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">${price}</span>
            <Badge variant="secondary" className="text-[10px] uppercase">
              From {product.source_platform}
            </Badge>
          </div>
          <p className="text-[15px] font-semibold leading-tight mt-2">{product.title}</p>
          {product.category && <p className="text-[11px] text-muted-foreground mt-1">Category · {product.category}</p>}
        </div>

        {/* Variants */}
        {product.variants?.length > 0 && (
          <div className="space-y-2">
            {product.variants.map((v) => (
              <div key={v.name}>
                <p className="text-[12px] font-semibold mb-1.5">{v.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {v.options.map((opt) => (
                    <button type="button"
                      key={opt}
                      onClick={() => setVariant(opt)}
                      className={`px-3 h-8 rounded-lg text-[12px] border transition ${
                        variant === opt ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery info */}
        <div className="rounded-2xl bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px]">
            <Truck className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">Estimated delivery:</span>
            <span>{product.est_delivery_days_min}–{product.est_delivery_days_max} days</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">Ships via:</span>
            <span>ZIVO Phnom Penh warehouse</span>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <Shield className="h-4 w-4 text-foreground" />
            <span className="font-semibold">Buyer protection:</span>
            <span>Refund if not delivered</span>
          </div>
        </div>

        {product.description && (
          <div>
            <p className="text-[12px] font-semibold mb-1">Description</p>
            <p className="text-[12px] text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border/40 p-3 grid grid-cols-2 gap-2 safe-area-bottom">
        <Button variant="outline" className="h-12 rounded-xl font-bold" onClick={handleAdd}>
          Add to Cart
        </Button>
        <Button className="h-12 rounded-xl font-bold" onClick={handleBuyNow}>
          Buy Now
        </Button>
      </div>
    </div>
  );
}
