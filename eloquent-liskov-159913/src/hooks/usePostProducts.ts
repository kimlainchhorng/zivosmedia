import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PostSource = "store" | "user";

export interface TaggedProduct {
  id: string;
  store_product_id: string;
  sort_order: number;
  name: string;
  price: number;
  image_url: string | null;
  store_id: string;
  in_stock: boolean | null;
}

const KEY = (postId: string | null) => ["post-products", postId];

export function usePostProducts(postId: string | null) {
  return useQuery<TaggedProduct[]>({
    queryKey: KEY(postId),
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("post_products")
        .select(
          "id, store_product_id, sort_order, store_products(id, name, price, image_url, store_id, in_stock)"
        )
        .eq("post_id", postId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.store_products)
        .map((r: any) => ({
          id: r.id,
          store_product_id: r.store_product_id,
          sort_order: r.sort_order,
          name: r.store_products.name,
          price: Number(r.store_products.price),
          image_url: r.store_products.image_url,
          store_id: r.store_products.store_id,
          in_stock: r.store_products.in_stock,
        }));
    },
  });
}

export function usePostProductMutations() {
  const qc = useQueryClient();

  const tag = useMutation({
    mutationFn: async (input: {
      postId: string;
      postSource: PostSource;
      storeProductIds: string[];
    }) => {
      if (!input.storeProductIds.length) return;
      const rows = input.storeProductIds.map((pid, i) => ({
        post_id: input.postId,
        post_source: input.postSource,
        store_product_id: pid,
        sort_order: i,
      }));
      const { error } = await (supabase as any).from("post_products").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEY(vars.postId) }),
  });

  const untag = useMutation({
    mutationFn: async (input: { postId: string; storeProductId: string }) => {
      const { error } = await (supabase as any)
        .from("post_products")
        .delete()
        .eq("post_id", input.postId)
        .eq("store_product_id", input.storeProductId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEY(vars.postId) }),
  });

  const reorder = useMutation({
    mutationFn: async (input: { postId: string; orderedIds: string[] }) => {
      await Promise.all(
        input.orderedIds.map((pid, i) =>
          (supabase as any)
            .from("post_products")
            .update({ sort_order: i })
            .eq("post_id", input.postId)
            .eq("store_product_id", pid)
        )
      );
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEY(vars.postId) }),
  });

  return { tag, untag, reorder };
}

export function useStoreProductSearch(storeId: string | null, query: string) {
  return useQuery<{ id: string; name: string; price: number; image_url: string | null; in_stock: boolean | null }[]>({
    queryKey: ["store-product-search", storeId, query],
    enabled: !!storeId,
    queryFn: async () => {
      let q = (supabase as any)
        .from("store_products")
        .select("id, name, price, image_url, in_stock")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .limit(40);
      if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
