/**
 * CreateListingPage — /marketplace-hub/create
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const CONDITIONS = ["new", "like_new", "good", "fair", "for_parts"] as const;

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("good");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user?.id || !title || !price) { toast.error("Title and price required"); return; }
    const cents = Math.round(parseFloat(price) * 100);
    if (!cents || cents <= 0) { toast.error("Invalid price"); return; }
    setBusy(true);
    try {
      const { error } = await (dbFrom("marketplace_listings") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
        seller_id: user.id, title, description: description || null,
        price_cents: cents, currency: "USD", condition, location: location || null, status: "available",
      });
      if (error) throw error;
      toast.success("Listing posted!");
      navigate("/marketplace-hub");
    } catch {
      toast.error("Couldn't post listing");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-md">
        <h1 className="text-2xl font-bold mb-6">List an item</h1>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you selling?" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe it (condition, history, etc.)" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <div className="flex items-center gap-2">
            <span className="text-2xl text-muted-foreground">$</span>
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={condition} onChange={(e) => setCondition(e.target.value as typeof CONDITIONS[number])} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30">
            {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="button" onClick={() => void submit()} disabled={busy || !title || !price} className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post listing"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
