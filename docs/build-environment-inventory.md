# Browser build environment inventory

Generated from literal `import.meta.env` reads in `src` on 2026-09-08. Values are intentionally omitted. Most entries are optional integration settings or feature flags; see `.env.example` for descriptions and `DEPLOY.md` for required deployment settings. Vite built-ins (`MODE`, `DEV`, `PROD`, `BASE_URL`, `SSR`) are not deployment secrets. Dynamic env lookups and backend-only variables are outside this inventory.

| Variable | Example consumer |
| --- | --- |
| `VITE_ADSENSE_SLOT_ARTICLE_INLINE` | `src/config/adSlots.ts` |
| `VITE_ADSENSE_SLOT_HOME_FEED` | `src/config/adSlots.ts` |
| `VITE_ADSENSE_SLOT_SEARCH_RESULTS` | `src/config/adSlots.ts` |
| `VITE_ANDROID_PLAY_STORE_URL` | `src/config/appStoreLinks.ts` |
| `VITE_ANDROID_RESTORE_CREDENTIALS_ENABLED` | `src/lib/nativeRestoreCredentials.ts` |
| `VITE_APP_VERSION` | `src/hooks/useOTAUpdate.ts` |
| `VITE_CHAT_ORIGINS` | `src/pages/ConnectChat.tsx` |
| `VITE_EATS_ORDERING_ENABLED` | `src/lib/eatsPaymentCapabilities.ts` |
| `VITE_EATS_PAYPAL_ENABLED` | `src/lib/eatsPaymentCapabilities.ts` |
| `VITE_EATS_SQUARE_ENABLED` | `src/lib/eatsPaymentCapabilities.ts` |
| `VITE_ENABLE_POST_REACTIONS` | `src/components/profile/ProfileFeedCard.tsx` |
| `VITE_ENABLE_PPV_FREE_FOR_SUBS` | `src/lib/ppv/featureFlags.ts` |
| `VITE_GOOGLE_ADSENSE_CLIENT` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_GOOGLE_ADS_ID` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_GOOGLE_ADS_OAUTH_READY` | `src/components/admin/StoreAdsManager.tsx` |
| `VITE_GOOGLE_ANALYTICS_ID` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_GOOGLE_MAPS_API_KEY` | `src/components/admin/StoreMapPicker.tsx` |
| `VITE_IMAGE_PROXY_URL` | `src/services/imageProxyService.ts` |
| `VITE_IOS_APP_STORE_URL` | `src/config/appStoreLinks.ts` |
| `VITE_KHQR_STATIC_MERCHANT_QR` | `src/lib/khqr.ts` |
| `VITE_MAPBOX_ACCESS_TOKEN` | `src/contexts/CustomerCityContext.tsx` |
| `VITE_META_APP_ID` | `src/components/SEOHead.tsx` |
| `VITE_META_LOGIN_CONFIG_ID` | `src/components/admin/StoreAdsManager.tsx` |
| `VITE_META_PIXEL_ID` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_PUBLIC_ORIGIN` | `src/config/animatedStickerMap.ts` |
| `VITE_SENTRY_DSN` | `src/lib/security/sentryReporting.ts` |
| `VITE_SHOW_REQUEST_HEALTH` | `src/App.tsx` |
| `VITE_STICKER_ASSET_ORIGIN` | `src/config/animatedStickerMap.ts` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/lib/stripe.ts` |
| `VITE_SUPABASE_PROJECT_ID` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/components/profile/ProfileContentTabs.tsx` |
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` |
| `VITE_TIKTOK_PIXEL_ID` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_VAPID_PUBLIC_KEY` | `src/hooks/usePushNotifications.ts` |
| `VITE_WEBRTC_TURN_CREDENTIAL` | `src/hooks/useWebRTC.ts` |
| `VITE_WEBRTC_TURN_URLS` | `src/hooks/useWebRTC.ts` |
| `VITE_WEBRTC_TURN_USERNAME` | `src/hooks/useWebRTC.ts` |
| `VITE_X_PIXEL_ID` | `src/config/marketingRuntimeConfig.ts` |
| `VITE_ZIVO_BUSINESS_CATALOG_URL` | `src/lib/zivoBusinessRestaurantCatalog.ts` |
| `VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY` | `src/config/zivoDriverDomain.ts` |
| `VITE_ZIVO_DRIVER_SUPABASE_URL` | `src/config/zivoDriverDomain.ts` |
| `VITE_ZIVO_RIDE_APP_URL` | `src/pages/app/CanonicalRidePage.tsx` |
| `VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY` | `src/config/autoRepairDomain.ts` |
| `VITE_ZIVO_SOFTWARE_SUPABASE_URL` | `src/config/autoRepairDomain.ts` |
| `VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY` | `src/config/zivoTravelDomain.ts` |
| `VITE_ZIVO_TRAVEL_SUPABASE_URL` | `src/config/zivoTravelDomain.ts` |
| `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND` | `src/config/zivoTravelDomain.ts` |
| `VITE_ZIVO_WORKER_API_ORIGIN` | `src/lib/zivoAiChat.ts` |

- `VITE_SENTRY_DSN`: optional browser Sentry DSN; production error reporting only. The SDK loads on the first error, strips user/request/error text, and sends no replay or performance traces. Leave empty until the monitoring project is configured. Never use a Sentry auth token here.

Post-deploy addition: `VITE_IDENTITY_DIAGNOSTICS_ENABLED` is optional, defaults false, and enables in-page issuer-match diagnostics only. It never authorizes or links accounts and emits no user identifiers/token values.
