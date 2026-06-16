/**
 * Escape a value for safe interpolation into an HTML string (text content or a
 * quoted attribute). The autorepair print/QR builders assemble standalone HTML
 * documents and hand them to `document.write` / `printOrShareHtml`, so any
 * free-text field (customer name, vehicle, plate, VIN, notes, line-item
 * descriptions) must be escaped — the print window shares the app's origin, so
 * an unescaped `<img onerror>` in stored shop data would run as same-origin XSS.
 *
 * `&` is replaced first so the entities introduced by the later replacements are
 * not double-escaped.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
