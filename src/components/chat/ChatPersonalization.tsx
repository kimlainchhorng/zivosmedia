/**
 * ChatPersonalization — Premium wallpaper, bubble color, font size picker
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Palette from "lucide-react/dist/esm/icons/palette";
import Type from "lucide-react/dist/esm/icons/type";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Check from "lucide-react/dist/esm/icons/check";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Eye from "lucide-react/dist/esm/icons/eye";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getWallpaperClass, getThemeColorClass } from "./chatPersonalizationStyles";

interface ChatPersonalizationProps {
  open: boolean;
  onClose: () => void;
  chatPartnerId: string;
  chatPartnerName: string;
  onApply: (settings: { wallpaper: string; themeColor: string; fontSize: string }) => void;
}

interface ChatSettingsRow {
  wallpaper: string | null;
  theme_color: string | null;
  font_size: string | null;
  custom_wallpapers: unknown;
}

const WALLPAPERS = [
  { id: "default", label: "Default", preview: "bg-background border border-border/30" },
  { id: "bubbles", label: "Bubbles", preview: "bg-gradient-to-br from-primary/5 to-accent/10" },
  { id: "sunset", label: "Sunset", preview: "bg-gradient-to-b from-orange-100/60 to-pink-100/60 dark:from-orange-950/30 dark:to-pink-950/30" },
  { id: "ocean", label: "Ocean", preview: "bg-gradient-to-b from-blue-100/60 to-cyan-100/60 dark:from-blue-950/30 dark:to-cyan-950/30" },
  { id: "forest", label: "Forest", preview: "bg-gradient-to-b from-green-100/60 to-emerald-100/60 dark:from-green-950/30 dark:to-emerald-950/30" },
  { id: "midnight", label: "Midnight", preview: "bg-gradient-to-b from-slate-200/60 to-indigo-100/60 dark:from-slate-900/50 dark:to-indigo-950/40" },
  { id: "lavender", label: "Lavender", preview: "bg-gradient-to-b from-purple-100/60 to-violet-100/60 dark:from-purple-950/30 dark:to-violet-950/30" },
  { id: "cherry", label: "Cherry", preview: "bg-gradient-to-b from-rose-100/60 to-red-100/60 dark:from-rose-950/30 dark:to-red-950/30" },
  { id: "gold", label: "Gold", preview: "bg-gradient-to-b from-amber-100/60 to-yellow-100/60 dark:from-amber-950/30 dark:to-yellow-950/30" },
  { id: "slate", label: "Slate", preview: "bg-gradient-to-b from-gray-200/60 to-slate-300/60 dark:from-gray-800/40 dark:to-slate-900/50" },
];

const THEME_COLORS = [
  { id: "default", label: "Default", color: "bg-primary", ring: "ring-primary/40" },
  { id: "rose", label: "Rose", color: "bg-rose-500", ring: "ring-rose-500/40" },
  { id: "orange", label: "Orange", color: "bg-orange-500", ring: "ring-orange-500/40" },
  { id: "emerald", label: "Emerald", color: "bg-emerald-500", ring: "ring-emerald-500/40" },
  { id: "blue", label: "Blue", color: "bg-blue-500", ring: "ring-blue-500/40" },
  { id: "purple", label: "Purple", color: "bg-purple-500", ring: "ring-purple-500/40" },
  { id: "amber", label: "Amber", color: "bg-amber-500", ring: "ring-amber-500/40" },
  { id: "cyan", label: "Cyan", color: "bg-cyan-500", ring: "ring-cyan-500/40" },
  { id: "pink", label: "Pink", color: "bg-pink-400", ring: "ring-pink-400/40" },
  { id: "indigo", label: "Indigo", color: "bg-indigo-500", ring: "ring-indigo-500/40" },
];

const FONT_SIZES = [
  { id: "small", label: "S", size: "text-xs", display: "text-sm" },
  { id: "medium", label: "M", size: "text-sm", display: "text-base" },
  { id: "large", label: "L", size: "text-base", display: "text-lg" },
  { id: "xlarge", label: "XL", size: "text-lg", display: "text-xl" },
];

export default function ChatPersonalization({ open, onClose, chatPartnerId, chatPartnerName, onApply }: ChatPersonalizationProps) {
  const { user } = useAuth();
  const [wallpaper, setWallpaper] = useState("default");
  const [themeColor, setThemeColor] = useState("default");
  const [fontSize, setFontSize] = useState("medium");
  const [customPhotos, setCustomPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("chat_settings" as any)
        .select("wallpaper, theme_color, font_size, custom_wallpapers")
        .eq("user_id", user.id)
        .eq("chat_partner_id", chatPartnerId)
        .maybeSingle();

      if (error) return;

      if (!data) {
        setWallpaper("default");
        setThemeColor("default");
        setFontSize("medium");
        setCustomPhotos([]);
        return;
      }

      const settings = data as ChatSettingsRow;

      const savedWallpaper = settings.wallpaper || "default";
      const savedCustomPhotos = Array.isArray(settings.custom_wallpapers)
        ? (settings.custom_wallpapers.filter((v): v is string => typeof v === "string"))
        : [];
      const activeCustomPhoto = savedWallpaper.startsWith("custom:")
        ? savedWallpaper.replace("custom:", "")
        : null;

      setWallpaper(savedWallpaper);
      setThemeColor(settings.theme_color || "default");
      setFontSize(settings.font_size || "medium");
      setCustomPhotos(
        activeCustomPhoto && !savedCustomPhotos.includes(activeCustomPhoto)
          ? [...savedCustomPhotos, activeCustomPhoto]
          : savedCustomPhotos
      );
    };

    void load();
  }, [open, user?.id, chatPartnerId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/wallpapers/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-media-files")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      // Store the storage path (not a public URL) — signed URLs are minted on render.
      const updated = customPhotos.includes(path) ? customPhotos : [...customPhotos, path];
      setCustomPhotos(updated);
      setWallpaper(`custom:${path}`);
      toast.success("Wallpaper added!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Upload failed: " + message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeCustomPhoto = (url: string) => {
    const updated = customPhotos.filter((p) => p !== url);
    setCustomPhotos(updated);
    if (wallpaper === `custom:${url}`) setWallpaper("default");
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const activeCustomPhoto = wallpaper.startsWith("custom:")
      ? wallpaper.replace("custom:", "")
      : null;
    const wallpapersToSave = activeCustomPhoto && !customPhotos.includes(activeCustomPhoto)
      ? [...customPhotos, activeCustomPhoto]
      : customPhotos;

    const { error } = await (supabase as any)
      .from("chat_settings" as any)
      .upsert({
        user_id: user.id,
        chat_partner_id: chatPartnerId,
        wallpaper,
        theme_color: themeColor,
        font_size: fontSize,
        custom_wallpapers: wallpapersToSave,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,chat_partner_id" });

    if (error) {
      toast.error("Could not save chat personalization");
      return;
    }

    setCustomPhotos(wallpapersToSave);
    onApply({ wallpaper, themeColor, fontSize });
    toast.success("Chat personalized ✨");
    onClose();
  };

  if (!open) return null;

  const selectedFontSize = FONT_SIZES.find(f => f.id === fontSize)?.size || "text-sm";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center px-2 sm:px-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="zivo-chat-popover-glass relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-t-[1.75rem] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle + Header */}
          <div className="zivo-chat-header-glass z-10 px-5 pt-2.5 pb-4">
            <div className="mx-auto mb-4 h-[4px] w-11 rounded-full bg-foreground/20" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="zivo-chat-avatar-ring flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Glass studio</p>
                  <h3 className="truncate text-lg font-black leading-tight tracking-tight text-foreground">Personalize Chat</h3>
                  <p className="truncate text-[12px] font-bold leading-tight text-muted-foreground">{chatPartnerName}</p>
                </div>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="zivo-chat-icon-button h-9 w-9"
                aria-label="Close personalization"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4 scrollbar-hide">

            {/* ── Wallpaper Section ── */}
            <section className="zivo-chat-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="zivo-chat-chip flex h-7 w-7 items-center justify-center p-0">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-[13px] font-black text-foreground">Chat Wallpaper</h4>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {WALLPAPERS.map((w) => {
                  const isSelected = wallpaper === w.id;
                  return (
                    <motion.button
                      type="button"
                      key={w.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setWallpaper(w.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`relative w-full aspect-[3/4] overflow-hidden rounded-2xl border transition-all ${
                        isSelected
                          ? "border-primary/60 shadow-lg shadow-primary/15 ring-2 ring-primary/20"
                          : "border-white/15 bg-background/35 hover:border-primary/30"
                      }`}>
                        <div className={`w-full h-full ${w.preview}`} />
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[9px] font-black leading-tight ${isSelected ? "text-primary" : "text-muted-foreground/70"}`}>
                        {w.label}
                      </span>
                    </motion.button>
                  );
                })}

                {/* Custom Photos inline */}
                {customPhotos.map((url) => {
                  const isSelected = wallpaper === `custom:${url}`;
                  return (
                    <div key={url} className="relative group flex flex-col items-center gap-1">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setWallpaper(`custom:${url}`)}
                        className={`relative w-full aspect-[3/4] overflow-hidden rounded-2xl border transition-all ${
                          isSelected
                            ? "border-primary/60 shadow-lg shadow-primary/15 ring-2 ring-primary/20"
                            : "border-white/15 hover:border-primary/30"
                        }`}
                      >
	                        <img
	                          src={url}
	                          alt="Custom"
	                          className="w-full h-full object-cover"
	                          loading="lazy"
	                          decoding="async"
	                        />
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            className="absolute inset-0 flex items-center justify-center bg-black/10"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </motion.button>
                      <span className={`text-[9px] font-black leading-tight ${isSelected ? "text-primary" : "text-muted-foreground/70"}`}>
                        Photo
                      </span>
                      {/* Delete overlay on hover/long-press */}
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); removeCustomPhoto(url); }}
                        className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                        aria-label="Remove custom wallpaper"
                      >
                        <Trash2 className="h-3 w-3" />
                      </motion.button>
                    </div>
                  );
                })}

                {/* Upload button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex w-full aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 transition-all hover:border-primary/50 hover:bg-primary/10">
                    {uploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent"
                      />
                    ) : (
                      <Plus className="h-5 w-5 text-primary/60" />
                    )}
                  </div>
                  <span className="text-[9px] font-black leading-tight text-primary/70">
                    {uploading ? "Adding..." : "Photo"}
                  </span>
                </motion.button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </section>

            {/* ── Bubble Color Section ── */}
            <section className="zivo-chat-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="zivo-chat-chip flex h-7 w-7 items-center justify-center p-0">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-[13px] font-black text-foreground">Bubble Color</h4>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {THEME_COLORS.map((c) => {
                  const isSelected = themeColor === c.id;
                  return (
                    <motion.button
                      type="button"
                      key={c.id}
                      whileTap={{ scale: 0.82 }}
                      onClick={() => setThemeColor(c.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.color} transition-all ${
                        isSelected
                          ? `ring-[3px] ring-offset-[3px] ring-offset-background ${c.ring} scale-110 shadow-lg`
                          : "shadow-sm hover:scale-110"
                      }`}>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[8px] font-black leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {c.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* ── Font Size Section ── */}
            <section className="zivo-chat-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="zivo-chat-chip flex h-7 w-7 items-center justify-center p-0">
                  <Type className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-[13px] font-black text-foreground">Font Size</h4>
              </div>
              <div className="flex gap-2">
                {FONT_SIZES.map((f) => {
                  const isSelected = fontSize === f.id;
                  return (
                    <motion.button
                      type="button"
                      key={f.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setFontSize(f.id)}
                      className={`flex-1 rounded-2xl border px-2 py-3 transition-all ${
                        isSelected
                          ? "border-primary/45 bg-primary/10 shadow-sm"
                          : "border-border/30 bg-background/45 hover:bg-muted/30"
                      }`}
                    >
                      <span className={`${f.display} font-bold text-foreground block text-center leading-none`}>Aa</span>
                      <span className={`mt-1 block text-center text-[8px] font-black ${
                        isSelected ? "text-primary" : "text-muted-foreground/50"
                      }`}>{f.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* ── Live Preview ── */}
            <section className="zivo-chat-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="zivo-chat-chip flex h-7 w-7 items-center justify-center p-0">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-[13px] font-black text-foreground">Preview</h4>
              </div>
              <div
                className={`relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 p-3.5 shadow-inner ${
                  wallpaper.startsWith("custom:") ? "" : getWallpaperClass(wallpaper)
                }`}
                style={wallpaper.startsWith("custom:") ? {
                  backgroundImage: `url(${wallpaper.replace("custom:", "")})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                } : undefined}
              >
                <div className="max-w-[64%] self-start rounded-2xl rounded-bl-sm bg-background/80 px-3 py-2 shadow-sm backdrop-blur-md">
                  <span className={`text-foreground ${selectedFontSize}`}>Hey there! 😊</span>
                </div>
                <div className={`max-w-[64%] self-end rounded-2xl rounded-br-sm px-3 py-2 shadow-lg ${getThemeColorClass(themeColor)}`}>
                  <span className={`text-white ${selectedFontSize}`}>Hello! 👋</span>
                </div>
              </div>
            </section>
          </div>

          {/* Apply Button */}
          <div className="zivo-chat-header-glass px-5 py-3.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              onClick={handleSave}
              className="zivo-chat-chip-active flex h-[50px] w-full items-center justify-center gap-2 text-[15px] font-black shadow-lg shadow-primary/25 transition-all active:shadow-sm"
            >
              <Check className="h-4 w-4" />
              Apply Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
