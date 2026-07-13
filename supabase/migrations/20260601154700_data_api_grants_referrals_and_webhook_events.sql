-- Explicit Data API grants for recent public tables after Supabase's
-- table-exposure change. RLS still controls row visibility and direct writes
-- remain blocked by restrictive policies where applicable.

GRANT SELECT ON TABLE public.user_referral_codes TO authenticated;
GRANT SELECT ON TABLE public.referral_shares TO authenticated;
GRANT SELECT ON TABLE public.referral_conversions TO authenticated;

GRANT SELECT ON TABLE public.eats_paypal_webhook_events TO authenticated;
GRANT SELECT ON TABLE public.eats_square_webhook_events TO authenticated;
GRANT SELECT ON TABLE public.tip_paypal_webhook_events TO authenticated;
GRANT SELECT ON TABLE public.tip_square_webhook_events TO authenticated;
