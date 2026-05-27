/**
 * AffiliateRedirectPage — /r/:slug
 * Looks up the affiliate link, increments click_count, and redirects.
 */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function AffiliateRedirectPage() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (dbFrom("affiliate_links") as { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string; target_url: string; click_count: number } | null }> } } })
        .select("id, target_url, click_count")
        .eq("slug", slug)
        .maybeSingle();
      if (!data?.target_url) { window.location.href = "/"; return; }
      // Best-effort click increment; don't block redirect if it fails.
      (dbFrom("affiliate_links") as { update: (p: unknown) => { eq: (k: string, v: string) => Promise<unknown> } })
        .update({ click_count: (data.click_count || 0) + 1 })
        .eq("id", data.id);
      // Stamp UTM so downstream attribution can credit the link.
      const sep = data.target_url.includes("?") ? "&" : "?";
      window.location.href = `${data.target_url}${sep}utm_source=zivo&utm_medium=affiliate&utm_campaign=${slug}`;
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}
