import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, QrCode, Share2, Copy, Download, Camera, Check, AtSign, UserRound, ScanLine, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { QRScannerModal } from "@/components/clock/QRScannerModal";
import { copyText } from "@/lib/native/clipboard";
import { cn } from "@/lib/utils";

const TABS = ["my-code", "scan"] as const;
type Tab = (typeof TABS)[number];

export default function QRProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("my-code");
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
    share_code: string | null;
    is_verified?: boolean | null;
  } | null>(null);

  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, avatar_url, share_code, is_verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data as any);
      });
  }, [user]);

  const profileUrl = user?.id
    ? `${getPublicOrigin()}/user/${encodeURIComponent(user.id)}`
    : "";

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

  const downloadQR = async () => {
    const svg = document.querySelector("#qr-code svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
          const base64 = dataUrl.split(",", 2)[1] ?? "";
          const written = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
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
            if (!String(err?.message || "").toLowerCase().includes("cancel")) {
              toast.error("Couldn't open share sheet");
            }
          }
          return;
        }
      } catch {}
      const link = document.createElement("a");
      link.download = "my-qr-code.png";
      link.href = dataUrl;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(data);
  };

  const handleScan = async (
    raw: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const candidate = raw.trim();
      const url = candidate.startsWith("http")
        ? new URL(candidate)
        : new URL(candidate, getPublicOrigin());
      const path = url.pathname;
      const sameOrigin =
        url.origin === window.location.origin ||
        url.origin === getPublicOrigin();
      if (!sameOrigin) return { success: false, message: "Not a ZIVO profile link" };
      if (/^\/(p|u|user)\//.test(path)) {
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

  const profileName =
    profile?.full_name || user?.email?.split("@")[0] || "Your profile";

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (swipeStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - swipeStartX.current;
      swipeStartX.current = null;
      if (Math.abs(diff) < 60) return;
      const idx = TABS.indexOf(activeTab);
      if (diff < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
      else if (diff > 0 && idx > 0) setActiveTab(TABS[idx - 1]);
    },
    [activeTab]
  );

  const tabIdx = TABS.indexOf(activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/7 blur-3xl" />
        <div className="absolute top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/5 blur-3xl" />
        <div className="absolute bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/4 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/85 px-3 pb-2 pt-safe backdrop-blur-2xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={goBack}
            aria-label="Back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <motion.div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <QrCode className="h-5 w-5" />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-foreground">QR Profile</h1>
            <p className="truncate text-xs text-muted-foreground">Share and scan ZIVO profiles</p>
          </div>
        </div>
      </header>

      <main
        className="relative z-10 mx-auto max-w-2xl px-4 pt-5 pb-28"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Tab switcher — spring-animated pill */}
        <div className="mb-5 flex items-center gap-1 rounded-2xl bg-muted/50 p-1 ring-1 ring-border/25">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {activeTab === tab && (
                <motion.span
                  layoutId="qr-tab-pill"
                  className="absolute inset-0 rounded-xl bg-background shadow-sm ring-1 ring-border/30"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab === "my-code" ? (
                  <QrCode className="h-3.5 w-3.5" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {tab === "my-code" ? "My Code" : "Scan"}
              </span>
            </button>
          ))}
        </div>

        {/* Swipe indicator dots */}
        <div className="mb-5 flex justify-center gap-1.5">
          {TABS.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full bg-primary"
              animate={{ width: i === tabIdx ? 20 : 6, opacity: i === tabIdx ? 1 : 0.3 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ height: 6 }}
            />
          ))}
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "my-code" ? (
            <motion.div
              key="my-code"
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <MyCodeTab
                profile={profile}
                profileName={profileName}
                profileUrl={profileUrl}
                copied={copied}
                onCopy={() => void copyLink()}
                onDownload={() => void downloadQR()}
                onShare={() => {
                  const name =
                    profile?.full_name || user?.email?.split("@")[0] || "User";
                  if (navigator.share)
                    void navigator.share({
                      title: `${name} on ZIVO`,
                      text: `Check out ${name}'s profile on ZIVO`,
                      url: profileUrl,
                    });
                  else void copyLink();
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="scan"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <ScanTab onOpenCamera={() => setScannerOpen(true)} />
            </motion.div>
          )}
        </AnimatePresence>
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

/* ─── My Code Tab ─── */
function MyCodeTab({
  profile,
  profileName,
  profileUrl,
  copied,
  onCopy,
  onDownload,
  onShare,
}: {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    share_code: string | null;
    is_verified?: boolean | null;
  } | null;
  profileName: string;
  profileUrl: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  return (
    /* Desktop: two-column grid — QR on left, details on right */
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6 lg:space-y-0">

      {/* QR card */}
      <section className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-[0_20px_60px_hsl(var(--foreground)/0.07)]">
        {/* Gradient header with profile info */}
        <div className="relative bg-gradient-to-br from-primary/12 via-primary/5 to-violet-500/8 px-5 pt-6 pb-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl ring-2 ring-background shadow-md">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/15">
                  <UserRound className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="inline-flex max-w-full items-center gap-1 text-sm font-bold text-foreground">
                <span className="truncate">{profileName}</span>
                {isBlueVerified(profile?.is_verified) && (
                  <VerifiedBadge size={14} interactive={false} />
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">Public ZIVO profile</p>
            </div>
          </div>
        </div>

        {/* QR with breathing glow */}
        <div className="flex flex-col items-center px-5 pb-6 pt-4">
          <div id="qr-code" className="flex justify-center">
            <motion.div
              className="rounded-[2.25rem]"
              animate={{
                boxShadow: [
                  "0 0 0px 0px hsl(var(--primary)/0.0)",
                  "0 0 32px 4px hsl(var(--primary)/0.22)",
                  "0 0 0px 0px hsl(var(--primary)/0.0)",
                ],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="rounded-[2rem] border border-border/40 bg-gradient-to-b from-muted/30 to-background p-3 shadow-[0_8px_24px_hsl(var(--foreground)/0.06)]">
                <div className="rounded-[1.5rem] bg-white p-3 ring-1 ring-black/8">
                  <QRCodeSVG
                    value={profileUrl || "https://zivosmedia.com"}
                    size={200}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    imageSettings={{ src: "", height: 0, width: 0, excavate: false }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
          <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
            Scan to open this public profile
          </p>
        </div>
      </section>

      {/* Right column on desktop / stacked below on mobile */}
      <div className="space-y-4">
        {/* Profile link */}
        <section className="rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <AtSign className="h-3.5 w-3.5" />
            Profile link
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5">
            <input
              value={profileUrl}
              readOnly
              aria-label="Profile link"
              className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={onCopy}
              aria-label="Copy link"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </section>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDownload}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card text-sm font-bold text-foreground shadow-sm transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-4 w-4" /> Save QR
          </button>
          <button
            onClick={onShare}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>

        {/* Tips — visible on desktop where there's space */}
        <section className="hidden rounded-2xl border border-border/40 bg-card p-4 shadow-sm lg:block">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tips
          </p>
          <div className="space-y-3">
            {[
              "Share your QR anywhere — messages, email, or print it out",
              "Anyone who scans it will land directly on your public profile",
              "Your profile link stays the same even if you change your name",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                <p className="text-xs leading-relaxed text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─── Scan Tab ─── */
function ScanTab({ onOpenCamera }: { onOpenCamera: () => void }) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6 lg:space-y-0">
      {/* Scan frame card */}
      <section className="overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm">
        <div className="relative flex flex-col items-center px-6 pt-10 pb-8">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

          {/* Scan target */}
          <div className="relative mb-6 h-52 w-52">
            {/* Animated corner brackets */}
            {[
              "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
              "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
              "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
              "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
            ].map((cls, i) => (
              <motion.div
                key={i}
                className={`absolute h-9 w-9 border-primary ${cls}`}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.15,
                }}
              />
            ))}

            {/* Center pulse icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary"
                animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ScanLine className="h-9 w-9" />
              </motion.div>
            </div>

            {/* Sweep line */}
            <motion.div
              className="absolute left-5 right-5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"
              animate={{ top: ["18%", "82%", "18%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <h2 className="text-base font-bold text-foreground">Scan a ZIVO profile</h2>
          <p className="mx-auto mt-2 max-w-[260px] text-center text-sm leading-relaxed text-muted-foreground">
            Open another profile from a ZIVO QR code. Camera permission is
            requested only when you start scanning.
          </p>

          <button
            onClick={onOpenCamera}
            className="mt-6 flex h-12 items-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background shadow-md transition hover:bg-foreground/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Camera className="h-4 w-4" /> Open camera
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          How it works
        </p>
        <div className="space-y-4">
          {[
            {
              icon: Smartphone,
              label: "Show someone your QR",
              desc: "Let another user scan your code to instantly open your profile",
            },
            {
              icon: QrCode,
              label: "Scan someone else's code",
              desc: "Tap Open camera and point at their QR — you'll land on their profile",
            },
            {
              icon: ScanLine,
              label: "Works on any ZIVO QR",
              desc: "Any code generated from a ZIVO profile is supported",
            },
          ].map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
