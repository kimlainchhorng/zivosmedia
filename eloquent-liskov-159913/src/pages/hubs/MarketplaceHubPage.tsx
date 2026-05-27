/**
 * MarketplaceHubPage — /marketplace-hub
 * Browse peer-to-peer item listings.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import MarketplaceListingCard, { type ListingData } from "@/components/marketplace/MarketplaceListingCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Plus from "lucide-react/dist/esm/icons/plus";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function MarketplaceHubPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (dbFrom("marketplace_listings") as { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: ListingData[] | null }> } } } })
        .select("id, title, price_cents, currency, condition, images, location, status")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!cancelled) setListings((data as ListingData[] | null) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Buy & sell with people in your area.</p>
          </div>
          <button type="button" onClick={() => navigate("/marketplace-hub/create")} className="inline-flex min-h-[40px] items-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold touch-manipulation">
            <Plus className="w-4 h-4" /> Sell
          </button>
        </div>

        {listings == null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No active listings yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((l) => <MarketplaceListingCard key={l.id} listing={l} onTap={(id) => navigate(`/marketplace-hub/${id}`)} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
