/**
 * Brand Theme Utilities
 * Apply brand colors to CSS custom properties at runtime
 */

/**
 * Convert hex color to HSL string format for CSS variables
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return as "H S% L%" format for CSS variables
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Parse color to HSL format
 * Supports: hex (#3B82F6), hsl(221, 83%, 53%), or already "221 83% 53%"
 */
export function parseToHSL(color: string): string {
  const trimmed = color.trim();

  // Already in CSS variable format: "221 83% 53%"
  if (/^\d+\s+\d+%\s+\d+%$/.test(trimmed)) {
    return trimmed;
  }

  // Hex format: #3B82F6 or 3B82F6
  if (/^#?[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return hexToHSL(trimmed);
  }

  // HSL function format: hsl(221, 83%, 53%)
  const hslMatch = trimmed.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
  if (hslMatch) {
    return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
  }

  // Return as-is if unknown format
  return trimmed;
}

/**
 * Apply brand theme colors to CSS custom properties
 */
export function applyBrandTheme(primaryColor: string | null) {
  if (!primaryColor) return;

  const hsl = parseToHSL(primaryColor);
  const root = document.documentElement;

  // Core primary colors
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);

  // Sidebar
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-ring", hsl);

  // Charts
  root.style.setProperty("--chart-1", hsl);

  // Flights (uses primary)
  root.style.setProperty("--flights", hsl);
}

/**
 * Reset brand theme to CSS defaults
 */
export function resetBrandTheme() {
  const root = document.documentElement;
  
  root.style.removeProperty("--primary");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--sidebar-primary");
  root.style.removeProperty("--sidebar-ring");
  root.style.removeProperty("--chart-1");
  root.style.removeProperty("--flights");
}
