-- =============================================
-- AUDIT LOG + COMPLIANCE + ADMIN ACTION HISTORY
-- =============================================

-- 1. Create tenant_audit_log table (multi-tenant, immutable)
CREATE TABLE IF NOT EXISTS public.tenant_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  summary TEXT NOT NULL,
  before_values JSONB,
  after_values JSONB,
  metadata JSONB DEFAULT '{}'
);

-- Performance indexes for tenant_audit_log
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_time ON tenant_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_entity ON tenant_audit_log(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_action ON tenant_audit_log(tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_severity ON tenant_audit_log(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_actor ON tenant_audit_log(tenant_id, actor_id);

-- 2. Create admin_alerts table
CREATE TABLE IF NOT EXISTS public.tenant_admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  title TEXT NOT NULL,
  body TEXT,
  audit_log_id UUID REFERENCES tenant_audit_log(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolve_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tenant_admin_alerts_tenant ON tenant_admin_alerts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_admin_alerts_unresolved ON tenant_admin_alerts(tenant_id) WHERE resolved_at IS NULL;

-- 3. Add audit.view and alerts.manage permissions
INSERT INTO permissions (key, description, category) VALUES
  ('audit.view', 'View audit logs and compliance history', 'compliance'),
  ('alerts.manage', 'View and resolve admin alerts', 'compliance')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS on both tables
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin_alerts ENABLE ROW LEVEL SECURITY;

-- 5. RLS for tenant_audit_log (immutable - no UPDATE/DELETE)
CREATE POLICY "Users with audit permission can read logs" ON tenant_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_tenant_permission(tenant_id, 'audit.view')
    OR public.has_tenant_permission(tenant_id, 'tenant.manage_settings')
  );

CREATE POLICY "System can insert audit logs" ON tenant_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. RLS for tenant_admin_alerts
CREATE POLICY "Users with alerts permission can read alerts" ON tenant_admin_alerts
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_tenant_permission(tenant_id, 'alerts.manage')
  );

CREATE POLICY "Users with alerts permission can resolve alerts" ON tenant_admin_alerts
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_tenant_permission(tenant_id, 'alerts.manage')
  );

CREATE POLICY "System can insert alerts" ON tenant_admin_alerts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Create log_audit RPC (main logging function)
CREATE OR REPLACE FUNCTION public.log_tenant_audit(
  p_tenant_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_summary TEXT DEFAULT '',
  p_before_values JSONB DEFAULT NULL,
  p_after_values JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_actor_role TEXT;
  v_user_agent TEXT;
  v_ip_address TEXT;
BEGIN
  -- Get actor's role in tenant
  SELECT role::TEXT INTO v_actor_role
  FROM tenant_memberships
  WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND is_active = true
  LIMIT 1;

  -- Try to get request headers (may fail in some contexts)
  BEGIN
    v_user_agent := current_setting('request.headers', true)::jsonb->>'user-agent';
    v_ip_address := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
    v_ip_address := NULL;
  END;

  -- Insert audit log
  INSERT INTO tenant_audit_log (
    tenant_id, actor_id, actor_role, action, entity_type, entity_id,
    severity, summary, before_values, after_values, metadata,
    user_agent, ip_address
  ) VALUES (
    p_tenant_id, auth.uid(), v_actor_role, p_action, p_entity_type, p_entity_id,
    p_severity, p_summary, p_before_values, p_after_values, p_metadata,
    v_user_agent, v_ip_address
  )
  RETURNING id INTO v_log_id;

  -- Auto-create alert for critical actions
  IF p_severity = 'critical' THEN
    INSERT INTO tenant_admin_alerts (tenant_id, severity, title, body, audit_log_id)
    VALUES (
      p_tenant_id,
      'critical',
      p_action || ' on ' || p_entity_type,
      p_summary,
      v_log_id
    );
  END IF;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 8. admin_assign_driver RPC (with audit logging)
CREATE OR REPLACE FUNCTION public.admin_assign_driver(
  p_tenant_id UUID,
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_driver_name TEXT;
BEGIN
  -- Capture before state
  SELECT jsonb_build_object('driver_id', driver_id, 'status', status)
  INTO v_before FROM food_orders WHERE id = p_order_id;

  -- Get driver name for summary
  SELECT full_name INTO v_driver_name FROM drivers WHERE id = p_driver_id;

  -- Perform update
  UPDATE food_orders
  SET driver_id = p_driver_id, status = 'assigned', updated_at = now()
  WHERE id = p_order_id;

  -- Capture after state
  SELECT jsonb_build_object('driver_id', driver_id, 'status', status)
  INTO v_after FROM food_orders WHERE id = p_order_id;

  -- Log audit
  PERFORM log_tenant_audit(
    p_tenant_id, 'assign_driver', 'order', p_order_id,
    format('Assigned driver %s to order', COALESCE(v_driver_name, p_driver_id::text)),
    v_before, v_after, 'info'
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 9. admin_override_order_status RPC
CREATE OR REPLACE FUNCTION public.admin_override_order_status(
  p_tenant_id UUID,
  p_order_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  SELECT jsonb_build_object('status', status) INTO v_before FROM food_orders WHERE id = p_order_id;

  UPDATE food_orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;

  SELECT jsonb_build_object('status', status) INTO v_after FROM food_orders WHERE id = p_order_id;

  PERFORM log_tenant_audit(
    p_tenant_id, 'override_status', 'order', p_order_id,
    format('Status changed from %s to %s. Reason: %s', v_before->>'status', p_new_status, COALESCE(p_reason, 'N/A')),
    v_before, v_after, 'warning',
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 10. admin_issue_refund RPC (critical action)
CREATE OR REPLACE FUNCTION public.admin_issue_order_refund(
  p_tenant_id UUID,
  p_order_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
BEGIN
  SELECT jsonb_build_object('payment_status', payment_status, 'total', total_amount)
  INTO v_before FROM food_orders WHERE id = p_order_id;

  UPDATE food_orders
  SET payment_status = 'refunded', refund_amount = p_amount, updated_at = now()
  WHERE id = p_order_id;

  SELECT jsonb_build_object('payment_status', payment_status, 'refund_amount', refund_amount)
  INTO v_after FROM food_orders WHERE id = p_order_id;

  PERFORM log_tenant_audit(
    p_tenant_id, 'issue_refund', 'order', p_order_id,
    format('Refund of $%.2f issued. Reason: %s', p_amount, p_reason),
    v_before, v_after, 'critical',
    jsonb_build_object('amount', p_amount, 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'refund_amount', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 11. admin_update_member_role RPC (critical action)
CREATE OR REPLACE FUNCTION public.admin_update_member_role(
  p_tenant_id UUID,
  p_membership_id UUID,
  p_new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_target_user_id UUID;
BEGIN
  SELECT jsonb_build_object('role', role), user_id INTO v_before, v_target_user_id
  FROM tenant_memberships WHERE id = p_membership_id;

  UPDATE tenant_memberships SET role = p_new_role, updated_at = now()
  WHERE id = p_membership_id;

  SELECT jsonb_build_object('role', role) INTO v_after FROM tenant_memberships WHERE id = p_membership_id;

  PERFORM log_tenant_audit(
    p_tenant_id, 'change_member_role', 'role', p_membership_id,
    format('Role changed from %s to %s', v_before->>'role', p_new_role),
    v_before, v_after, 'critical',
    jsonb_build_object('target_user_id', v_target_user_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 12. resolve_admin_alert RPC
CREATE OR REPLACE FUNCTION public.resolve_admin_alert(
  p_alert_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  UPDATE tenant_admin_alerts
  SET resolved_at = now(), resolved_by = auth.uid(), resolve_notes = p_notes
  WHERE id = p_alert_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';