-- Multi-Tenant RBAC System - Part 2: Remaining Tables and Functions

-- 1. Create tenant_memberships table
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant ON tenant_memberships(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON tenant_memberships(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_role ON tenant_memberships(tenant_id, role);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO permissions (key, description, category) VALUES
  ('tenant.manage_settings', 'Manage tenant settings and branding', 'tenant'),
  ('tenant.manage_users', 'Invite, edit, and remove team members', 'tenant'),
  ('orders.dispatch', 'View and dispatch orders to drivers', 'orders'),
  ('orders.override_status', 'Override order status manually', 'orders'),
  ('orders.view', 'View orders (read-only)', 'orders'),
  ('payouts.manage', 'Process and manage driver payouts', 'finance'),
  ('refunds.manage', 'Process customer refunds', 'finance'),
  ('analytics.view', 'View analytics and reports', 'analytics'),
  ('support.manage', 'Handle support tickets and chat', 'support'),
  ('merchants.manage', 'Onboard and manage merchants', 'merchants'),
  ('drivers.manage', 'Manage drivers and assignments', 'drivers'),
  ('promotions.manage', 'Create and manage promotions', 'marketing'),
  ('zones.manage', 'Configure zones, surge, and pricing', 'operations')
ON CONFLICT (key) DO NOTHING;

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  CONSTRAINT unique_role_permission UNIQUE (tenant_id, role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id, role);

-- 4. Create tenant_invitations table
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_invitations_pending ON tenant_invitations(tenant_id, email) WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token) WHERE accepted_at IS NULL;

-- 5. Add tenant_id to existing tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'food_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'food_orders' AND column_name = 'tenant_id') THEN
      ALTER TABLE food_orders ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'tenant_id') THEN
      ALTER TABLE trips ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drivers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'tenant_id') THEN
      ALTER TABLE drivers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurants') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'tenant_id') THEN
      ALTER TABLE restaurants ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'tenant_id') THEN
      ALTER TABLE support_tickets ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    END IF;
  END IF;
END $$;

-- 6. RPCs
CREATE OR REPLACE FUNCTION public.get_my_tenant_permissions(p_tenant_id UUID)
RETURNS TEXT[] AS $$
DECLARE v_user_role TEXT; v_permissions TEXT[];
BEGIN
  SELECT role INTO v_user_role FROM tenant_memberships WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND is_active = true;
  IF v_user_role IS NULL THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF v_user_role = 'owner' THEN SELECT ARRAY_AGG(key) INTO v_permissions FROM permissions; RETURN v_permissions; END IF;
  SELECT ARRAY_AGG(DISTINCT rp.permission_key) INTO v_permissions FROM role_permissions rp WHERE rp.role = v_user_role AND (rp.tenant_id = p_tenant_id OR rp.tenant_id IS NULL);
  RETURN COALESCE(v_permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.has_tenant_permission(p_tenant_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN TRUE; END IF;
  RETURN p_permission = ANY(public.get_my_tenant_permissions(p_tenant_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.get_my_tenants()
RETURNS TABLE (tenant_id UUID, tenant_name TEXT, tenant_slug TEXT, tenant_logo TEXT, user_role TEXT, is_active BOOLEAN) AS $$
BEGIN
  RETURN QUERY SELECT t.id, t.name, t.slug, t.logo_url, tm.role, tm.is_active FROM tenant_memberships tm JOIN tenants t ON t.id = tm.tenant_id WHERE tm.user_id = auth.uid() AND tm.is_active = true AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_token TEXT)
RETURNS JSONB AS $$
DECLARE v_invitation RECORD; v_membership_id UUID;
BEGIN
  SELECT * INTO v_invitation FROM tenant_invitations WHERE token = p_token AND accepted_at IS NULL AND expires_at > now();
  IF v_invitation IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation'); END IF;
  INSERT INTO tenant_memberships (tenant_id, user_id, role, invited_by, invited_at, accepted_at) VALUES (v_invitation.tenant_id, auth.uid(), v_invitation.role, v_invitation.invited_by, v_invitation.created_at, now()) ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true, accepted_at = now() RETURNING id INTO v_membership_id;
  UPDATE tenant_invitations SET accepted_at = now() WHERE id = v_invitation.id;
  RETURN jsonb_build_object('success', true, 'membership_id', v_membership_id, 'tenant_id', v_invitation.tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 7. Trigger for new tenant
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN INSERT INTO tenant_memberships (tenant_id, user_id, role, is_active, accepted_at) VALUES (NEW.id, NEW.owner_id, 'owner', true, now()) ON CONFLICT DO NOTHING; END IF;
  INSERT INTO role_permissions (tenant_id, role, permission_key) SELECT NEW.id, 'admin', key FROM permissions WHERE key NOT IN ('payouts.manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES (NEW.id, 'dispatcher', 'orders.dispatch'), (NEW.id, 'dispatcher', 'orders.view'), (NEW.id, 'dispatcher', 'orders.override_status'), (NEW.id, 'dispatcher', 'drivers.manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES (NEW.id, 'support', 'support.manage'), (NEW.id, 'support', 'orders.view'), (NEW.id, 'support', 'refunds.manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES (NEW.id, 'finance', 'analytics.view'), (NEW.id, 'finance', 'payouts.manage'), (NEW.id, 'finance', 'refunds.manage') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES (NEW.id, 'merchant_manager', 'merchants.manage'), (NEW.id, 'merchant_manager', 'promotions.manage'), (NEW.id, 'merchant_manager', 'orders.view') ON CONFLICT DO NOTHING;
  INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES (NEW.id, 'viewer', 'analytics.view'), (NEW.id, 'viewer', 'orders.view') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS on_tenant_created ON tenants;
CREATE TRIGGER on_tenant_created AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

-- 8. RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_tenants" ON tenants FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "members_view_tenants" ON tenants FOR SELECT TO authenticated USING (id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "owners_update_tenants" ON tenants FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_tenant_permission(id, 'tenant.manage_settings'));
CREATE POLICY "users_create_tenants" ON tenants FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "admins_manage_memberships" ON tenant_memberships FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "users_view_own_memberships" ON tenant_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "managers_view_members" ON tenant_memberships FOR SELECT TO authenticated USING (public.has_tenant_permission(tenant_id, 'tenant.manage_users'));
CREATE POLICY "managers_insert_members" ON tenant_memberships FOR INSERT TO authenticated WITH CHECK (public.has_tenant_permission(tenant_id, 'tenant.manage_users'));
CREATE POLICY "managers_update_members" ON tenant_memberships FOR UPDATE TO authenticated USING (public.has_tenant_permission(tenant_id, 'tenant.manage_users'));
CREATE POLICY "managers_delete_members" ON tenant_memberships FOR DELETE TO authenticated USING (public.has_tenant_permission(tenant_id, 'tenant.manage_users') AND role != 'owner');

CREATE POLICY "view_permissions" ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_manage_role_perms" ON role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "members_view_role_perms" ON role_permissions FOR SELECT TO authenticated USING (tenant_id IS NULL OR tenant_id IN (SELECT tm.tenant_id FROM tenant_memberships tm WHERE tm.user_id = auth.uid() AND tm.is_active = true));
CREATE POLICY "settings_manage_role_perms" ON role_permissions FOR ALL TO authenticated USING (public.has_tenant_permission(tenant_id, 'tenant.manage_settings'));

CREATE POLICY "admins_manage_invites" ON tenant_invitations FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "managers_manage_invites" ON tenant_invitations FOR ALL TO authenticated USING (public.has_tenant_permission(tenant_id, 'tenant.manage_users'));
CREATE POLICY "users_view_own_invites" ON tenant_invitations FOR SELECT TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND accepted_at IS NULL AND expires_at > now());

-- 9. Seed global defaults
INSERT INTO role_permissions (tenant_id, role, permission_key) VALUES
  (NULL, 'admin', 'tenant.manage_settings'), (NULL, 'admin', 'tenant.manage_users'), (NULL, 'admin', 'orders.dispatch'), (NULL, 'admin', 'orders.override_status'), (NULL, 'admin', 'orders.view'), (NULL, 'admin', 'refunds.manage'), (NULL, 'admin', 'analytics.view'), (NULL, 'admin', 'support.manage'), (NULL, 'admin', 'merchants.manage'), (NULL, 'admin', 'drivers.manage'), (NULL, 'admin', 'promotions.manage'), (NULL, 'admin', 'zones.manage'),
  (NULL, 'dispatcher', 'orders.dispatch'), (NULL, 'dispatcher', 'orders.view'), (NULL, 'dispatcher', 'orders.override_status'), (NULL, 'dispatcher', 'drivers.manage'),
  (NULL, 'support', 'support.manage'), (NULL, 'support', 'orders.view'), (NULL, 'support', 'refunds.manage'),
  (NULL, 'finance', 'analytics.view'), (NULL, 'finance', 'payouts.manage'), (NULL, 'finance', 'refunds.manage'),
  (NULL, 'merchant_manager', 'merchants.manage'), (NULL, 'merchant_manager', 'promotions.manage'), (NULL, 'merchant_manager', 'orders.view'),
  (NULL, 'viewer', 'analytics.view'), (NULL, 'viewer', 'orders.view')
ON CONFLICT DO NOTHING;