import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, QrCode, Share2, Copy, Download, Camera, Check, AtSign, UserRound, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { QRScannerModal } from "@/components/clock/QRScannerModal";
import { copyText } from "@/lib/native/clipboard";

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

  const profileUrl = user?.id ? `${getPublicOrigin()}/user/${encodeURIComponent(user.id)}` : "";

  const copyLink = async () => {
    try {
      await copyText(profileUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy automatically. Long-press the link to copy.");
    }
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

  const profileName = profile?.full_name || user?.email?.split("@")[0] || "Your profile";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,hsl(var(--muted)/0.55),transparent_280px)]" />

      <header className="sticky top-0 z-20 border-b border-border/45 bg-background/90 px-3 pb-2 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={goBack} className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight text-foreground">QR Profile</h1>
            <p className="truncate text-xs font-medium text-muted-foreground">Share and scan ZIVO profiles</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-xl px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-muted/55 p-1">
            <TabsTrigger value="my-code" className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <QrCode className="h-3.5 w-3.5" /> My Code
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Camera className="h-3.5 w-3.5" /> Scan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-code" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <section className="rounded-[1.5rem] border border-border/55 bg-card p-4 shadow-[0_12px_34px_hsl(var(--foreground)/0.05)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-border/45">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex max-w-full items-center gap-1 text-sm font-bold text-foreground">
                      <span className="truncate">{profileName}</span>
                      {isBlueVerified(profile?.is_verified) && <VerifiedBadge size={14} interactive={false} />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">Public ZIVO profile</p>
                  </div>
                </div>

                <div id="qr-code" className="flex justify-center">
                  <div className="rounded-[1.75rem] border border-border/55 bg-gradient-to-b from-muted/45 to-background p-3 shadow-[0_12px_30px_hsl(var(--foreground)/0.08)]">
                    <div className="rounded-[1.25rem] bg-white p-3 ring-1 ring-black/5">
                      <QRCodeSVG
                        value={profileUrl}
                        size={190}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        imageSettings={{ src: "", height: 0, width: 0, excavate: false }}
                      />
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs font-medium text-muted-foreground">Scan to open this public profile.</p>
              </section>

              <section className="rounded-[1.35rem] border border-border/55 bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                  <AtSign className="h-3.5 w-3.5" />
                  Profile link
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-muted/45 px-3 py-2.5">
                  <input
                    value={profileUrl}
                    readOnly
                    aria-label="Profile link"
                    className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none"
                  />
                  <Button aria-label="Copy link" size="icon" variant="ghost" onClick={() => void copyLink()} className="h-8 w-8 rounded-xl">
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="outline" className="h-12 gap-2 rounded-2xl font-bold" onClick={downloadQR}>
                  <Download className="h-4 w-4" /> Save QR
                </Button>
                <Button
                  className="h-12 gap-2 rounded-2xl bg-foreground font-bold text-background hover:bg-foreground/90"
                  onClick={() => {
                    const name = profile?.full_name || user?.email?.split("@")[0] || "User";
                    if (navigator.share) void navigator.share({ title: `${name} on ZIVO`, text: `Check out ${name}'s profile on ZIVO`, url: profileUrl });
                    else void copyLink();
                  }}
                >
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="scan" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.5rem] border border-border/55 bg-card p-5 text-center shadow-sm">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-[2rem] border border-dashed border-primary/30 bg-primary/[0.03]">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <ScanLine className="h-9 w-9" />
                </div>
              </div>
              <h2 className="mt-5 text-base font-bold text-foreground">Scan a ZIVO profile</h2>
              <p className="mx-auto mt-1 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                Open another profile from a ZIVO QR code. Camera permission is requested only when you start scanning.
              </p>
              <Button onClick={() => setScannerOpen(true)} className="mt-5 h-12 rounded-2xl px-5 font-bold">
                <Camera className="mr-2 h-4 w-4" /> Open camera
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Scan a profile"
      />
    </div>
  );
}
