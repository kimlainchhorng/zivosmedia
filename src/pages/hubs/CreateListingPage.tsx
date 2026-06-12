/**
 * CreateListingPage — /marketplace-hub/create
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import HubFormShell, { Field, fieldClass } from "@/components/hubs/HubFormShell";
import Tag from "lucide-react/dist/esm/icons/tag";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const CONDITIONS = ["new", "like_new", "good", "fair", "for_parts"] as const;
const labelOf = (c: string) => c.replace(/_/g, " ").replace(/^\w/, (m) => m.toUpperCase());

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
    <HubFormShell
      backTo="/marketplace-hub"
      backLabel="Marketplace"
      badge="Sell on ZIVO"
      badgeIcon={Tag}
      title="List an item"
      subtitle="Reach buyers in your area — listing is free."
      submitLabel="Post listing"
      onSubmit={() => void submit()}
      busy={busy}
      canSubmit={!!title && !!price}
    >
      <Field label="Title" htmlFor="li-title" required>
        <input id="li-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you selling?" className={fieldClass} />
      </Field>
      <Field label="Description" htmlFor="li-desc">
        <textarea id="li-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe it (condition, history, etc.)" rows={3} className={`${fieldClass} resize-none`} />
      </Field>
      <Field label="Price" htmlFor="li-price" required>
        <div className="flex items-center gap-2">
          <span className="text-lg text-muted-foreground">$</span>
          <input id="li-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" className={`flex-1 ${fieldClass}`} />
        </div>
      </Field>
      <Field label="Condition">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => {
            const active = condition === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "bg-ig-gradient text-white border-transparent" : "bg-background border-border text-foreground hover:bg-muted/50"
                }`}
              >
                {labelOf(c)}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Location" htmlFor="li-loc" optional>
        <input id="li-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or area" className={fieldClass} />
      </Field>
    </HubFormShell>
  );
}
