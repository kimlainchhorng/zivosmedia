/**
 * Signup details live only in the browser session until the recipient proves
 * ownership of the email address. Do not send these fields to public-signup.
 */
export const PENDING_SIGNUP_STORAGE_KEY = "zivo_pending_signup_v1";

const PENDING_SIGNUP_TTL_MS = 15 * 60 * 1000;

export type PendingSignup = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  signupSource?: string;
  createdAt: number;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isPendingSignup(value: unknown): value is PendingSignup {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.email === "string"
    && typeof record.password === "string"
    && typeof record.fullName === "string"
    && typeof record.createdAt === "number";
}

export function savePendingSignup(details: Omit<PendingSignup, "createdAt">): void {
  const normalized = {
    ...details,
    email: normalizeEmail(details.email),
    createdAt: Date.now(),
  };
  sessionStorage.setItem(PENDING_SIGNUP_STORAGE_KEY, JSON.stringify(normalized));
}

export function loadPendingSignup(email: string): Omit<PendingSignup, "createdAt"> | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isPendingSignup(parsed)
      || parsed.createdAt + PENDING_SIGNUP_TTL_MS < Date.now()
      || normalizeEmail(parsed.email) !== normalizeEmail(email)
    ) {
      clearPendingSignup();
      return null;
    }

    const { createdAt: _createdAt, ...details } = parsed;
    return details;
  } catch {
    clearPendingSignup();
    return null;
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
  } catch {
    // Storage can be disabled. There is no server-side fallback for these
    // pre-verification credentials, so the UI will ask the user to restart.
  }
}
