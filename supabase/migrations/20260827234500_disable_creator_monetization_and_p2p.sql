-- Stripe compliance shutdown for creator/adult monetization and person-to-person
-- money movement. Historical rows remain readable so customers can review and
-- cancel prior subscriptions, while new monetized activity is denied at the
-- database boundary even if an outdated client calls PostgREST directly.

BEGIN;

-- Preserve read/history access, but stop self-service creator enrollment,
-- paid-tier publishing, paid posts, tips, unlocks, and P2P transfer writes.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_tips FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_analytics FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_earnings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_links FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_milestones FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_payouts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_program_enrollments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.creator_promo_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscription_tiers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.ppv_posts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.ppv_unlocks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.paid_content FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.paid_content_access FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.media_unlocks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.direct_message_unlocks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coin_purchases FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coin_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.coin_transfers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_coin_balances FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.gift_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.p2p_transfers FROM anon, authenticated;

-- The consumer live-stream product is retired with its gifts and paid media.
-- Support live chat and live-location sharing are separate products and stay on.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_streams FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_comments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_likes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_viewers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_pair_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_stream_signals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_gifts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.live_gift_displays FROM anon, authenticated;

-- These SECURITY DEFINER functions previously allowed authenticated clients to
-- move balances or create creator earnings. Keep service-role access for refunds,
-- webhook reconciliation, and support-led wind-down of historical transactions.
REVOKE EXECUTE ON FUNCTION public.send_live_gift(uuid, text, text, integer, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_live_earnings_payout(integer, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unlock_ppv_with_wallet(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unlock_dm_with_wallet(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_transfer_coins(uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_record_gift_transaction(uuid, uuid, text, text, integer, integer, text, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recharge_coins(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_daily_coin_reward()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_p2p_transfer(uuid)
  FROM PUBLIC, anon, authenticated;

-- Chat itself remains available, so table-level UPDATE cannot be removed from
-- message tables. Reject only new or changed paid-message prices and leave old
-- records readable for customer history/support.
CREATE OR REPLACE FUNCTION public.reject_retired_chat_monetization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'direct_messages' THEN
    IF COALESCE(NEW.locked_price_cents, 0) > 0
       AND (TG_OP = 'INSERT' OR NEW.locked_price_cents IS DISTINCT FROM OLD.locked_price_cents) THEN
      RAISE EXCEPTION 'Paid chat media is no longer available';
    END IF;
  ELSIF TG_TABLE_NAME = 'group_messages' THEN
    IF COALESCE(NEW.locked_price_coins, 0) > 0
       AND (TG_OP = 'INSERT' OR NEW.locked_price_coins IS DISTINCT FROM OLD.locked_price_coins) THEN
      RAISE EXCEPTION 'Paid chat media is no longer available';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_retired_chat_monetization()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reject_retired_direct_message_monetization ON public.direct_messages;
CREATE TRIGGER reject_retired_direct_message_monetization
  BEFORE INSERT OR UPDATE OF locked_price_cents ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_retired_chat_monetization();

DROP TRIGGER IF EXISTS reject_retired_group_message_monetization ON public.group_messages;
CREATE TRIGGER reject_retired_group_message_monetization
  BEFORE INSERT OR UPDATE OF locked_price_coins ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_retired_chat_monetization();

-- Existing pending transfers may still be cancelled or declined. Those unwind
-- RPCs do not settle value and remain available to the original participants.

COMMIT;
