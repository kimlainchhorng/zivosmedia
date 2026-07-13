# Chat / Call / Video Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. This is the **most mature** subsystem.

## Inventory

| Capability | Status | Path(s) |
|------------|--------|---------|
| Personal DMs | ✅ Complete | `src/components/chat/PersonalChat.tsx` |
| Group chat | ✅ Complete | `src/components/chat/GroupChat.tsx` |
| Channels | ✅ Complete | `src/pages/ChatHubPage.tsx`, `MyChannelsStrip.tsx` |
| 1:1 voice + video | ✅ Complete | `src/components/chat/CallScreen.tsx`, `src/hooks/useWebRTC.ts`, `call_signals` table |
| Group call (>4) | ✅ Complete | `call/GroupCallScreenV2.tsx`, `useLiveKitCall.ts` (LiveKit SFU) |
| Group mesh (≤4) | ✅ Complete | `useGroupCall.ts` |
| Incoming-call listener | ✅ Complete | `IncomingCallListener.tsx` (90s hydration, 45s auto-miss) |
| Picture-in-picture | ✅ Complete | `CallPiP.tsx` (safe-area aware) |
| Screen share | ✅ Complete | `useScreenShare.ts`, `call/ScreenShareTile.tsx` |
| Delivery/read receipts, media upload | ✅ Complete | `ChatDeliveryStatus.tsx`, `ChatMediaUploader.tsx` |
| Safety: block/report/moderation | ✅ Complete | `lib/social/safetyReport.ts`, `social-safety-report/`, `content_moderation_queue`, `user_blocklist` |
| Push for incoming call | ✅ (web) | `usePushNotifications.ts`, `src/sw.js` |
| Call logs (data) | ✅ Schema | `call_logs` table + RLS |
| Support chat | 🟡 Partial | `support/SupportTicketChatSheet.tsx`, `useSupportChat.ts` |
| **Cross-app unified support thread** | 🔴 Stub | per-vertical tickets (ride/travel/concierge/business) not unified |
| **User-facing call history UI** | 🔴 Stub | `call_logs` exists; no CallHistory page |
| TURN/STUN config | 🟡 Partial | `VITE_WEBRTC_TURN_URLS` env | no fallback/metrics if TURN unavailable |
| Call-quality adaptation | 🟡 Stub | `useCallQuality.ts` (sampling only) |

## Top gaps
- **P1** Shared cross-app support-thread contract (ride/travel/business/driver/admin → one `support_threads` model) — ties to ZivoChat support entry (UX) and payment_support_threads.
- **P1** User-facing call history UI from `call_logs`.
- **P1** Server-side incoming-call push emitter (see NOTIFICATIONS P0) so calls reach backgrounded users.
- **P2** TURN fallback + metrics; call-quality adaptive bitrate; group typing via Realtime; moderation appeals UI.

## Readiness flags
- P0: none in call signaling (stable with fallbacks); but incoming-call **push emitter** is a NOTIFICATIONS P0.
- P1: unified support thread; call history UI; TURN reliability.
- P2: quality adaptation, appeals, recording export.

## Maps to roadmap
PR 13 (shared support thread contract), PR 25 (TURN/WebRTC readiness), PR 10 (ZivoChat support entry across surfaces), PR 15 (incoming-call push emitter).
