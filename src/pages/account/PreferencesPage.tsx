import { useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft,
  Globe,
  DollarSign,
  Check,
  Ruler,
  Thermometer,
  Clock,
  CalendarDays,
  Accessibility,
  Languages,
  Type,
  Eye,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalizationSettings } from "@/hooks/usePersonalizationSettings";
import { SUPPORTED_CURRENCIES } from "@/config/currencies";
import { toast } from "sonner";
import { useSupportedLanguages } from "@/hooks/useGlobalExpansion";
import {
  useUnitPreferences,
  type DistanceUnit,
  type TemperatureUnit,
  type TimeFormat,
  type DateFormat,
} from "@/hooks/useUnitPreferences";
import {
  useAccessibilityPrefs,
  type FontScale,
} from "@/hooks/useAccessibilityPrefs";
import { useTranslationPrefs } from "@/hooks/useTranslationPrefs";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { cn } from "@/lib/utils";

const PreferenceSwitch = ({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onCheckedChange(!checked)}
    className="flex h-11 w-14 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <span
      aria-hidden="true"
      className={cn(
        "relative block h-6 w-11 rounded-full transition-colors motion-reduce:transition-none",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-background shadow-lg transition-transform motion-reduce:transition-none",
          checked && "translate-x-5",
        )}
      />
    </span>
  </button>
);

const PreferenceSection = ({
  children,
  icon: Icon,
  title,
  subtitle,
  iconColor = "text-primary",
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconColor?: string;
}) => (
  <section className="h-full overflow-hidden rounded-[1.5rem] border border-border/55 bg-card/95 shadow-sm">
    <div className="flex items-center gap-3 px-4 pb-3 pt-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/70">
        <Icon aria-hidden="true" className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold leading-tight text-foreground">
          {title}
        </h2>
        <p className="text-[11px] font-medium text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
    <div className="px-4 pb-4">{children}</div>
  </section>
);

const PreferencesPage = () => {
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const { user } = useAuth();
  const { updateSettings } = usePersonalizationSettings();
  const { data: supportedLanguages } = useSupportedLanguages(true);
  const activeLanguages = (supportedLanguages || []).filter(
    (language) => language.is_active,
  );
  const { prefs: unitPrefs, update: updateUnitPref } = useUnitPreferences();
  const { prefs: a11yPrefs, update: updateA11yPref } = useAccessibilityPrefs();
  const { prefs: translationPrefs, update: updateTranslationPref } =
    useTranslationPrefs();
  const isTravelHost =
    typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);
  const hashTargetClassName = cn(
    "scroll-mt-[calc(var(--zivo-safe-top-sticky)_+_4rem)]",
    !isTravelHost && "lg:scroll-mt-[155px]",
  );

  // Hash-anchor scrolling (e.g. /account/preferences#translation)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;
    const t = setTimeout(() => {
      const prefersReducedMotion =
        a11yPrefs.reducedMotion ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(hash)?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 100);
    return () => clearTimeout(t);
  }, [a11yPrefs.reducedMotion, activeLanguages.length]);

  const fontScaleOptions: { value: FontScale; label: string; sub: string }[] = [
    { value: "sm", label: "Small", sub: "92%" },
    { value: "md", label: "Default", sub: "100%" },
    { value: "lg", label: "Large", sub: "110%" },
    { value: "xl", label: "Extra large", sub: "120%" },
  ];

  const distanceOptions: { value: DistanceUnit; label: string; sub: string }[] =
    [
      { value: "km", label: "Kilometers", sub: "km" },
      { value: "mi", label: "Miles", sub: "mi" },
    ];
  const temperatureOptions: {
    value: TemperatureUnit;
    label: string;
    sub: string;
  }[] = [
    { value: "c", label: "Celsius", sub: "°C" },
    { value: "f", label: "Fahrenheit", sub: "°F" },
  ];
  const timeFormatOptions: { value: TimeFormat; label: string; sub: string }[] =
    [
      { value: "24h", label: "24-hour", sub: "14:30" },
      { value: "12h", label: "12-hour", sub: "2:30 PM" },
    ];
  const dateFormatOptions: { value: DateFormat; label: string; sub: string }[] =
    [
      { value: "ymd", label: "YYYY-MM-DD", sub: "2026-04-29" },
      { value: "dmy", label: "DD/MM/YYYY", sub: "29/04/2026" },
      { value: "mdy", label: "MM/DD/YYYY", sub: "04/29/2026" },
    ];

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

  const handleBack = () => {
    const historyIndex =
      typeof window !== "undefined" ? window.history.state?.idx : null;

    if (typeof historyIndex === "number" && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/more", { replace: true });
  };

  return (
    <div
      className={cn(
        "min-h-[100dvh] bg-background safe-area-bottom",
        !isTravelHost && "lg:pt-[83px]",
      )}
    >
      <SEOHead
        title="Preferences – ZIVO"
        description="Customize your ZIVO experience. Set language, currency, units, date format, accessibility options, and translation preferences."
      />

      <header
        className={cn(
          "zivo-pt-safe-sticky sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-xl",
          !isTravelHost && "lg:top-[83px]",
        )}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3 pb-2 pt-2 sm:px-4 lg:py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-11 w-11 shrink-0 rounded-full bg-muted/55 text-foreground transition-transform hover:bg-muted active:scale-90 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go back"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-extrabold leading-tight sm:text-lg">
              Preferences
            </h1>
            <p className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">
              Display, language, currency & units
            </p>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="zivo-aurora mx-auto w-full max-w-2xl px-4 pb-[calc(var(--zivo-safe-bottom,0px)+8.5rem)] pt-4 sm:pt-5 lg:pb-10 lg:pt-6"
      >
        <div className="space-y-4">
          {/* Language */}
          <PreferenceSection
            icon={Globe}
            title="Language"
            subtitle="Choose your preferred language"
            iconColor="text-primary"
          >
            <div
              className="max-h-[360px] space-y-0.5 overflow-y-auto rounded-xl pr-1"
              role="group"
              aria-label="Language choices"
            >
              {activeLanguages.map((lang) => (
                <button
                  type="button"
                  key={lang.code}
                  aria-label={`${lang.name} (${lang.native_name})`}
                  aria-pressed={currentLanguage === lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`group relative flex min-h-11 w-full touch-manipulation items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currentLanguage === lang.code
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "hover:bg-muted/60"
                  }`}
                >
                  {/* Hover background flag watermark */}
                  {lang.flag_svg && (
                    <img
                      src={lang.flag_svg}
                      alt=""
                      className="absolute right-1 top-1/2 w-20 h-20 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none blur-[0.5px]"
                      loading="lazy"
                      decoding="async"
                      style={{ transform: "translateY(-50%) rotate(-8deg)" }}
                    />
                  )}
                  {lang.flag_svg ? (
                    <img
                      src={lang.flag_svg}
                      alt=""
                      className="w-7 h-[19px] rounded-[3px] object-cover shadow-sm border border-black/10 shrink-0 relative z-10"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span aria-hidden="true" className="text-xl">
                      {lang.flag_emoji}
                    </span>
                  )}
                  <div className="flex-1 text-left relative z-10">
                    <p className="font-medium text-sm">{lang.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang.native_name}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60 uppercase relative z-10">
                    {lang.code}
                  </span>
                  {currentLanguage === lang.code && (
                    <Check
                      aria-hidden="true"
                      className="relative z-10 h-4 w-4 text-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          </PreferenceSection>

          {/* Currency */}
          <PreferenceSection
            icon={DollarSign}
            title="Currency"
            subtitle="Choose your preferred currency"
            iconColor="text-primary"
          >
            <div
              className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3"
              role="group"
              aria-label="Currency choices"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <button
                  type="button"
                  key={curr.code}
                  aria-label={`${curr.code} (${curr.symbol})`}
                  aria-pressed={currency === curr.code}
                  onClick={() => handleCurrencyChange(curr.code)}
                  className={`flex min-h-11 touch-manipulation items-center gap-2 rounded-xl px-3 py-2.5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    currency === curr.code
                      ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                      : "bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  <span aria-hidden="true" className="text-lg">
                    {curr.flag}
                  </span>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-sm">{curr.code}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {curr.symbol}
                    </p>
                  </div>
                  {currency === curr.code && (
                    <Check
                      aria-hidden="true"
                      className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          </PreferenceSection>

          {/* Units and formats */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PreferenceSection
              icon={Ruler}
              title="Distance"
              subtitle="Used in maps, rides & deliveries"
              iconColor="text-primary"
            >
              <div className="grid grid-cols-2 gap-2">
                {distanceOptions.map((opt) => {
                  const active = unitPrefs.distance === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      aria-pressed={active}
                      onClick={() => {
                        updateUnitPref("distance", opt.value);
                        toast.success(`Distance: ${opt.label}`);
                      }}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.sub}
                        </p>
                      </div>
                      {active && (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </PreferenceSection>

            {/* Temperature */}
            <PreferenceSection
              icon={Thermometer}
              title="Temperature"
              subtitle="Weather and forecasts"
              iconColor="text-primary"
            >
              <div className="grid grid-cols-2 gap-2">
                {temperatureOptions.map((opt) => {
                  const active = unitPrefs.temperature === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      aria-pressed={active}
                      onClick={() => {
                        updateUnitPref("temperature", opt.value);
                        toast.success(`Temperature: ${opt.label}`);
                      }}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.sub}
                        </p>
                      </div>
                      {active && (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </PreferenceSection>

            {/* Time format */}
            <PreferenceSection
              icon={Clock}
              title="Time format"
              subtitle="How times are displayed"
              iconColor="text-primary"
            >
              <div className="grid grid-cols-2 gap-2">
                {timeFormatOptions.map((opt) => {
                  const active = unitPrefs.timeFormat === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      aria-pressed={active}
                      onClick={() => {
                        updateUnitPref("timeFormat", opt.value);
                        toast.success(`Time format: ${opt.label}`);
                      }}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.sub}
                        </p>
                      </div>
                      {active && (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </PreferenceSection>

            {/* Date format */}
            <PreferenceSection
              icon={CalendarDays}
              title="Date format"
              subtitle="How dates are displayed"
              iconColor="text-primary"
            >
              <div className="space-y-1.5">
                {dateFormatOptions.map((opt) => {
                  const active = unitPrefs.dateFormat === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      aria-pressed={active}
                      onClick={() => {
                        updateUnitPref("dateFormat", opt.value);
                        toast.success(`Date format: ${opt.label}`);
                      }}
                      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.sub}
                        </p>
                      </div>
                      {active && (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </PreferenceSection>
          </div>

          {/* Accessibility */}
          <div id="accessibility" className={hashTargetClassName}>
            <PreferenceSection
              icon={Accessibility}
              title="Accessibility"
              subtitle="Make ZIVO easier to use"
              iconColor="text-primary"
            >
              <div className="space-y-4">
                {/* Font size */}
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Type
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                    Text size
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {fontScaleOptions.map((opt) => {
                      const active = a11yPrefs.fontScale === opt.value;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          aria-pressed={active}
                          onClick={() => {
                            updateA11yPref("fontScale", opt.value);
                            toast.success(`Text size: ${opt.label}`);
                          }}
                          className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2.5 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary ring-1 ring-primary/25" : "bg-muted/30 hover:bg-muted/60"}`}
                        >
                          <span className="text-[11px] font-semibold">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {opt.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Zap
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-amber-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Reduce motion</p>
                        <p className="text-[11px] text-muted-foreground">
                          Minimize animations & transitions
                        </p>
                      </div>
                    </div>
                    <PreferenceSwitch
                      checked={a11yPrefs.reducedMotion}
                      label="Reduce motion"
                      onCheckedChange={(value) => {
                        updateA11yPref("reducedMotion", value);
                        toast.success(
                          value ? "Motion reduced" : "Motion restored",
                        );
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Eye
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-foreground"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">High contrast</p>
                        <p className="text-[11px] text-muted-foreground">
                          Stronger borders & text contrast
                        </p>
                      </div>
                    </div>
                    <PreferenceSwitch
                      checked={a11yPrefs.highContrast}
                      label="High contrast"
                      onCheckedChange={(value) => {
                        updateA11yPref("highContrast", value);
                        toast.success(
                          value ? "High contrast on" : "High contrast off",
                        );
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-foreground"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Underline links</p>
                        <p className="text-[11px] text-muted-foreground">
                          Always show link underlines
                        </p>
                      </div>
                    </div>
                    <PreferenceSwitch
                      checked={a11yPrefs.underlineLinks}
                      label="Underline links"
                      onCheckedChange={(value) =>
                        updateA11yPref("underlineLinks", value)
                      }
                    />
                  </div>
                </div>
              </div>
            </PreferenceSection>
          </div>

          {/* Auto-Translate */}
          <div id="translation" className={hashTargetClassName}>
            <PreferenceSection
              icon={Languages}
              title="Auto-Translate"
              subtitle="Translate messages & posts on the fly"
              iconColor="text-primary"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Translate messages</p>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-translate chats not in your language
                    </p>
                  </div>
                  <PreferenceSwitch
                    checked={translationPrefs.autoTranslateMessages}
                    label="Translate messages"
                    onCheckedChange={(value) => {
                      updateTranslationPref("autoTranslateMessages", value);
                      toast.success(
                        value
                          ? "Messages will auto-translate"
                          : "Auto-translate disabled",
                      );
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Translate posts</p>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-translate posts in your feed
                    </p>
                  </div>
                  <PreferenceSwitch
                    checked={translationPrefs.autoTranslatePosts}
                    label="Translate posts"
                    onCheckedChange={(value) =>
                      updateTranslationPref("autoTranslatePosts", value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Show original toggle
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Add a "Show original" link to translations
                    </p>
                  </div>
                  <PreferenceSwitch
                    checked={translationPrefs.showOriginalToggle}
                    label="Show original toggle"
                    onCheckedChange={(value) =>
                      updateTranslationPref("showOriginalToggle", value)
                    }
                  />
                </div>
                <p className="text-[10px] text-muted-foreground pt-2">
                  Target language:{" "}
                  <span className="font-medium text-foreground">
                    {translationPrefs.targetLanguage === "auto"
                      ? `Auto (${currentLanguage.toUpperCase()})`
                      : translationPrefs.targetLanguage.toUpperCase()}
                  </span>
                </p>
              </div>
            </PreferenceSection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PreferencesPage;
