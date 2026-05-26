/**
 * ChatAttachMenu — upgraded attachment sheet UI.
 * Lock & Unlock requires Chat+ or Pro ZIVO+ plan.
 */
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus";
import Video from "lucide-react/dist/esm/icons/video";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Timer from "lucide-react/dist/esm/icons/timer";
import Lock from "lucide-react/dist/esm/icons/lock";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import Gift from "lucide-react/dist/esm/icons/gift";
import Coins from "lucide-react/dist/esm/icons/coins";
import ScanLine from "lucide-react/dist/esm/icons/scan-line";
import FileUp from "lucide-react/dist/esm/icons/file-up";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import UserSquare from "lucide-react/dist/esm/icons/user-square";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Compass from "lucide-react/dist/esm/icons/compass";
import X from "lucide-react/dist/esm/icons/x";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createPortal } from "react-dom";

interface ChatAttachMenuProps {
  open: boolean;
  onClose: () => void;
  onImageSelect: () => void;
  onVideoSelect: () => void;
  onLocationShare: () => void;
  onToggleDisappearing: () => void;
  onLockedImageSelect?: () => void;
  onToggleSensitiveMedia?: () => void;
  onSendGift?: () => void;
  onOpenWallet?: () => void;
  onScanDocument?: () => void;
  onFileSelect?: () => void;
  onCreatePoll?: () => void;
  onShareContact?: () => void;
  onShareSocial?: () => void;
  onShareZivoCard?: () => void;
  disappearingEnabled: boolean;
  sensitiveMediaMarked?: boolean;
  /** Override label of the disappearing-messages menu item (e.g. "1d", "7d", "30d", "Off"). Defaults to "24h". */
  disappearingLabel?: string;
}

const menuItems = [
  { id: "image", label: "Photo", hint: "Camera roll", icon: ImagePlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "video", label: "Video", hint: "Clip or GIF", icon: Video, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "sensitive", label: "18+", hint: "Blur next media", icon: ShieldAlert, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { id: "file", label: "File", hint: "PDF and docs", icon: FileUp, color: "text-sky-500", bg: "bg-sky-500/10" },
  { id: "scan", label: "Scan", hint: "Quick document", icon: ScanLine, color: "text-cyan-500", bg: "bg-cyan-500/10", isNew: true },
  { id: "location", label: "Location", hint: "Share pin", icon: MapPin, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "contact", label: "Contact", hint: "Send profile", icon: UserSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "poll", label: "Poll", hint: "Vote together", icon: BarChart3, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  { id: "social", label: "Social", hint: "Share links", icon: Share2, color: "text-[#1877F2]", bg: "bg-blue-500/10" },
  { id: "zivo", label: "ZIVO", hint: "App actions", icon: Compass, color: "text-pink-500", bg: "bg-pink-500/10", isNew: true },
  { id: "gift", label: "Gift", hint: "Send a gift", icon: Gift, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "money", label: "Money", hint: "Fast transfer", icon: Coins, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "locked", label: "Locked", hint: "Paid unlock", icon: Lock, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "disappearing", label: "24h", hint: "Auto delete", icon: Timer, color: "text-amber-500", bg: "bg-amber-500/10" },
] as const;

type ChatAttachMenuItem = (typeof menuItems)[number] & {
  isNew?: boolean;
};

/** Plans that include Lock & Unlock */
const LOCK_UNLOCK_PLANS = new Set(["chat", "pro"]);
const USAGE_STORAGE_KEY = "chat:attach:usage:v2";
const RECENT_STORAGE_KEY = "chat:attach:recent:v2";
const RECENT_LIMIT = 3;
const PRIMARY_VISIBLE_COUNT = 8;

export default function ChatAttachMenu({
  open, onClose, onImageSelect, onVideoSelect, onLocationShare, onToggleDisappearing, onLockedImageSelect,
  onToggleSensitiveMedia, onSendGift, onOpenWallet, onScanDocument, onFileSelect, onCreatePoll, onShareContact, onShareSocial, onShareZivoCard, disappearingEnabled, sensitiveMediaMarked = false, disappearingLabel,
}: ChatAttachMenuProps) {
  const { isPlus, plan } = useZivoPlus();
  const { isOFMode: zivoOFMode } = useZivoOFMode();
  const navigate = useNavigate();
  const visibleItems = zivoOFMode
    ? menuItems.filter((it) => ["image", "video", "sensitive", "locked", "money", "gift"].includes(it.id))
    : menuItems;
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const getAttachTriggerElement = useRef(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.matches("[data-attach-trigger]")) {
      return active;
    }
    const visibleTriggers = Array.from(document.querySelectorAll<HTMLElement>("[data-attach-trigger]"));
    return visibleTriggers.find((el) => el.offsetParent !== null) ?? visibleTriggers[0] ?? null;
  });

  // Calculate position relative to viewport when opening — clamp horizontally so
  // the wider tablet/desktop panel never overflows the right edge.
  useEffect(() => {
    if (!open) { setPos(null); return; }
    const el = getAttachTriggerElement.current();
    if (el) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const panelWidth = vw >= 768 ? 460 : vw >= 640 ? 400 : 300;
      const margin = 12;
      const maxLeft = Math.max(margin, vw - panelWidth - margin);
      setPos({ left: Math.min(rect.left, maxLeft), bottom: window.innerHeight - rect.top + 10 });
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setShowAll(false);
      return;
    }
    try {
      const usageRaw = localStorage.getItem(USAGE_STORAGE_KEY);
      const recentRaw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (usageRaw) {
        const parsed = JSON.parse(usageRaw) as Record<string, number>;
        setUsageMap(parsed || {});
      }
      if (recentRaw) {
        const parsed = JSON.parse(recentRaw) as string[];
        setRecentIds(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // Ignore malformed localStorage payloads.
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const canUseLocked = isPlus && plan && LOCK_UNLOCK_PLANS.has(plan);

  const isActionUnavailable = (id: string): boolean => {
    if (id === "gift") return !onSendGift;
    if (id === "money") return !onOpenWallet;
    if (id === "file") return !onFileSelect;
    if (id === "poll") return !onCreatePoll;
    if (id === "contact") return !onShareContact;
    if (id === "social") return !onShareSocial;
    if (id === "scan") return !onScanDocument;
    if (id === "sensitive") return !onToggleSensitiveMedia;
    if (id === "zivo") return !onShareZivoCard;
    return false;
  };

  const unavailableReason = (id: string): string | null => {
    if (id === "locked" && !canUseLocked) return "Requires Chat+ or Pro";
    if (isActionUnavailable(id)) return "Not available here";
    return null;
  };

  const trackItemUsage = (id: string) => {
    try {
      const nextUsage = { ...usageMap, [id]: (usageMap[id] || 0) + 1 };
      setUsageMap(nextUsage);
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(nextUsage));

      const nextRecent = [id, ...recentIds.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
      setRecentIds(nextRecent);
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
      // Ignore storage write issues.
    }
  };

  const sortedItems = [...visibleItems].sort((a, b) => {
    const aScore = usageMap[a.id] || 0;
    const bScore = usageMap[b.id] || 0;
    return bScore - aScore;
  });

  const recentItems = recentIds
    .map((id) => visibleItems.find((item) => item.id === id))
    .filter((item): item is typeof visibleItems[number] => !!item);

  const deduped = [...recentItems, ...sortedItems].filter(
    (item, index, arr) => arr.findIndex((it) => it.id === item.id) === index,
  );

  const primaryItems = deduped.slice(0, PRIMARY_VISIBLE_COUNT);
  const secondaryItems = deduped.slice(PRIMARY_VISIBLE_COUNT);
  const renderedItems = showAll ? deduped : primaryItems;

  const handleAction = (id: string) => {
    if (isActionUnavailable(id)) return;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    switch (id) {
      case "gift": onSendGift?.(); break;
      case "money": onOpenWallet?.(); break;
      case "scan":
        onScanDocument?.();
        break;
      case "file": onFileSelect?.(); break;
      case "poll": onCreatePoll?.(); break;
      case "contact": onShareContact?.(); break;
      case "social": onShareSocial?.(); break;
      case "sensitive":
        onToggleSensitiveMedia?.();
        trackItemUsage(id);
        return;
      case "zivo": onShareZivoCard?.(); break;
      case "image": onImageSelect(); break;
      case "video": onVideoSelect(); break;
      case "location": onLocationShare(); break;
      case "locked":
        if (!canUseLocked) {
          toast("Lock & Unlock requires Chat+ or Pro plan", {
            action: { label: "Upgrade", onClick: () => navigate("/zivo-plus") },
          });
          onClose();
          return;
        }
        onLockedImageSelect?.();
        break;
      case "disappearing": onToggleDisappearing(); break;
    }
    trackItemUsage(id);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <>
          <motion.div
            key="attach-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[1299]"
            onClick={onClose}
          />
          <motion.div
            key="attach-panel"
            initial={{ y: 16, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 26, stiffness: 420 }}
            className="fixed z-[1401] bg-background/95 backdrop-blur-xl border border-border/20 rounded-2xl shadow-2xl p-3 sm:p-4 w-[320px] sm:w-[420px] md:w-[520px]"
            style={{ left: pos.left, bottom: pos.bottom }}
            role="dialog"
            aria-label="Attachment menu"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Share Something</p>
                <p className="text-[11px] text-muted-foreground">Upgraded quick actions for chat</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60"
                aria-label="Close attachments"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recentItems.length > 0 && (
              <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Recent</span>
                {recentItems.map((item) => {
                  const reason = unavailableReason(item.id);
                  return (
                    <button
                      key={`recent-${item.id}`}
                      type="button"
                      onClick={() => handleAction(item.id)}
                      disabled={isActionUnavailable(item.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border/50 bg-muted/40 text-[11px] text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={reason ? `${item.label} (${reason})` : item.label}
                      title={reason ? `${item.label} · ${reason}` : item.label}
                    >
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 sm:gap-3">
              {renderedItems.map((item: ChatAttachMenuItem) => {
                const isLockedGated = item.id === "locked" && !canUseLocked;
                const isUnavailable = isActionUnavailable(item.id);
                const reason = unavailableReason(item.id);
                return (
                  <button type="button"
                    key={item.id}
                    onClick={() => handleAction(item.id)}
                    disabled={isUnavailable}
                    className="flex flex-col items-center gap-1.5 group relative rounded-xl p-1.5 hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={reason ? `${item.label} (${reason})` : item.label}
                    title={reason ? `${item.label} · ${reason}` : item.label}
                  >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border border-border/60 flex items-center justify-center group-active:scale-90 transition-transform ${item.bg} ${
                      item.id === "disappearing" && disappearingEnabled ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    } ${
                      item.id === "sensitive" && sensitiveMediaMarked ? "ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-background" : ""
                    } ${isLockedGated ? "opacity-50" : ""} ${isUnavailable ? "opacity-60" : ""}`}>
                      <item.icon className={`w-[18px] h-[18px] sm:w-5 sm:h-5 ${item.color}`} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap leading-none">
                      {item.id === "disappearing" && disappearingLabel ? disappearingLabel : item.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/80 leading-none whitespace-nowrap">
                      {item.hint}
                    </span>
                    {item.isNew && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">NEW</span>
                    )}
                    {item.id === "disappearing" && disappearingEnabled && (
                      <span className="text-[8px] text-primary font-bold -mt-1">ON</span>
                    )}
                    {item.id === "sensitive" && sensitiveMediaMarked && (
                      <span className="text-[8px] text-fuchsia-500 font-bold -mt-1">ON</span>
                    )}
                    {isLockedGated && (
                      <span className="absolute -top-1 -right-1 text-[7px] font-bold px-1 py-0.5 rounded-full bg-amber-500 text-white">PRO</span>
                    )}
                    {isUnavailable && !isLockedGated && (
                      <span className="absolute -top-1 -right-1 text-[7px] font-bold px-1 py-0.5 rounded-full bg-muted-foreground text-background">OFF</span>
                    )}
                  </button>
                );
              })}
              {secondaryItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="flex flex-col items-center gap-1.5 group relative rounded-xl p-1.5 hover:bg-muted/40 transition-colors"
                  aria-label={showAll ? "Show less actions" : "Show more actions"}
                  title={showAll ? "Show less" : "Show more"}
                >
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border border-border/60 bg-muted/40 flex items-center justify-center group-active:scale-90 transition-transform">
                    {showAll ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap leading-none">
                    {showAll ? "Less" : `More (${secondaryItems.length})`}
                  </span>
                  <span className="text-[9px] text-muted-foreground/80 leading-none whitespace-nowrap">Actions</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
