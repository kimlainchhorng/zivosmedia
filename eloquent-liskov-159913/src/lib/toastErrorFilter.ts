import { toast } from "sonner";

// WKWebView (Safari) throws `TypeError: Load failed` for any failed fetch —
// network blip, CORS reject, blocked tracker, etc. That string is meaningless
// to users and surfaces as a scary red banner. Translate it to a friendlier
// message and de-dupe rapid repeats.
const NETWORK_NOISE = new Set([
  "Load failed",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
  "The Internet connection appears to be offline.",
  "cancelled",
  "The network connection was lost.",
]);

const FRIENDLY = "Connection issue. Please try again.";

let lastFriendlyAt = 0;
const FRIENDLY_COOLDOWN_MS = 4000;

const isNetworkNoise = (msg: unknown): boolean => {
  if (typeof msg !== "string") return false;
  const trimmed = msg.trim();
  return NETWORK_NOISE.has(trimmed);
};

const original = {
  error: toast.error.bind(toast),
  warning: toast.warning.bind(toast),
};

toast.error = ((message: any, opts?: any) => {
  if (isNetworkNoise(message)) {
    const now = Date.now();
    if (now - lastFriendlyAt < FRIENDLY_COOLDOWN_MS) return "";
    lastFriendlyAt = now;
    return original.error(FRIENDLY, opts);
  }
  return original.error(message, opts);
}) as typeof toast.error;

toast.warning = ((message: any, opts?: any) => {
  if (isNetworkNoise(message)) {
    const now = Date.now();
    if (now - lastFriendlyAt < FRIENDLY_COOLDOWN_MS) return "";
    lastFriendlyAt = now;
    return original.warning(FRIENDLY, opts);
  }
  return original.warning(message, opts);
}) as typeof toast.warning;
