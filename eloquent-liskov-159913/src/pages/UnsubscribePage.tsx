import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";
import { Helmet } from "react-helmet-async";

type Status = "loading" | "valid" | "invalid" | "done" | "error" | "already";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid === false && d.reason === "already_unsubscribed") setStatus("already");
        else if (d.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setStatus("done");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
    setProcessing(false);
  };

  return (
    <>
      <Helmet><title>Unsubscribe — ZIVO</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Validating...</p>
              </>
            )}
            {status === "valid" && (
              <>
                <MailX className="h-10 w-10 text-orange-500 mx-auto" />
                <h1 className="text-lg font-bold text-ig-gradient">Unsubscribe from ZIVO emails?</h1>
                <p className="text-sm text-muted-foreground">You will no longer receive transactional emails from us.</p>
                <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Unsubscribe
                </Button>
              </>
            )}
            {status === "done" && (
              <>
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                <h1 className="text-lg font-bold text-ig-gradient">Unsubscribed</h1>
                <p className="text-sm text-muted-foreground">You've been successfully unsubscribed.</p>
              </>
            )}
            {status === "already" && (
              <>
                <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                <h1 className="text-lg font-bold text-ig-gradient">Already Unsubscribed</h1>
                <p className="text-sm text-muted-foreground">This email is already unsubscribed.</p>
              </>
            )}
            {(status === "invalid" || status === "error") && (
              <>
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <h1 className="text-lg font-bold text-ig-gradient">Invalid Link</h1>
                <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or expired.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
