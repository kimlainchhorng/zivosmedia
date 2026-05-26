import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, QrCode, Share2, Copy, Download, Camera, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { QRScannerModal } from "@/components/clock/QRScannerModal";

export default function QRProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my-code");
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; share_code: string | null; is_verified?: boolean | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, avatar_url, share_code, is_verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [user]);

  const profileUrl = profile?.share_code
    ? getProfileShareUrl(profile.share_code)
    : `${getPublicOrigin()}/user/${user?.id ?? ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Render the QR SVG to a base-64 PNG, then save / share it. On native iOS
  // the browser-style `<a download>` trick fails inside WKWebView (the file
  // either doesn't save or lands in a hidden Downloads folder), so we write
  // through @capacitor/filesystem and hand the file to @capacitor/share so
  // the user can route it to Photos / Files / Messages.
  const downloadQR = async () => {
    const svg = document.querySelector("#qr-code svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw a solid white background under the QR for legibility on dark
    // shares (Photos thumbnails, Messages bubbles, etc.).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = async () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");

      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { Filesystem, Directory } = await import("@capacitor/filesystem");
          const filename = `zivo-qr-${Date.now()}.png`;
          // Strip the `data:image/png;base64,` prefix — Filesystem.writeFile
          // expects raw base64 when encoding is omitted.
          const base64 = dataUrl.split(",", 2)[1] ?? "";
          const written = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache, // Cache → cleanable; we only need the URI for Share
          });
          try {
            const { Share } = await import("@capacitor/share");
            await Share.share({
              title: "My ZIVO QR code",
              text: "Scan to open my ZIVO profile",
              files: [written.uri],
              dialogTitle: "Save QR",
            });
            toast.success("QR ready to save");
          } catch (err: any) {
            // User-cancelled is reported as an error in some Capacitor versions.
            if (!String(err?.message || "").toLowerCase().includes("cancel")) {
              toast.error("Couldn't open share sheet");
            }
          }
          return;
        }
      } catch {
        // Plugin not in this binary — fall through to the web download.
      }

      // Web fallback (and last-resort for older binaries).
      const link = document.createElement("a");
      link.download = "my-qr-code.png";
      link.href = dataUrl;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(data);
  };

  // Parse a scanned URL and route to the matching internal page. Supports
  //   /p/<code>            (ShareProfileRedirect)
  //   /user/<userId>
  //   /u/<username>        (UsernameRedirectPage)
  // Same-origin URLs become an internal navigate; cross-origin we just toast.
  const handleScan = async (raw: string): Promise<{ success: boolean; message: string }> => {
    try {
      const candidate = raw.trim();
      const url = candidate.startsWith("http")
        ? new URL(candidate)
        : new URL(candidate, getPublicOrigin());
      const path = url.pathname;
      const sameOrigin = url.origin === window.location.origin || url.origin === getPublicOrigin();
      if (!sameOrigin) {
        return { success: false, message: "Not a ZIVO profile link" };
      }
      if (/^\/(p|u|user)\//.test(path)) {
        // Close scanner first, then navigate, so the dialog unmounts cleanly.
        setScannerOpen(false);
        setTimeout(() => navigate(path + url.search), 50);
        return { success: true, message: "Opening profile…" };
      }
      return { success: false, message: "Code doesn't link to a ZIVO profile" };
    } catch {
      return { success: false, message: "Couldn't read this code" };
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/more");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="h-5 w-5" /></Button>
          <QrCode className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">QR Profile</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-4">
        <TabsList className="w-full">
          <TabsTrigger value="my-code" className="flex-1 gap-1"><QrCode className="h-3 w-3" /> My Code</TabsTrigger>
          <TabsTrigger value="scan" className="flex-1 gap-1"><Camera className="h-3 w-3" /> Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="my-code" className="mt-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
            <Card className="p-8 mb-6" id="qr-code">
              <QRCodeSVG value={profileUrl} size={200} level="H"
                bgColor="transparent" fgColor="hsl(var(--foreground))"
                imageSettings={{ src: "", height: 0, width: 0, excavate: false }} />
            </Card>

            <p className="text-sm text-muted-foreground mb-1 text-center inline-flex items-center justify-center gap-1">
              <span>{profile?.full_name || user?.email?.split("@")[0] || "Your profile"}</span>
              {isBlueVerified(profile?.is_verified) && <VerifiedBadge size={14} interactive={false} />}
            </p>
            <p className="text-xs text-muted-foreground mb-4 text-center">Scan this code to view my profile</p>

            <div className="w-full space-y-3">
              <Card className="p-3 flex items-center gap-2">
                <Input value={profileUrl} readOnly className="text-xs flex-1" />
                <Button aria-label="Copy link" size="icon" variant="outline" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </Card>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={downloadQR}>
                  <Download className="h-4 w-4" /> Save QR
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                  const name = profile?.full_name || user?.email?.split("@")[0] || "User";
                  if (navigator.share) navigator.share({ title: `${name} on ZIVO`, text: `Check out ${name}'s profile on ZIVO`, url: profileUrl });
                  else copyLink();
                }}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="scan" className="mt-6">
          <div className="flex flex-col items-center py-12">
            <div className="h-48 w-48 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center mb-4">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-1">
              Scan another ZIVO QR code to open that profile.
            </p>
            <p className="text-[11px] text-muted-foreground/70 text-center mb-5">
              We'll ask for camera permission the first time.
            </p>
            <Button onClick={() => setScannerOpen(true)} className="gap-2">
              <Camera className="h-4 w-4" /> Open camera
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Scan a profile"
      />
    </div>
  );
}
