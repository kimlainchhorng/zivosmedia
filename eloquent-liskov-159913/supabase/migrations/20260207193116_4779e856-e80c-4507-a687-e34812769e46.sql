-- =====================================================
-- DISPUTES, REFUNDS & PAYOUT HOLD SYSTEM
-- =====================================================

-- 1. Create order_disputes table
CREATE TABLE public.order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  order_id UUID NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_role TEXT NOT NULL DEFAULT 'customer',
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  requested_refund_amount NUMERIC DEFAULT 0,
  approved_refund_amount NUMERIC DEFAULT 0,
  resolution_notes TEXT,
  assigned_admin_id UUID REFERENCES auth.users(id),
  payout_hold BOOLEAN DEFAULT true,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT order_disputes_valid_reason CHECK (reason IN ('not_delivered', 'late', 'wrong_item', 'damaged', 'fraud', 'overcharged', 'quality', 'chargeback', 'other')),
  CONSTRAINT order_disputes_valid_status CHECK (status IN ('open', 'under_review', 'resolved', 'rejected', 'escalated')),
  CONSTRAINT order_disputes_valid_role CHECK (created_role IN ('customer', 'merchant', 'driver', 'admin', 'system')),
  CONSTRAINT order_disputes_valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes for order_disputes
CREATE INDEX idx_order_disputes_order ON order_disputes(order_id);
CREATE INDEX idx_order_disputes_status ON order_disputes(status, created_at DESC);
CREATE INDEX idx_order_disputes_assigned ON order_disputes(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX idx_order_disputes_created_by ON order_disputes(created_by);

-- 2. Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  dispute_id UUID REFERENCES order_disputes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES food_orders(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'queued',
  stripe_refund_id TEXT,
  stripe_error TEXT,
  refund_reason TEXT DEFAULT 'requested_by_customer',
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  CONSTRAINT refund_requests_valid_status CHECK (status IN ('queued', 'processing', 'refunded', 'failed', 'cancelled')),
  CONSTRAINT refund_requests_valid_reason CHECK (refund_reason IN ('duplicate', 'fraudulent', 'requested_by_customer'))
);

-- Indexes for refund_requests
CREATE INDEX idx_refund_requests_dispute ON refund_requests(dispute_id);
CREATE INDEX idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);

-- 3. Create dispute_audit_logs table
CREATE TABLE public.dispute_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address TEXT,
  CONSTRAINT dispute_audit_valid_entity CHECK (entity_type IN ('dispute', 'refund', 'order', 'payout'))
);

-- Indexes for dispute_audit_logs
CREATE INDEX idx_dispute_audit_entity ON dispute_audit_logs(entity_type, entity_id);
CREATE INDEX idx_dispute_audit_created ON dispute_audit_logs(created_at DESC);

-- 4. Add columns to food_orders for dispute tracking
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES order_disputes(id),
  ADD COLUMN IF NOT EXISTS dispute_status TEXT,
  ADD COLUMN IF NOT EXISTS payout_hold BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT;

-- 5. RLS Policies for order_disputes
ALTER TABLE order_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all disputes"
  ON order_disputes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view disputes for their orders"
  ON order_disputes FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR order_id IN (SELECT id FROM food_orders WHERE customer_id = auth.uid())
    OR order_id IN (SELECT fo.id FROM food_orders fo JOIN restaurants r ON fo.restaurant_id = r.id WHERE r.owner_id = auth.uid())
  );

CREATE POLICY "Users can create disputes for their orders"
  ON order_disputes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR order_id IN (SELECT id FROM food_orders WHERE customer_id = auth.uid())
    OR order_id IN (SELECT fo.id FROM food_orders fo JOIN restaurants r ON fo.restaurant_id = r.id WHERE r.owner_id = auth.uid())
  );

-- 6. RLS Policies for refund_requests (admin only)
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage refund requests"
  ON refund_requests FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7. RLS Policies for dispute_audit_logs (admin only)
ALTER TABLE dispute_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view dispute audit logs"
  ON dispute_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert dispute audit logs"
  ON dispute_audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 8. Trigger: When dispute is created, update order flags and notify
CREATE OR REPLACE FUNCTION on_dispute_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Update food_orders with dispute info and payout hold
  UPDATE food_orders SET
    dispute_id = NEW.id,
    dispute_status = NEW.status,
    payout_hold = NEW.payout_hold,
    payout_hold_reason = CASE WHEN NEW.payout_hold THEN 'Dispute: ' || NEW.reason ELSE NULL END,
    updated_at = now()
  WHERE id = NEW.order_id;

  -- Insert audit log
  INSERT INTO dispute_audit_logs (actor_id, action, entity_type, entity_id, new_values)
  VALUES (NEW.created_by, 'dispute_created', 'dispute', NEW.id, 
    jsonb_build_object('reason', NEW.reason, 'status', NEW.status, 'payout_hold', NEW.payout_hold, 'requested_amount', NEW.requested_refund_amount));

  -- Notify admins
  INSERT INTO notifications (user_id, channel, category, template, title, body, action_url, event_type, status)
  SELECT ur.user_id, 'in_app', 'operational', 'dispute', 'New Dispute Opened',
    'Order dispute: ' || NEW.reason, '/dispatch/disputes/' || NEW.id, 'dispute_created', 'sent'
  FROM user_roles ur WHERE ur.role = 'admin' LIMIT 3;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_on_dispute_created
  AFTER INSERT ON order_disputes
  FOR EACH ROW EXECUTE FUNCTION on_dispute_created();

-- 9. Trigger: When dispute status or payout_hold changes
CREATE OR REPLACE FUNCTION on_dispute_updated()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::JSONB;
BEGIN
  -- Track changes for audit
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    
    -- Update order dispute_status
    UPDATE food_orders SET
      dispute_status = NEW.status,
      updated_at = now()
    WHERE id = NEW.order_id;
  END IF;

  IF OLD.payout_hold IS DISTINCT FROM NEW.payout_hold THEN
    v_changes := v_changes || jsonb_build_object('payout_hold', jsonb_build_object('old', OLD.payout_hold, 'new', NEW.payout_hold));
    
    -- Update payout_hold on order
    UPDATE food_orders SET
      payout_hold = NEW.payout_hold,
      payout_hold_reason = CASE WHEN NEW.payout_hold THEN 'Dispute: ' || NEW.reason ELSE NULL END,
      updated_at = now()
    WHERE id = NEW.order_id;
  END IF;

  IF OLD.assigned_admin_id IS DISTINCT FROM NEW.assigned_admin_id THEN
    v_changes := v_changes || jsonb_build_object('assigned_admin_id', jsonb_build_object('old', OLD.assigned_admin_id, 'new', NEW.assigned_admin_id));
  END IF;

  IF OLD.approved_refund_amount IS DISTINCT FROM NEW.approved_refund_amount THEN
    v_changes := v_changes || jsonb_build_object('approved_refund_amount', jsonb_build_object('old', OLD.approved_refund_amount, 'new', NEW.approved_refund_amount));
  END IF;

  -- Set resolved_at when status becomes resolved or rejected
  IF NEW.status IN ('resolved', 'rejected') AND OLD.status NOT IN ('resolved', 'rejected') THEN
    NEW.resolved_at := now();
  END IF;

  -- Log changes if any
  IF v_changes != '{}'::JSONB THEN
    INSERT INTO dispute_audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'dispute_updated', 'dispute', NEW.id, 
      jsonb_build_object('status', OLD.status, 'payout_hold', OLD.payout_hold),
      v_changes);
  END IF;

  -- Update timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_on_dispute_updated
  BEFORE UPDATE ON order_disputes
  FOR EACH ROW EXECUTE FUNCTION on_dispute_updated();

-- 10. Enable realtime for disputes
ALTER PUBLICATION supabase_realtime ADD TABLE order_disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE refund_requests;