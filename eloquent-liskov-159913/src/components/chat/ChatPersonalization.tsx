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
        className="fixed inset-0 z-[9999] flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="relative bg-background rounded-t-[32px] w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle + Header */}
          <div className="bg-background z-10 px-5 pt-2.5 pb-3">
            <div className="w-10 h-[4px] rounded-full bg-muted-foreground/20 mx-auto mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">Personalize Chat</h3>
                  <p className="text-[12px] text-primary font-semibold leading-tight">{chatPartnerName}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4 scrollbar-hide">

            {/* ── Wallpaper Section ── */}
            <section className="rounded-2xl bg-muted/15 border border-border/10 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-primary" />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Chat Wallpaper</h4>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {WALLPAPERS.map((w) => {
                  const isSelected = wallpaper === w.id;
                  return (
                    <motion.button
                      key={w.id}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setWallpaper(w.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all overflow-hidden relative ${
                        isSelected
                          ? "border-primary shadow-md shadow-primary/15 ring-1 ring-primary/20"
                          : "border-border/20 hover:border-border/50"
                      }`}>
                        <div className={`w-full h-full ${w.preview}`} />
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                              <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[9px] font-semibold leading-tight ${isSelected ? "text-primary" : "text-muted-foreground/70"}`}>
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
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setWallpaper(`custom:${url}`)}
                        className={`w-full aspect-[3/4] rounded-xl border-2 transition-all overflow-hidden relative ${
                          isSelected
                            ? "border-primary shadow-md shadow-primary/15 ring-1 ring-primary/20"
                            : "border-border/20 hover:border-border/50"
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
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                              <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                            </div>
                          </motion.div>
                        )}
                      </motion.button>
                      <span className={`text-[9px] font-semibold leading-tight ${isSelected ? "text-primary" : "text-muted-foreground/70"}`}>
                        Photo
                      </span>
                      {/* Delete overlay on hover/long-press */}
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); removeCustomPhoto(url); }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </motion.button>
                    </div>
                  );
                })}

                {/* Upload button */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all">
                    {uploading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                      />
                    ) : (
                      <Plus className="w-5 h-5 text-primary/40" />
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-primary/50 leading-tight">
                    {uploading ? "Adding..." : "Photo"}
                  </span>
                </motion.button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </section>

            {/* ── Bubble Color Section ── */}
            <section className="rounded-2xl bg-muted/15 border border-border/10 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="w-3 h-3 text-primary" />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Bubble Color</h4>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {THEME_COLORS.map((c) => {
                  const isSelected = themeColor === c.id;
                  return (
                    <motion.button
                      key={c.id}
                      whileTap={{ scale: 0.82 }}
                      onClick={() => setThemeColor(c.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-10 h-10 rounded-full ${c.color} transition-all flex items-center justify-center ${
                        isSelected
                          ? `ring-[3px] ring-offset-[3px] ring-offset-background ${c.ring} scale-110 shadow-lg`
                          : "hover:scale-110 shadow-sm"
                      }`}>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[8px] font-semibold leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {c.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* ── Font Size Section ── */}
            <section className="rounded-2xl bg-muted/15 border border-border/10 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Type className="w-3 h-3 text-primary" />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Font Size</h4>
              </div>
              <div className="flex gap-2">
                {FONT_SIZES.map((f) => {
                  const isSelected = fontSize === f.id;
                  return (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setFontSize(f.id)}
                      className={`flex-1 py-2.5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-transparent bg-background/60 hover:bg-muted/30"
                      }`}
                    >
                      <span className={`${f.display} font-bold text-foreground block text-center leading-none`}>Aa</span>
                      <span className={`text-[8px] block text-center mt-1 font-bold ${
                        isSelected ? "text-primary" : "text-muted-foreground/50"
                      }`}>{f.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* ── Live Preview ── */}
            <section className="rounded-2xl bg-muted/15 border border-border/10 p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="w-3 h-3 text-primary" />
                </div>
                <h4 className="text-[13px] font-bold text-foreground">Preview</h4>
              </div>
              <div
                className={`rounded-2xl p-3.5 h-24 flex flex-col justify-between relative overflow-hidden border border-border/15 ${
                  wallpaper.startsWith("custom:") ? "" : getWallpaperClass(wallpaper)
                }`}
                style={wallpaper.startsWith("custom:") ? {
                  backgroundImage: `url(${wallpaper.replace("custom:", "")})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                } : undefined}
              >
                <div className="self-start max-w-[60%] px-2.5 py-1.5 rounded-2xl rounded-bl-sm bg-muted/80 backdrop-blur-sm">
                  <span className={`text-foreground ${selectedFontSize}`}>Hey there! 😊</span>
                </div>
                <div className={`self-end max-w-[60%] px-2.5 py-1.5 rounded-2xl rounded-br-sm ${getThemeColorClass(themeColor)}`}>
                  <span className={`text-white ${selectedFontSize}`}>Hello! 👋</span>
                </div>
              </div>
            </section>
          </div>

          {/* Apply Button */}
          <div className="px-5 py-3.5 bg-background/80 backdrop-blur-md border-t border-border/5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              onClick={handleSave}
              className="w-full h-[50px] rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold shadow-lg shadow-primary/25 active:shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
