/**
 * nativeContacts — Optional bridge to @capacitor-community/contacts.
 *
 * The dependency is intentionally NOT added to package.json to avoid pinning
 * the project to a plugin version. Functions resolve gracefully on web and
 * when the plugin isn't installed: callers get { available: false } and can
 * fall back to the paste-text flow in FindContactsPage.
 *
 * Raw phone numbers NEVER leave the device — we only emit SHA-256 hashes via
 * hashPhoneE164() for the contact-match edge function.
 */
import { hashPhoneE164 } from "@/lib/phoneHash";

type Capacitor = { isNativePlatform: () => boolean; getPlatform: () => string };

// Hide the bare specifier from Rollup's static analysis so the build doesn't
// try to resolve this optional native-only plugin at bundle time.
const CONTACTS_PKG = ["@capacitor-community", "contacts"].join("/");
const dynImport = (s: string) => import(/* @vite-ignore */ /* webpackIgnore: true */ s);

async function getCapacitor(): Promise<Capacitor | null> {
  try {
    const mod: any = await dynImport("@capacitor/core");
    return mod?.Capacitor ?? null;
  } catch {
    return null;
  }
}

async function loadContacts(): Promise<any | null> {
  try {
    const mod: any = await dynImport(CONTACTS_PKG);
    return mod?.Contacts ?? null;
  } catch {
    return null;
  }
}

export async function isNativeAvailable(): Promise<boolean> {
  const cap = await getCapacitor();
  if (!cap?.isNativePlatform()) return false;
  return (await loadContacts()) != null;
}

export async function requestPermission(): Promise<boolean> {
  const Contacts = await loadContacts();
  if (!Contacts?.requestPermissions) return false;
  try {
    const res = await Contacts.requestPermissions();
    return res?.contacts === "granted";
  } catch {
    return false;
  }
}

function normaliseToE164Best(raw: string, fallbackCountryCode = "1"): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    return digits.length >= 8 ? digits : null;
  }
  // Heuristic: 10-digit number => prepend country code (default US)
  if (digits.length === 10) return `+${fallbackCountryCode}${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/**
 * pickAndHashPhones — opens native picker (or pulls all contacts), normalises,
 * hashes, and returns the hash list ready for the contact-match edge function.
 */
export async function pickAndHashPhones(opts?: { defaultCountryCode?: string }): Promise<{
  ok: boolean;
  hashes: string[];
  count: number;
  reason?: "no-plugin" | "denied" | "empty" | "error";
}> {
  try {
    const Contacts = await loadContacts();
    if (!Contacts) return { ok: false, hashes: [], count: 0, reason: "no-plugin" };

    const granted = await requestPermission();
    if (!granted) return { ok: false, hashes: [], count: 0, reason: "denied" };

    const result = await Contacts.getContacts({
      projection: { phones: true, name: false, emails: false },
    });
    const list: any[] = result?.contacts ?? [];
    const phones = new Set<string>();
    for (const c of list) {
      for (const p of c?.phones ?? []) {
        const n = normaliseToE164Best(p?.number ?? "", opts?.defaultCountryCode);
        if (n) phones.add(n);
      }
    }
    if (phones.size === 0) return { ok: false, hashes: [], count: 0, reason: "empty" };

    const hashes = await Promise.all(Array.from(phones).map(hashPhoneE164));
    return { ok: true, hashes, count: phones.size };
  } catch {
    return { ok: false, hashes: [], count: 0, reason: "error" };
  }
}
