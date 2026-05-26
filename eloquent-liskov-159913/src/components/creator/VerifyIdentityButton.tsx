/**
 * VerifyIdentityButton — opens Stripe Identity verification.
 *
 * Calls create-identity-verification-session, redirects the user to Stripe's
 * hosted verification page. The webhook (identity.verification_session.*)
 * flips kyc_submissions.status + creator_profiles.is_verified on completion.
 */
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props extends Omit<ButtonProps, "onClick"> {
  role?: "creator" | "driver" | "host";
  returnUrl?: string;
  label?: string;
}

export function VerifyIdentityButton({
  role = "creator",
  returnUrl,
  label = "Verify identity",
  className,
  ...rest
}: Props) {
  const [loading, setLoading] = useState(false);
  const start = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-identity-verification-session", {
        body: {
          role,
          return_url: returnUrl ?? `${window.location.origin}${window.location.pathname}?kyc=done`,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.url;
      if (!url) throw new Error("Stripe did not return a verification URL");
      window.location.assign(url);
    } catch (e: any) {
      toast.error(e?.message || "Could not start identity verification");
      setLoading(false);
    }
  };

  return (
    <Button onClick={start} disabled={loading} className={className} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
      {label}
      {!loading && <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />}
    </Button>
  );
}
