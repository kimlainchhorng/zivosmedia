// `crypto.randomUUID` requires a "secure context" (HTTPS or localhost).
// Capacitor's WKWebView loads the dev server over plain http on the LAN, and
// some older Android WebViews lack it entirely, so we install an RFC 4122 v4
// polyfill backed by `crypto.getRandomValues` (always available).
//
// Imported first thing in main.tsx so every downstream module sees a working
// `crypto.randomUUID()` regardless of context.
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  (crypto as Crypto & { randomUUID: () => string }).randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant 10
    const hex: string[] = [];
    for (let i = 0; i < 16; i++) hex.push(buf[i].toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}

export {};
