import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, Send, MessageCircle, Mail, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

interface ProfileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  username?: string | null;
  fullName?: string | null;
}

export default function ProfileShareDialog({
  open,
  onOpenChange,
  url,
  username,
  fullName,
}: ProfileShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareTitle = fullName ? `${fullName} on ZIVO` : "My ZIVO profile";
  const shareText = username ? `Check out @${username} on ZIVO` : "Check out my ZIVO profile";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("profile-share-qr");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const xml = serializer.serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = `zivo-qr-${username || "profile"}.png`;
        a.click();
        URL.revokeObjectURL(dlUrl);
        URL.revokeObjectURL(svgUrl);
        toast.success("QR code saved");
      }, "image/png");
    };
    img.src = svgUrl;
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareTitle, text: shareText, url });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  // Encoded URL/text for share links
  const enc = (s: string) => encodeURIComponent(s);
  const shareTargets = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      bg: "bg-green-500/15",
      iconColor: "text-green-500",
      href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: Send,
      bg: "bg-sky-500/15",
      iconColor: "text-sky-500",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`,
    },
    {
      id: "x",
      label: "X",
      icon: ExternalLink,
      bg: "bg-foreground/10",
      iconColor: "text-foreground",
      href: `https://x.com/intent/post?text=${enc(shareText)}&url=${enc(url)}`,
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      bg: "bg-rose-500/15",
      iconColor: "text-rose-500",
      href: `mailto:?subject=${enc(shareTitle)}&body=${enc(`${shareText}\n${url}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share your profile</DialogTitle>
          <DialogDescription>
            Anyone with this link or QR code can visit your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <div className="p-3 bg-white rounded-2xl border border-border/40 shadow-sm">
            <QRCodeSVG
              id="profile-share-qr"
              value={url || "https://hizivo.com"}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* URL row */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={url} readOnly className="text-xs font-mono h-10 rounded-xl" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 rounded-xl shrink-0 px-3"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="h-9 rounded-xl text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Save QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNativeShare}
              className="h-9 rounded-xl text-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              More…
            </Button>
          </div>
        </div>

        {/* Social share targets */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Share to
          </p>
          <div className="grid grid-cols-4 gap-2">
            {shareTargets.map((t) => {
              const Icon = t.icon;
              return (
                <a
                  key={t.id}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
                >
                  <div className={`h-9 w-9 rounded-full ${t.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${t.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-medium">{t.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
