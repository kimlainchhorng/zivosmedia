import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("media rendering performance contracts", () => {
  it("keeps SmartImage optimized, lazy by default, and resilient to broken media", () => {
    const smartImage = source("src/components/shared/SmartImage.tsx");

    for (const needle of [
      "optimizeImage(src, size ?? 600, mode) ?? src",
      "const showFallback = !optimizedSrc || errored;",
      "animate-pulse",
      "fallback ?? (",
      'loading={eager ? "eager" : "lazy"}',
      'decoding="async"',
      'fetchPriority={eager ? "high" : "auto"}',
      "onLoad={() => setLoaded(true)}",
      "onError={() => setErrored(true)}",
      "transition-opacity duration-300",
    ]) {
      expect(smartImage).toContain(needle);
    }
  });

  it("keeps LazyVideo conservative by default and pauses offscreen playback", () => {
    const lazyVideo = source("src/components/shared/LazyVideo.tsx");

    for (const needle of [
      'preload = "metadata"',
      "pauseWhenOffscreen = true",
      "muted = true",
      "playsInline = true",
      "IntersectionObserver",
      'rootMargin: "160px 0px"',
      "threshold: 0.05",
      "el.pause()",
      "observer.disconnect()",
      "preload={preload}",
    ]) {
      expect(lazyVideo).toContain(needle);
    }
  });

  it("keeps the media readiness audit wired into frontend and deploy checks", () => {
    const packageJson = source("package.json");
    const mediaReport = source("scripts/performance/media-readiness-check.mjs");
    const frontendContracts = source("scripts/qa/frontend-visual-contracts.mjs");
    const preflight = source("scripts/deploy/preflight.mjs");
    const preflightSchema = source("scripts/deploy/test-preflight-summary-schema.mjs");
    const serviceWorker = source("src/sw.js");

    expect(packageJson).toContain('"perf:media-report"');
    expect(frontendContracts).toContain('id: "media-loading-performance"');
    expect(frontendContracts).toContain("scripts/performance/media-readiness-check.mjs");
    expect(preflight).toContain('"media-readiness"');
    expect(preflight).toContain("scripts/performance/media-readiness-check.mjs");
    expect(preflightSchema).toContain('"media-readiness"');
    expect(serviceWorker).toContain("immutable-static-assets-v2");
    expect(serviceWorker).toContain("workbox.precaching.precacheAndRoute");
    expect(serviceWorker).not.toContain("supabase-storage-cache");
    expect(serviceWorker).not.toContain("api-cache");

    for (const issue of [
      'img missing loading=\\"lazy\\"/SmartImage',
      'img missing decoding=\\"async\\"/SmartImage',
      "video missing preload policy/LazyVideo",
      "report-only for now",
    ]) {
      expect(mediaReport).toContain(issue);
    }
  });

  it("keeps high-traffic feed and travel media surfaces using explicit load policies", () => {
    const feed = source("src/pages/FeedPage.tsx");
    const hotels = source("src/pages/lodging/HotelsLandingPage.tsx");
    const workflowVisual = source("tests/visual/workflow-visual-readiness.spec.ts");

    expect(feed).toContain('preload={sensitiveMediaLocked ? "none" : isActive ? "auto" : shouldPreload ? "metadata" : "none"}');
    expect(feed).toContain('loading={isActive ? "eager" : "lazy"}');
    expect(feed).toContain('decoding="async"');
    expect(feed).toContain('loading="lazy" decoding="async"');
    expect(hotels).toContain('import { SmartImage } from "@/components/shared/SmartImage";');
    expect(hotels).toContain("<SmartImage");
    expect(workflowVisual).toContain('expect(loginSource).toContain(\'loading="lazy"\');');
    expect(workflowVisual).toContain('expect(loginSource).toContain(\'decoding="async"\');');
  });
});
