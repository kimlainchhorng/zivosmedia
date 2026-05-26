// Tiny Web Vitals reporter — runs on first idle, logs p75 metrics so we can
// see real-user LCP/INP/CLS/TTFB/FCP in the console (and forward to any
// analytics sink later). ~2KB gzipped, zero impact on initial render.
//
// To pipe to an endpoint later, replace the console.log inside `report()`
// with a navigator.sendBeacon('/vitals', JSON.stringify(metric)).

type Metric = {
  name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
};

function report(metric: Metric) {
  // Keep noise low — single readable line per metric
  // eslint-disable-next-line no-console
  console.info(
    `[vitals] ${metric.name} ${metric.value.toFixed(1)} (${metric.rating})`,
  );

  // Forward to GA / PostHog if present — non-breaking if absent.
  const w = window as unknown as {
    gtag?: (...a: unknown[]) => void;
    posthog?: { capture?: (e: string, p: unknown) => void };
  };
  try {
    w.gtag?.("event", metric.name, {
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_rating: metric.rating,
      non_interaction: true,
    });
    w.posthog?.capture?.("web_vital", metric);
  } catch {
    /* analytics not loaded yet — safe to drop */
  }
}

export async function startWebVitals() {
  try {
    const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import("web-vitals");
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    /* web-vitals optional — never block the app */
  }
}
