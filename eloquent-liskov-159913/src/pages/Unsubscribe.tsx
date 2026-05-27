import { useEffect, useState } from "react";
import { useSearchParams , Link} from "react-router-dom";
import { Loader2, MailCheck, MailX, AlertTriangle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type UnsubscribeState = "checking" | "ready" | "submitting" | "success" | "invalid" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<UnsubscribeState>("checking");
  const [message, setMessage] = useState("Validating your unsubscribe link...");
  const token = searchParams.get("token") ?? "";

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token) {
        setState("invalid");
        setMessage("This unsubscribe link is missing or invalid.");
        return;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          {
            headers: { apikey: supabaseAnonKey },
          }
        );
        const data = await response.json().catch(() => null);

        if (!active) return;

        if (response.ok && data?.valid) {
          setState("ready");
          setMessage("Click below to unsubscribe from these emails.");
          return;
        }

        setState("invalid");
        setMessage(data?.error || "This unsubscribe link has expired or was already used.");
      } catch {
        if (!active) return;
        setState("error");
        setMessage("We could not validate this unsubscribe link right now.");
      }
    };

    validateToken();
    return () => {
      active = false;
    };
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });

      if (error || data?.error) {
        setState("error");
        setMessage(data?.error || "We could not complete your unsubscribe request.");
        return;
      }

      setState("success");
      setMessage("You have been unsubscribed successfully.");
    } catch {
      setState("error");
      setMessage("We could not complete your unsubscribe request.");
    }
  };

  const icon = {
    checking: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
    ready: <MailX className="h-8 w-8 text-primary" />,
    submitting: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
    success: <MailCheck className="h-8 w-8 text-primary" />,
    invalid: <AlertTriangle className="h-8 w-8 text-primary" />,
    error: <AlertTriangle className="h-8 w-8 text-primary" />,
  }[state];

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <SEOHead title="Unsubscribe | ZIVO" description="Manage your ZIVO email preferences." noIndex />
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Email preferences</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>

        {state === "ready" && (
          <Button className="mt-6 w-full" onClick={handleUnsubscribe}>
            Confirm unsubscribe
          </Button>
        )}

        {state === "success" && (
          <Button className="mt-6 w-full" asChild>
            <Link to="/">Back to ZIVO</Link>
          </Button>
        )}

        {(state === "invalid" || state === "error") && (
          <Button variant="outline" className="mt-6 w-full" asChild>
            <Link to="/help">Contact support</Link>
          </Button>
        )}
      </section>
    </main>
  );
}
