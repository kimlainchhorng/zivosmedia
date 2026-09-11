/** Display defaults only; booking/payment currencies remain service-owned. */
export function edgeCountry(): string | null {
  if (typeof document === "undefined") return null;
  const country = document.querySelector('meta[name="zivo-country"]')?.getAttribute("content");
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}

export function visitorCountry(): string {
  try {
    const stored = localStorage.getItem("zivo_country");
    if (stored === "KH" || stored === "US") return stored;
  } catch { /* Storage can be unavailable. */ }
  const detected = edgeCountry();
  if (detected) return detected;
  const host = typeof location === "undefined" ? "" : location.hostname;
  return ["zivosmedia.com", "www.zivosmedia.com", "localhost", "127.0.0.1"].includes(host) ? "KH" : "US";
}

export function visitorCurrency(): string {
  const currencies: Record<string, string> = {
    KH: "KHR", US: "USD", GB: "GBP", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR",
    CA: "CAD", AU: "AUD", JP: "JPY", KR: "KRW", SG: "SGD", TH: "THB",
  };
  return currencies[visitorCountry()] ?? "USD";
}
