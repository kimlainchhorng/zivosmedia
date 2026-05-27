/**
 * StoreSideRail — desktop-only sticky right column for StoreProfilePage.
 * Hosts mini map, address, primary CTAs, and (for lodging) the stay selector.
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Copy,
  Check,
  Clock,
  Lock,
  Facebook,
  Instagram,
  Send as TelegramIcon,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { isAllowedSocialUrl } from "@/lib/urlSafety";
import { getStoreStatus } from "@/utils/storeStatus";
import { LodgingStaySelector } from "@/components/lodging/LodgingStaySelector";
import StoreMiniMap from "./StoreMiniMap";
import type { StoreProfile } from "@/hooks/useStoreProfile";

interface StoreSideRailProps {
  store: StoreProfile;
  hasBooking: boolean;
  loadingBooking: boolean;
  bookingSource: string | null;
  callable: boolean;
  chattable: boolean;
  phoneNumber: string;
  onOpenChat: () => void;
  isLodging: boolean;
  // Lodging stay
  stay?: { checkIn: string; checkOut: string; adults: number; children: number };
  onStayChange?: (next: { checkIn: string; checkOut: string; adults: number; children: number }) => void;
  roomsMinPriceCents?: number;
  hasPublishedRooms?: boolean;
  // Auto-repair Book CTA
  showBookService?: boolean;
  onBookService?: () => void;
  userLoc?: { lat: number; lng: number } | null;
}

async function copyText(value: string): Promise<void> {
  if (!value) throw new Error("Nothing to copy");
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) throw new Error("Copy command failed");
  }
}

export default function StoreSideRail({
  store,
  hasBooking,
  loadingBooking,
  bookingSource,
  callable,
  chattable,
  phoneNumber,
  onOpenChat,
  isLodging,
  stay,
  onStayChange,
  roomsMinPriceCents,
  hasPublishedRooms = true,
  showBookService,
  onBookService,
  userLoc,
}: StoreSideRailProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const market = (store as any).market || (store as any).country;
  const status = store.hours || isLodging
    ? getStoreStatus(isLodging ? "Open 24 hours" : store.hours as string, market)
    : null;

  const formattedPhone = phoneNumber
    ? phoneNumber.startsWith("+")
      ? phoneNumber
      : `+855 ${phoneNumber}`
    : "";
  const telHref = phoneNumber
    ? `tel:${phoneNumber.startsWith("+") ? phoneNumber.replace(/\s+/g, "") : `+855${phoneNumber.replace(/\s+/g, "")}`}`
    : "";
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/grocery/shop/${store.slug}`
    : "";

  const handleCopyAddress = async () => {
    if (!store.address) return;
    try {
      await copyText(store.address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  const copyShareUrl = async () => {
    try {
      await copyText(shareUrl);
      setShareCopied(true);
      toast.success("Hotel link copied");
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      try {
        window.prompt("Copy this hotel link", shareUrl);
      } catch {
        toast.error("Couldn't copy hotel link");
      }
    }
  };

  const handleNativeShare = async () => {
    const shareData = { title: store.name, text: store.description ?? store.name, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Share sheet opened");
        return;
      }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "AbortError") return;
    }

    await copyShareUrl();
  };

  const handleRideThere = () => {
    const params = new URLSearchParams({ destination: store.address ?? store.name });
    if (store.latitude && store.longitude) {
      params.set("destLat", String(store.latitude));
      params.set("destLng", String(store.longitude));
    }
    navigate(`/rides/hub?${params.toString()}`);
  };

  const socials: Array<{ key: string; url: string | null; icon: React.ReactNode; label: string; cls: string }> = [
    {
      key: "fb",
      url: (store as any).facebook_url ?? null,
      icon: <Facebook className="h-4 w-4" />,
      label: "Facebook",
      cls: "bg-[#1877F2] hover:bg-[#1466d4]",
    },
    {
      key: "ig",
      url: (store as any).instagram_url ?? null,
      icon: <Instagram className="h-4 w-4" />,
      label: "Instagram",
      cls: "bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45] hover:opacity-90",
    },
    {
      key: "tg",
      url: (store as any).telegram_url ?? null,
      icon: <TelegramIcon className="h-4 w-4" />,
      label: "Telegram",
      cls: "bg-[#0088cc] hover:bg-[#0077b3]",
    },
  ].filter((s) => s.url && isAllowedSocialUrl(s.url));

  return (
    <div className="space-y-2.5 max-h-[calc(100vh-4.25rem)] overflow-y-auto pr-1 pb-12 scrollbar-hide">
      {/* Mini Map */}
      {(store.latitude || store.longitude || store.address) && (
        <StoreMiniMap
          latitude={store.latitude}
          longitude={store.longitude}
          storeId={store.id}
          storeName={store.name}
          slug={store.slug}
          address={store.address}
          userLoc={userLoc}
          isLodging={isLodging}
        />
      )}

      {/* Address card */}
      {store.address && (
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-2xl p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</p>
              <p className="mt-0.5 text-sm text-foreground leading-snug">{store.address}</p>
            </div>
            <button type="button"
              onClick={handleCopyAddress}
              className="h-8 w-8 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Copy address"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {status && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={cn(
                  "text-xs font-semibold",
                  status.status === "open" && "text-emerald-500",
                  status.status === "closing-soon" && "text-amber-500",
                  status.status === "almost-open" && "text-amber-500",
                  status.status === "closed" && "text-red-500",
                )}
              >
                {status.label}
              </span>
              {status.formattedHours && status.label !== status.formattedHours && (
                <span className="text-[11px] text-muted-foreground">· {status.formattedHours}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Primary CTA: Ride There */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleRideThere}
        className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <MapPin className="h-4 w-4" />
        Ride There
      </motion.button>

      {/* Auto-repair: Book Service CTA */}
      {showBookService && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onBookService}
          className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <CalendarCheck className="h-4 w-4" />
          Book a Service
        </motion.button>
      )}

      {/* Quick action pills: Call · Chat · Share */}
      <div className="grid grid-cols-3 gap-2">
        {/* Call */}
        {callable ? (
          <motion.a
            whileTap={{ scale: 0.95 }}
            href={telHref}
            onClick={() => track("store_contact_action", { store_id: store.id, channel: "call", surface: "side_rail" })}
            className="flex flex-col items-center justify-center gap-1 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span className="text-[10px] font-bold">Call</span>
          </motion.a>
        ) : (
          <LockedPill icon={<Phone className="h-4 w-4" />} label="Call" hasBooking={hasBooking} loading={loadingBooking} hasPhone={!!phoneNumber} />
        )}

        {/* Chat */}
        {chattable ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              track("store_contact_action", { store_id: store.id, channel: "chat", surface: "side_rail" });
              onOpenChat();
            }}
            className="flex flex-col items-center justify-center gap-1 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-500/15 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-[10px] font-bold">Chat</span>
          </motion.button>
        ) : (
          <LockedPill icon={<MessageCircle className="h-4 w-4" />} label="Chat" hasBooking={hasBooking} loading={loadingBooking} />
        )}

        {/* Share (always available) */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShareOpen(true)}
          className="flex flex-col items-center justify-center gap-1 h-14 rounded-2xl bg-card/60 border border-border/40 text-foreground hover:bg-card transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-[10px] font-bold">Share</span>
        </motion.button>
      </div>

      {/* Unlock hint */}
      {!loadingBooking && !hasBooking && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Contact unlocks after booking</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {isLodging
                  ? hasPublishedRooms
                    ? "Reserve a room to unlock direct call and chat with this hotel."
                    : "Direct call and chat will unlock after this hotel publishes rooms for booking."
                  : "Complete an order to unlock direct call and chat with this store."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => isLodging && !hasPublishedRooms ? toast.info("Rooms are not published yet. Check back soon.") : navigate("/account/bookings")}
            className="mt-2.5 w-full h-9 rounded-xl gap-2 border-emerald-500/40 bg-background text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300 text-[12px] font-semibold"
          >
            <Lock className="h-3.5 w-3.5" />
            {isLodging && !hasPublishedRooms ? "Rooms not published yet" : "View booking status"}
          </Button>
        </div>
      )}

      {/* Stay selector — lodging only */}
      {isLodging && stay && onStayChange && (
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-2xl p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-2">Your stay</p>
          <LodgingStaySelector
            checkIn={stay.checkIn}
            checkOut={stay.checkOut}
            adults={stay.adults}
            children={stay.children}
            onChange={onStayChange}
            fromPriceCents={roomsMinPriceCents}
          />
        </div>
      )}

      {/* Socials */}
      {socials.length > 0 && (
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-2xl p-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-2">Follow</p>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.url!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={cn(
                  "h-10 flex-1 rounded-xl text-white flex items-center justify-center shadow-sm transition-all",
                  s.cls,
                )}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
        Need help?{" "}
        <Link to="/account/bookings" className="underline hover:text-foreground">
          View my bookings
        </Link>
      </p>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share {store.name}</DialogTitle>
            <DialogDescription>
              Send this hotel page to someone or copy the public link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hotel link</p>
              <p className="mt-1 break-all text-xs font-medium text-foreground">{shareUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={copyShareUrl} className="h-10 gap-2 rounded-xl">
                {shareCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {shareCopied ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" variant="outline" onClick={handleNativeShare} className="h-10 gap-2 rounded-xl">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LockedPill({
  icon,
  label,
  hasBooking,
  loading,
  hasPhone = true,
}: {
  icon: React.ReactNode;
  label: string;
  hasBooking: boolean;
  loading: boolean;
  hasPhone?: boolean;
}) {
  const reason = loading
    ? "Checking booking…"
    : !hasBooking
    ? "Complete a booking to unlock"
    : !hasPhone
    ? "Store hasn't shared a phone — use chat"
    : "Locked";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled
            className="flex flex-col items-center justify-center gap-0.5 h-14 rounded-2xl bg-muted/70 border border-border text-muted-foreground cursor-not-allowed"
          >
            <div className="relative">
              {icon}
              <Lock className="h-2.5 w-2.5 absolute -bottom-1 -right-1.5" />
            </div>
            <span className="text-[10px] font-bold">{label}</span>
            <span className="text-[9px] font-semibold leading-none text-muted-foreground/80">Locked</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
