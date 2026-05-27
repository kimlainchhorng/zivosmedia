import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";

/** Synchronous textarea + execCommand copy. Works inside the click
 *  handler's user-activation window even after we've awaited unrelated
 *  promises elsewhere. Returns true on success. */
function execCommandCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  let ok = false;
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
  }
  return ok;
}

/**
 * Copy text to clipboard with a robust three-tier fallback. We try the
 * synchronous legacy path FIRST because `await navigator.clipboard.writeText`
 * detaches from the click's transient user activation — if the async API
 * rejects (permission, dev origin, etc.) the subsequent legacy attempt
 * then fails too because we've left the click handler's gesture window.
 * Order: legacy execCommand → Capacitor native → modern Async Clipboard.
 */
export async function copyText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Clipboard.write({ string: text });
    return;
  }
  // 1) Synchronous legacy path — best chance of succeeding while the
  //    user's click still has transient activation.
  if (execCommandCopy(text)) return;
  // 2) Modern Async Clipboard API as a last resort.
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("clipboard unavailable");
}

export async function readText(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Clipboard.read();
    return value;
  }
  return navigator.clipboard.readText();
}
