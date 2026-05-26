import { useNavigate } from "react-router-dom";
import { useRef, useCallback, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { ArrowLeft, Globe, DollarSign, Check, Palette, Sparkles, Ruler, Thermometer, Clock, CalendarDays, Accessibility, Languages, Type, Eye, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalizationSettings } from "@/hooks/usePersonalizationSettings";
import { SUPPORTED_CURRENCIES } from "@/config/currencies";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useSupportedLanguages } from "@/hooks/useGlobalExpansion";
import { useUnitPreferences, type DistanceUnit, type TemperatureUnit, type TimeFormat, type DateFormat } from "@/hooks/useUnitPreferences";
import { useAccessibilityPrefs, type FontScale } from "@/hooks/useAccessibilityPrefs";
import { useTranslationPrefs } from "@/hooks/useTranslationPrefs";

const use3DTilt = (ref: React.RefObject<HTMLElement | null>) => {
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
  }, [ref]);

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = `perspective(800px) rotateY(0deg) rotateX(0deg)`;
  }, [ref]);

  return {
    onMouseMove: (e: React.MouseEvent) => handleMove(e.clientX, e.clientY),
    onMouseLeave: handleLeave,
    onTouchMove: (e: React.TouchEvent) => {
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    },
    onTouchEnd: handleLeave,
  };
};

const Section3D = ({ children, icon: Icon, title, subtitle, delay = 0, iconColor = "text-primary" }: {
  children: React.ReactNode;
  icon: any;
  title: string;
  subtitle: string;
  delay?: number;
  iconColor?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = use3DTilt(ref);

  return (
    <>
      <SEOHead title="Preferences – ZIVO" description="Customize your ZIVO experience. Set language, currency, units (distance/temperature), date format, accessibility options, and translation preferences." />
      <div className="min-h-screen bg-background safe-area-top safe-area-bottom relative overflow-hidden">
        <motion.div
          {...tilt}
          className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-xl shadow-[0_8px_32px_hsl(var(--primary)/0.08)] overflow-hidden transition-transform duration-200 ease-out"
          style={{ transformStyle: "preserve-3d" }}
        >
      {/* Header with glow */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-lg border border-primary/10">
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
        </motion.div>
      </div>
    </>
  );
};

const PreferencesPage = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentLanguage, changeLanguage } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { user } = useAuth();
  const { updateSettings } = usePersonalizationSettings();
  const { data: supportedLanguages } = useSupportedLanguages(true);
  const activeLanguages = (supportedLanguages || []).filter(l => l.is_active);
  const { prefs: unitPrefs, update: updateUnitPref } = useUnitPreferences();
  const { prefs: a11yPrefs, update: updateA11yPref } = useAccessibilityPrefs();
  const { prefs: translationPrefs, update: updateTranslationPref } = useTranslationPrefs();

  // Hash-anchor scrolling (e.g. /account/preferences#translation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const fontScaleOptions: { value: FontScale; label: string; sub: string }[] = [
    { value: "sm", label: "Small", sub: "92%" },
    { value: "md", label: "Default", sub: "100%" },
    { value: "lg", label: "Large", sub: "110%" },
    { value: "xl", label: "Extra large", sub: "120%" },
  ];

  const distanceOptions: { value: DistanceUnit; label: string; sub: string }[] = [
    { value: "km", label: "Kilometers", sub: "km" },
    { value: "mi", label: "Miles", sub: "mi" },
  ];
  const temperatureOptions: { value: TemperatureUnit; label: string; sub: string }[] = [
    { value: "c", label: "Celsius", sub: "°C" },
    { value: "f", label: "Fahrenheit", sub: "°F" },
  ];
  const timeFormatOptions: { value: TimeFormat; label: string; sub: string }[] = [
    { value: "24h", label: "24-hour", sub: "14:30" },
    { value: "12h", label: "12-hour", sub: "2:30 PM" },
  ];
  const dateFormatOptions: { value: DateFormat; label: string; sub: string }[] = [
    { value: "ymd", label: "YYYY-MM-DD", sub: "2026-04-29" },
    { value: "dmy", label: "DD/MM/YYYY", sub: "29/04/2026" },
    { value: "mdy", label: "MM/DD/YYYY", sub: "04/29/2026" },
  ];

  const { scrollYProgress } = useScroll({ container: scrollRef });
  const headerY = useTransform(scrollYProgress, [0, 0.15], [0, -20]);
  const headerScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.97]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.85]);

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    if (user) {
      updateSettings({ preferred_language: langCode });
    }
    toast.success("Language updated");
  };

  const handleCurrencyChange = (currencyCode: string) => {
    setCurrency(currencyCode);
    if (user) {
      updateSettings({ preferred_currency: currencyCode });
    }
    toast.success("Currency updated");
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 h-screen overflow-y-auto pb-24"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="container max-w-lg mx-auto px-4 pt-4 pb-8">
          {/* 3D Header */}
          <motion.div
            style={{ y: headerY, scale: headerScale, opacity: headerOpacity }}
            className="flex items-center gap-3 mb-8"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-xl hover:bg-muted/50 -ml-2 touch-manipulation active:scale-95 backdrop-blur-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2"
              >
                Preferences
                <Sparkles className="w-4 h-4 text-primary/60" />
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-muted-foreground text-xs sm:text-sm"
              >
                Appearance, language, currency & units
              </motion.p>
            </div>
          </motion.div>

          <div className="space-y-5">
            {/* Appearance */}
            <Section3D icon={Palette} title="Appearance" subtitle="Choose your preferred theme" delay={0.1} iconColor="text-primary">
              <ThemeToggle
                onChange={(theme) => {
                  if (user) {
                    updateSettings({ preferred_theme: theme } as any);
                  }
                }}
              />
            </Section3D>

            {/* Language */}
            <Section3D icon={Globe} title="Language" subtitle="Choose your preferred language" delay={0.2} iconColor="text-primary">
              <div className="space-y-0.5 max-h-[360px] overflow-y-auto rounded-xl">
                {activeLanguages.map((lang, i) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 + i * 0.02 }}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.98] relative overflow-hidden group ${
                      currentLanguage === lang.code
                        ? "bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.1)] ring-1 ring-primary/20"
                        : "hover:bg-muted/60 hover:shadow-md"
                    }`}
                  >
                    {/* Hover background flag watermark */}
                    {lang.flag_svg && (
                      <img src={lang.flag_svg} alt="" className="absolute right-1 top-1/2 w-20 h-20 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none blur-[0.5px]" style={{ transform: "translateY(-50%) rotate(-8deg)" }} />
                    )}
                    {lang.flag_svg ? (
                      <img src={lang.flag_svg} alt={lang.name} className="w-7 h-[19px] rounded-[3px] object-cover shadow-sm border border-black/10 shrink-0 relative z-10" />
                    ) : (
                      <span className="text-xl">{lang.flag_emoji}</span>
                    )}
                    <div className="flex-1 text-left relative z-10">
                      <p className="font-medium text-sm">{lang.name}</p>
                      <p className="text-xs text-muted-foreground">{lang.native_name}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase relative z-10">{lang.code}</span>
                    {currentLanguage === lang.code && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }} className="relative z-10">
                        <Check className="w-4 h-4 text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </Section3D>

            {/* Currency */}
            <Section3D icon={DollarSign} title="Currency" subtitle="Choose your preferred currency" delay={0.3} iconColor="text-primary">
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_CURRENCIES.map((curr, i) => (
                  <motion.button
                    key={curr.code}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.03 }}
                    onClick={() => handleCurrencyChange(curr.code)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] ${
                      currency === curr.code
                        ? "bg-primary/10 text-primary ring-1 ring-primary/25 shadow-[0_0_16px_hsl(var(--primary)/0.1)]"
                        : "hover:bg-muted/60 bg-muted/30 hover:shadow-md"
                    }`}
                  >
                    <span className="text-lg">{curr.flag}</span>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-sm">{curr.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{curr.symbol}</p>
                    </div>
                    {currency === curr.code && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }}>
                        <Check className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </Section3D>

            {/* Distance */}
            <Section3D icon={Ruler} title="Distance" subtitle="Used in maps, rides & deliveries" delay={0.4} iconColor="text-primary">
              <div className="grid grid-cols-2 gap-2">
                {distanceOptions.map((opt) => {
                  const active = unitPrefs.distance === opt.value;
                  return (
                    <button type="button"
                      key={opt.value}
                      onClick={() => { updateUnitPref("distance", opt.value); toast.success(`Distance: ${opt.label}`); }}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Section3D>

            {/* Temperature */}
            <Section3D icon={Thermometer} title="Temperature" subtitle="Weather and forecasts" delay={0.45} iconColor="text-primary">
              <div className="grid grid-cols-2 gap-2">
                {temperatureOptions.map((opt) => {
                  const active = unitPrefs.temperature === opt.value;
                  return (
                    <button type="button"
                      key={opt.value}
                      onClick={() => { updateUnitPref("temperature", opt.value); toast.success(`Temperature: ${opt.label}`); }}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Section3D>

            {/* Time format */}
            <Section3D icon={Clock} title="Time format" subtitle="How times are displayed" delay={0.5} iconColor="text-primary">
              <div className="grid grid-cols-2 gap-2">
                {timeFormatOptions.map((opt) => {
                  const active = unitPrefs.timeFormat === opt.value;
                  return (
                    <button type="button"
                      key={opt.value}
                      onClick={() => { updateUnitPref("timeFormat", opt.value); toast.success(`Time format: ${opt.label}`); }}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Section3D>

            {/* Date format */}
            <Section3D icon={CalendarDays} title="Date format" subtitle="How dates are displayed" delay={0.55} iconColor="text-primary">
              <div className="space-y-1.5">
                {dateFormatOptions.map((opt) => {
                  const active = unitPrefs.dateFormat === opt.value;
                  return (
                    <button type="button"
                      key={opt.value}
                      onClick={() => { updateUnitPref("dateFormat", opt.value); toast.success(`Date format: ${opt.label}`); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.99] ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.sub}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Section3D>

            {/* Accessibility */}
            <div id="accessibility" className="scroll-mt-24">
              <Section3D icon={Accessibility} title="Accessibility" subtitle="Make ZIVO easier to use" delay={0.6} iconColor="text-primary">
                <div className="space-y-4">
                  {/* Font size */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5"><Type className="h-3.5 w-3.5 text-muted-foreground" /> Text size</p>
                    <div className="grid grid-cols-4 gap-2">
                      {fontScaleOptions.map((opt) => {
                        const active = a11yPrefs.fontScale === opt.value;
                        return (
                          <button type="button"
                            key={opt.value}
                            onClick={() => { updateA11yPref("fontScale", opt.value); toast.success(`Text size: ${opt.label}`); }}
                            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 rounded-xl transition-all active:scale-[0.97] ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                          >
                            <span className="text-[11px] font-semibold">{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">Reduce motion</p>
                          <p className="text-[11px] text-muted-foreground">Minimize animations & transitions</p>
                        </div>
                      </div>
                      <Switch checked={a11yPrefs.reducedMotion} onCheckedChange={(v) => { updateA11yPref("reducedMotion", v); toast.success(v ? "Motion reduced" : "Motion restored"); }} />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Eye className="h-4 w-4 text-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">High contrast</p>
                          <p className="text-[11px] text-muted-foreground">Stronger borders & text contrast</p>
                        </div>
                      </div>
                      <Switch checked={a11yPrefs.highContrast} onCheckedChange={(v) => { updateA11yPref("highContrast", v); toast.success(v ? "High contrast on" : "High contrast off"); }} />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Globe className="h-4 w-4 text-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">Underline links</p>
                          <p className="text-[11px] text-muted-foreground">Always show link underlines</p>
                        </div>
                      </div>
                      <Switch checked={a11yPrefs.underlineLinks} onCheckedChange={(v) => updateA11yPref("underlineLinks", v)} />
                    </div>
                  </div>
                </div>
              </Section3D>
            </div>

            {/* Auto-Translate */}
            <div id="translation" className="scroll-mt-24">
              <Section3D icon={Languages} title="Auto-Translate" subtitle="Translate messages & posts on the fly" delay={0.65} iconColor="text-primary">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Translate messages</p>
                      <p className="text-[11px] text-muted-foreground">Auto-translate chats not in your language</p>
                    </div>
                    <Switch checked={translationPrefs.autoTranslateMessages} onCheckedChange={(v) => { updateTranslationPref("autoTranslateMessages", v); toast.success(v ? "Messages will auto-translate" : "Auto-translate disabled"); }} />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Translate posts</p>
                      <p className="text-[11px] text-muted-foreground">Auto-translate posts in your feed</p>
                    </div>
                    <Switch checked={translationPrefs.autoTranslatePosts} onCheckedChange={(v) => updateTranslationPref("autoTranslatePosts", v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Show original toggle</p>
                      <p className="text-[11px] text-muted-foreground">Add a "Show original" link to translations</p>
                    </div>
                    <Switch checked={translationPrefs.showOriginalToggle} onCheckedChange={(v) => updateTranslationPref("showOriginalToggle", v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-2">
                    Target language: <span className="font-medium text-foreground">{translationPrefs.targetLanguage === "auto" ? `Auto (${currentLanguage.toUpperCase()})` : translationPrefs.targetLanguage.toUpperCase()}</span>
                  </p>
                </div>
              </Section3D>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
