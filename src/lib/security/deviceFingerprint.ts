/**
 * Generate a stable device fingerprint for trusted device tracking.
 * Combines browser characteristics that persist across sessions.
 */
export function getDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    `${screen.width}x${screen.height}`,
    navigator.hardwareConcurrency?.toString() || "unknown",
    navigator.platform || "unknown",
  ];
  return hashComponents(components);
}

/**
 * Get a human-readable device name for display.
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Detect browser
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  // Detect OS
  if (ua.includes("Mac OS")) os = "Mac";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} on ${os}`;
}

/**
 * Simple hash function for fingerprint components.
 * Uses a deterministic string hash (DJB2 variant).
 */
function hashComponents(components: string[]): string {
  const str = components.join("|");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  // Convert to hex and pad
  return "fp_" + (hash >>> 0).toString(16).padStart(8, "0");
}
