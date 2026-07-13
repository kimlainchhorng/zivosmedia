# Performance / Speed Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. `perf:media-report` and `qa:frontend-visual-contracts` pass.

## Inventory

| Capability | Status | Path(s) |
|------------|--------|---------|
| Image lazy loading | ✅ Complete | `src/components/shared/SmartImage.tsx` (loading=lazy, decoding=async, CDN transform) |
| Below-fold intersection | ✅ Complete | `src/components/shared/LazySection.tsx` (200px rootMargin) |
| Bundle chunking | ✅ Complete | `vite.config.ts` manualChunks (react/supabase/query/radix/livekit/stripe/maps/framer/charts/mediapipe/pdf/docx) |
| Route code-splitting | ✅ Complete | `src/App.tsx` `lazy()`/`lazyWithRetry()`; deferred overlays |
| Service worker / caching | ✅ Complete | `src/sw.js` (Workbox 7.4.1; SWR/CacheFirst/NetworkFirst) |
| Error boundaries | ✅ Complete | `src/components/shared/RouteErrorBoundary.tsx` |
| Loading skeletons | ✅ Good | `ui/skeleton.tsx` + ~345 usages; some lazy chunks `fallback={null}` |
| API caching | ✅ Complete | `@tanstack/react-query` |
| DB index hygiene | ✅ Maintained | `20260518204722_drop_duplicate_performance_indexes.sql` |
| Video lazy loading | 🟡 Partial | SW caches media; no explicit `<video>` lazy/range in chat galleries |
| Call-quality adaptation | 🟡 Stub | `useCallQuality.ts` samples RTCStats; no adaptive bitrate/codec/ICE-restart |
| Offline draft persistence | 🟡 Partial | `OutboxFlusher` queues; no IndexedDB draft restore |

## Live-audit corroboration (from prior website audit)
No mobile horizontal overflow across 35 mobile captures; no stuck-loading observed on rendered routes; cookie banner is the main first-screen risk (see UX doc). `/travel/checkout` crash already fixed in HEAD.

## Top gaps
- **P1** Video lazy-loading / range requests for chat + feed media (avoid scroll jank).
- **P2** Call-quality auto-adaptation + TURN fallback metrics.
- **P2** Add skeletons to the `fallback={null}` lazy routes; offline draft restore.

## Readiness flags
- P0: none.
- P1: video lazy-load.
- P2: call-quality adaptation, skeleton coverage, offline drafts.

## Maps to roadmap
PR 17 (media-loading performance fixes), PR 25 (chat/call TURN/WebRTC readiness), PR 29 (mobile cleanup).
