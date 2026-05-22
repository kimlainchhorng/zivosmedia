/**
 * AdminStoresVerification — admin-only panel to mark store accounts
 * as Blue Verified. Lives inside the Customer Management page.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Store as StoreIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean | null;
  category: string | null;
  market: string | null;
}

export default function AdminStoresVerification() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["admin-stores-verification"],
    queryFn: async (): Promise<StoreRow[]> => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, name, slug, logo_url, is_verified, category, market")
        .order("name", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as StoreRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.slug?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q),
    );
  }, [stores, search]);

  const toggleMutation = useMutation({
    mutationFn: async ({ storeId, verified }: { storeId: string; verified: boolean }) => {
      const { error } = await (supabase as any).rpc("set_store_blue_verified_manual", {
        _store_id: storeId,
        _verified: verified,
        _reason: verified ? "Manual store verification" : "Manual verification removal",
      });
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      qc.invalidateQueries({ queryKey: ["admin-stores-verification"] });
      toast.success(verified ? "Store verified ✓" : "Verification removed");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update store verification"),
  });

  const verifiedCount = stores.filter((s) => isBlueVerified(s.is_verified)).length;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <StoreIcon className="h-4 w-4 text-primary" />
            Store verification
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Mark business / platform store accounts as Blue Verified. Changes propagate live to all clients.
          </p>
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto">
          {verifiedCount} of {stores.length} verified
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No stores match your search.</p>
        ) : (
          <ul className="divide-y divide-border/50 rounded-lg border border-border/40">
            {filtered.slice(0, 100).map((store) => {
              const verified = isBlueVerified(store.is_verified);
              const pending =
                toggleMutation.isPending && toggleMutation.variables?.storeId === store.id;
              return (
                <li key={store.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                    {store.logo_url ? (
	                      <img
	                        src={store.logo_url}
	                        alt=""
	                        className="h-full w-full object-cover"
	                        loading="lazy"
	                        decoding="async"
	                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <StoreIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{store.name}</p>
                      {verified && <VerifiedBadge size={14} interactive={false} />}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      /{store.slug}
                      {store.category ? ` · ${store.category}` : ""}
                      {store.market ? ` · ${store.market}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={verified ? "outline" : "default"}
                    disabled={pending}
                    onClick={() =>
                      toggleMutation.mutate({ storeId: store.id, verified: !verified })
                    }
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : verified ? (
                      "Unverify"
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
