/**
 * Minimal i18n scaffold — JSON-based string tables keyed by language.
 * Real route would use react-i18next; this is a typed lookup that works
 * everywhere in the app today and is easy to migrate later.
 *
 * Usage:
 *   import { t } from "@/lib/i18n/strings";
 *   t("chat.send")  // "Send" (English) / "Enviar" (Spanish) / "ផ្ញើ" (Khmer)
 */

const DICTIONARIES = {
  en: {
    "chat.send": "Send",
    "chat.message_placeholder": "Message...",
    "chat.search_placeholder": "Search messages...",
    "chat.reply": "Reply",
    "chat.forward": "Forward",
    "chat.copy": "Copy",
    "chat.delete": "Delete",
    "chat.pin": "Pin",
    "chat.unpin": "Unpin",
    "wallet.title": "ZIVO Wallet",
    "wallet.topup": "Top up",
    "wallet.withdraw": "Withdraw",
    "wallet.send_money": "Send money",
    "events.going": "Going",
    "events.maybe": "Maybe",
    "events.declined": "Can't",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.next": "Next",
    "common.done": "Done",
  },
  es: {
    "chat.send": "Enviar",
    "chat.message_placeholder": "Mensaje...",
    "chat.search_placeholder": "Buscar mensajes...",
    "chat.reply": "Responder",
    "chat.forward": "Reenviar",
    "chat.copy": "Copiar",
    "chat.delete": "Eliminar",
    "chat.pin": "Anclar",
    "chat.unpin": "Desanclar",
    "wallet.title": "Cartera ZIVO",
    "wallet.topup": "Recargar",
    "wallet.withdraw": "Retirar",
    "wallet.send_money": "Enviar dinero",
    "events.going": "Asistiré",
    "events.maybe": "Tal vez",
    "events.declined": "No puedo",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.next": "Siguiente",
    "common.done": "Listo",
  },
  km: {
    "chat.send": "ផ្ញើ",
    "chat.message_placeholder": "សារ...",
    "chat.search_placeholder": "ស្វែងរកសារ...",
    "chat.reply": "ឆ្លើយតប",
    "chat.forward": "បញ្ជូនបន្ត",
    "chat.copy": "ចម្លង",
    "chat.delete": "លុប",
    "chat.pin": "ខ្ទាស់",
    "chat.unpin": "មិនខ្ទាស់",
    "wallet.title": "កាបូប ZIVO",
    "wallet.topup": "បញ្ចូលទឹកប្រាក់",
    "wallet.withdraw": "ដក​ប្រាក់",
    "wallet.send_money": "ផ្ញើប្រាក់",
    "events.going": "ទៅ",
    "events.maybe": "ប្រហែល",
    "events.declined": "មិនបាន",
    "common.cancel": "បោះបង់",
    "common.save": "រក្សាទុក",
    "common.next": "បន្ទាប់",
    "common.done": "រួចរាល់",
  },
} as const;

export type Lang = keyof typeof DICTIONARIES;
export type Key = keyof typeof DICTIONARIES["en"];

const STORAGE_KEY = "zivo.lang";
let currentLang: Lang = (typeof localStorage !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Lang)) || "en";

export const setLang = (lang: Lang) => {
  currentLang = lang;
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent("zivo:lang-change", { detail: lang }));
};

export const getLang = (): Lang => currentLang;

export const t = (key: Key, fallback?: string): string => {
  const dict = DICTIONARIES[currentLang] || DICTIONARIES.en;
  return (dict as Record<string, string>)[key] || fallback || key;
};

export const SUPPORTED_LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "km", label: "ខ្មែរ",     flag: "🇰🇭" },
];
