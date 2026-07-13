// Feature flags for the PPV monetization surface.
//
// PPV_FREE_FOR_SUBS_UI_ENABLED: surfaces the "free for subscribers" toggle on
// the create / edit PPV pages, the amber "Subs free" badge on
// CreatorPPVStrip cards, and the subscriber-aware unlock banner + button
// branding on PPVPostDetail.
//
// Disabled by default. To turn it back on, set VITE_ENABLE_PPV_FREE_FOR_SUBS=true.
//
// Why this is gated: migration 20260528000010 reverted unlock_ppv_with_wallet's
// free-for-subs short-circuit because the legitimate proof-of-payment path
// (creator_subscriptions writes) wasn't yet locked down behind a verified
// payment RPC. Until paid subscriptions are guaranteed to require a real
// Stripe payment (the confirm-tier-subscription edge function path is
// adopted everywhere), advertising a "Free for subscribers" benefit fans
// can't actually receive is a UX/server mismatch we'd rather hide.
export const PPV_FREE_FOR_SUBS_UI_ENABLED =
  import.meta.env.VITE_ENABLE_PPV_FREE_FOR_SUBS === "true";
