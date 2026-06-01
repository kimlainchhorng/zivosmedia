/**
 * AffiliateRedirectPage — /r/:slug
 * Resolves the link through affiliate-link-redirect so click metrics stay server-owned.
 */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AffiliateRedirectPage() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("affiliate-link-redirect", {
        body: { slug },
      });
      if (error || data?.error || !data?.target_url) {
        window.location.href = "/";
        return;
      }
      window.location.href = data.target_url;
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}
