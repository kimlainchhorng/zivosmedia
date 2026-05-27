import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Globe, Star } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const LANGS = [
  { code: "en", label: "English", cc: "us" },
  { code: "km", label: "ខ្មែរ", cc: "kh" },
  { code: "zh", label: "中文", cc: "cn" },
  { code: "ko", label: "한국어", cc: "kr" },
  { code: "ja", label: "日本語", cc: "jp" },
  { code: "vi", label: "Tiếng Việt", cc: "vn" },
  { code: "th", label: "ไทย", cc: "th" },
  { code: "es", label: "Español", cc: "es" },
  { code: "fr", label: "Français", cc: "fr" },
  { code: "de", label: "Deutsch", cc: "de" },
  { code: "it", label: "Italiano", cc: "it" },
  { code: "pt", label: "Português", cc: "pt" },
  { code: "nl", label: "Nederlands", cc: "nl" },
  { code: "pl", label: "Polski", cc: "pl" },
  { code: "sv", label: "Svenska", cc: "se" },
  { code: "da", label: "Dansk", cc: "dk" },
  { code: "fi", label: "Suomi", cc: "fi" },
  { code: "el", label: "Ελληνικά", cc: "gr" },
  { code: "cs", label: "Čeština", cc: "cz" },
  { code: "ro", label: "Română", cc: "ro" },
  { code: "hu", label: "Magyar", cc: "hu" },
  { code: "hr", label: "Hrvatski", cc: "hr" },
  { code: "bg", label: "Български", cc: "bg" },
  { code: "sk", label: "Slovenčina", cc: "sk" },
  { code: "lt", label: "Lietuvių", cc: "lt" },
  { code: "no", label: "Norsk", cc: "no" },
  { code: "ru", label: "Русский", cc: "ru" },
  { code: "uk", label: "Українська", cc: "ua" },
  { code: "tr", label: "Türkçe", cc: "tr" },
  { code: "ar", label: "العربية", cc: "sa" },
  { code: "id", label: "Bahasa Indonesia", cc: "id" },
];

const getFlagUrl = (cc: string) => `/flags/${cc}.svg`;

export default function TranslateButton({ className = "" }: { className?: string }) {
  const { currentLanguage, changeLanguage } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const currentLang = LANGS.find((l) => l.code === currentLanguage) || LANGS[0];

  return (
    <>
      <motion.button
        ref={triggerRef}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((p) => !p)}
        className={`relative z-20 flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/10 px-3 text-[12px] font-bold text-primary shadow-sm touch-manipulation transition-all w-full ${className}`}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" />
	        <img
	          src={getFlagUrl(currentLang.cc)}
	          alt=""
	          className="h-3 w-4 rounded-[2px] object-cover shadow-sm"
	          loading="lazy"
	          decoding="async"
	          onError={(e) => { e.currentTarget.style.display = "none"; }}
	        />
        <span className="truncate">Translate</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && triggerRef.current && createPortal(
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[100] bg-card/95 backdrop-blur-2xl border border-border/40 rounded-3xl shadow-2xl shadow-primary/10 p-2 min-w-[230px] max-h-[360px] overflow-y-auto"
              style={{
                left: Math.max(16, Math.min(triggerRef.current.getBoundingClientRect().left, window.innerWidth - 246)),
                top: triggerRef.current.getBoundingClientRect().bottom + 8,
                scrollbarWidth: "thin",
              }}
            >
              {LANGS.map((lang, i) => (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.012, duration: 0.2 }}
                  onClick={() => { changeLanguage(lang.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all touch-manipulation active:scale-[0.97] relative overflow-hidden group ${
                    currentLanguage === lang.code
                      ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                      : "text-foreground hover:bg-muted/70"
                  }`}
                >
	                  <img src={getFlagUrl(lang.cc)} alt="" className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-8 rounded object-cover opacity-[0.05] pointer-events-none group-hover:opacity-[0.12] transition-opacity" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
	                  <img src={getFlagUrl(lang.cc)} alt={lang.label} className="w-6 h-4 rounded-[3px] object-cover shadow-sm border border-border/30 relative z-10 shrink-0" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <span className="relative z-10">{lang.label}</span>
                  {currentLanguage === lang.code && <Star className="w-3 h-3 text-primary fill-primary ml-auto relative z-10" />}
                </motion.button>
              ))}
            </motion.div>
          </>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
