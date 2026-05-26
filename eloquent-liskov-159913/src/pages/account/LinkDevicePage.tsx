/**
 * LinkDevicePage — issuer side of the multi-device QR flow.
 * Generates a short-lived QR token, displays it, and polls until the
 * scanning device claims it.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "loading" | "ready" | "claimed" | "expired" | "error";

export default function LinkDevicePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [claimedDevice, setClaimedDevice] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const issue = async () => {
    setStatus("loading");
    setClaimedDevice(null);
    const { data, error } = await supabase.functions.invoke("device-link-issue", {
      body: { deviceLabel: navigator.userAgent.slice(0, 80) },
    });
    if (error || !data?.token) {
      setStatus("error");
      toast.error(error?.message || "Could not generate QR code");
      return;
    }
    setToken(data.token);
    setExpiresAt(data.expiresAt);
    setStatus("ready");
  };

  useEffect(() => {
    void issue();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && status === "ready") setStatus("expired");
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, status]);

  // Poll for claim
  useEffect(() => {
    if (status !== "ready" || !token) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const { data, error } = await supabase.functions.invoke("device-link-poll", {
        method: "GET" as never,
        // supabase-js doesn't pass query params for GET; use direct fetch fallback below
      } as never).catch(() => ({ data: null, error: null }));

      // Use direct fetch for query-string support:
      const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/device-link-poll?token=${encodeURIComponent(token)}`;
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          },
        });
        const json = await res.json();
        if (json.status === "claimed") {
          setStatus("claimed");
          setClaimedDevice(json.deviceLabel ?? "New device");
          if (pollRef.current) window.clearInterval(pollRef.current);
        } else if (json.status === "expired") {
          setStatus("expired");
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch (e) {
        // ignore transient errors
      }
      void data; void error;
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [status, token]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Link a Device · ZIVO" description="Show a QR code to sign another device into your account." />

      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/85 px-4 backdrop-blur-xl safe-area-top"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)", paddingBottom: 12 }}
      >
        <button type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="-ml-2 rounded-full p-2 hover:bg-foreground/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Link a Device</h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-6 pb-24 text-center">
        <p className="text-sm text-muted-foreground">
          On the device you want to add, open ZIVO and tap <strong>Scan to Link</strong>, then point the camera here.
        </p>

        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            {status === "loading" && (
              <div className="grid h-[240px] w-[240px] place-items-center text-muted-foreground">Generating…</div>
            )}

            {status === "ready" && token && (
              <>
                <div className="rounded-2xl bg-white p-4 shadow-md">
                  <QRCodeSVG value={`zivo-link:${token}`} size={224} level="M" includeMargin={false} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Expires in <span className="font-mono tabular-nums">{fmt(secondsLeft)}</span>
                </div>
              </>
            )}

            {status === "claimed" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-14 w-14 text-primary" />
                <div className="text-base font-semibold">Device linked</div>
                <div className="text-xs text-muted-foreground">{claimedDevice}</div>
                <Button onClick={() => navigate("/account/linked-devices")}>Done</Button>
              </div>
            )}

            {(status === "expired" || status === "error") && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="text-sm text-muted-foreground">
                  {status === "expired" ? "QR code expired." : "Something went wrong."}
                </div>
                <Button onClick={issue}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Generate new code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          For your safety, this QR can only be approved from a device already signed in to your account.
          We never share your password.
        </p>
      </main>
    </div>
  );
}
