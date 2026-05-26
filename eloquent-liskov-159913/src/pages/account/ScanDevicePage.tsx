/**
 * ScanDevicePage — scanner side. Caller MUST already be signed in to
 * the same account. We open the camera, look for a `zivo-link:<token>` QR,
 * and call device-link-claim.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "scanning" | "claiming" | "success" | "error";

export default function ScanDevicePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopScanner = () => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* noop */
    }
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    setErrorMsg(null);
    setStatus("scanning");
    try {
      // Lazy import to keep bundle small
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const back =
        devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
      if (!back) throw new Error("No camera found");

      const controls = await reader.decodeFromVideoDevice(
        back.deviceId,
        videoRef.current!,
        async (result, _err, ctrl) => {
          if (!result) return;
          const text = result.getText();
          if (!text.startsWith("zivo-link:")) return;
          const token = text.slice("zivo-link:".length);
          ctrl.stop();
          await claim(token);
        },
      );
      controlsRef.current = controls;
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not access camera. Please grant camera permission.");
      setStatus("error");
    }
  };

  const claim = async (token: string) => {
    setStatus("claiming");
    const label = (() => {
      const ua = navigator.userAgent;
      if (/iPhone/i.test(ua)) return "iPhone";
      if (/iPad/i.test(ua)) return "iPad";
      if (/Android/i.test(ua)) return "Android";
      if (/Mac/i.test(ua)) return "Mac";
      if (/Windows/i.test(ua)) return "Windows PC";
      return "Linked device";
    })();

    const { data, error } = await supabase.functions.invoke("device-link-claim", {
      body: { token, deviceLabel: label },
    });
    if (error || !data?.success) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Could not link device";
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
      return;
    }
    setStatus("success");
    toast.success("Device linked");
    stopScanner();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Scan to Link · ZIVO" description="Scan a ZIVO QR code to approve another device." />

      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/85 px-4 backdrop-blur-xl safe-area-top"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)", paddingBottom: 12 }}
      >
        <button type="button"
          aria-label="Back"
          onClick={() => {
            stopScanner();
            navigate(-1);
          }}
          className="-ml-2 rounded-full p-2 hover:bg-foreground/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Scan to Link</h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-6 pb-24 text-center">
        <p className="text-sm text-muted-foreground">
          Point this camera at the QR code shown on your other device.
        </p>

        <Card className="w-full overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square w-full bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {status === "idle" && (
                <div className="absolute inset-0 grid place-items-center bg-foreground/40 text-background">
                  <Button onClick={startScanner} variant="secondary">
                    <Camera className="mr-2 h-4 w-4" /> Start camera
                  </Button>
                </div>
              )}
              {(status === "scanning" || status === "claiming") && (
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              )}
              {status === "success" && (
                <div className="absolute inset-0 grid place-items-center bg-primary/85 text-primary-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-14 w-14" />
                    <div className="text-base font-semibold">Device linked</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {status === "error" && errorMsg && (
          <div className="flex w-full items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {status === "success" ? (
          <Button className="w-full" onClick={() => navigate("/account/linked-devices")}>
            Done
          </Button>
        ) : status === "error" ? (
          <Button className="w-full" onClick={startScanner}>Try again</Button>
        ) : null}
      </main>
    </div>
  );
}
