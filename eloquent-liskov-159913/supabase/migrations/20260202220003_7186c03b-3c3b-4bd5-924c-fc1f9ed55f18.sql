-- Create damage status enum
CREATE TYPE p2p_damage_status AS ENUM (
  'reported',
  'under_review',
  'info_requested',
  'insurance_claim_submitted',
  'resolved_owner_paid',
  'resolved_renter_charged',
  'closed_no_action'
);

-- Create damage reports table
CREATE TABLE p2p_damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES p2p_bookings(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  reporter_role TEXT NOT NULL CHECK (reporter_role IN ('renter', 'owner')),
  description TEXT NOT NULL,
  date_noticed TIMESTAMPTZ NOT NULL,
  estimated_repair_cost NUMERIC(10,2),
  status p2p_damage_status DEFAULT 'reported',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create damage evidence table
CREATE TABLE p2p_damage_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES p2p_damage_reports(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('damage', 'before', 'after')),
  uploaded_by UUID NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create insurance claims table
CREATE TABLE p2p_insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES p2p_damage_reports(id) ON DELETE CASCADE,
  insurance_provider TEXT NOT NULL,
  claim_reference TEXT,
  coverage_decision TEXT CHECK (coverage_decision IN ('pending', 'approved', 'denied', 'partial')),
  coverage_amount NUMERIC(10,2),
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID
);

-- Create dispute resolutions table
CREATE TABLE p2p_dispute_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_report_id UUID NOT NULL REFERENCES p2p_damage_reports(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('owner_paid', 'renter_charged', 'no_action', 'partial')),
  owner_payout_adjustment NUMERIC(10,2) DEFAULT 0,
  renter_charge_amount NUMERIC(10,2) DEFAULT 0,
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  resolved_by UUID
);

-- Add damage tracking to bookings
ALTER TABLE p2p_bookings 
  ADD COLUMN IF NOT EXISTS damage_report_id UUID REFERENCES p2p_damage_reports(id),
  ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS payout_held_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX idx_damage_reports_booking_id ON p2p_damage_reports(booking_id);
CREATE INDEX idx_damage_reports_status ON p2p_damage_reports(status);
CREATE INDEX idx_damage_reports_reported_by ON p2p_damage_reports(reported_by);
CREATE INDEX idx_damage_evidence_report_id ON p2p_damage_evidence(damage_report_id);

-- Enable RLS
ALTER TABLE p2p_damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_damage_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for p2p_damage_reports
CREATE POLICY "Users can view own damage reports"
  ON p2p_damage_reports FOR SELECT
  USING (
    auth.uid() = reported_by
    OR EXISTS (
      SELECT 1 FROM p2p_bookings b
      WHERE b.id = p2p_damage_reports.booking_id
      AND (b.renter_id = auth.uid() OR b.owner_id IN (
        SELECT id FROM car_owner_profiles WHERE user_id = auth.uid()
      ))
    )
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can create damage reports"
  ON p2p_damage_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reported_by
    AND EXISTS (
      SELECT 1 FROM p2p_bookings b
      WHERE b.id = booking_id
      AND (b.renter_id = auth.uid() OR b.owner_id IN (
        SELECT id FROM car_owner_profiles WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Admin can update damage reports"
  ON p2p_damage_reports FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete damage reports"
  ON p2p_damage_reports FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for p2p_damage_evidence
CREATE POLICY "Users can view damage evidence"
  ON p2p_damage_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM p2p_damage_reports dr
      WHERE dr.id = p2p_damage_evidence.damage_report_id
      AND (
        dr.reported_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM p2p_bookings b
          WHERE b.id = dr.booking_id
          AND (b.renter_id = auth.uid() OR b.owner_id IN (
            SELECT id FROM car_owner_profiles WHERE user_id = auth.uid()
          ))
        )
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Users can upload damage evidence"
  ON p2p_damage_evidence FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM p2p_damage_reports dr
      WHERE dr.id = damage_report_id
      AND dr.reported_by = auth.uid()
    )
  );

CREATE POLICY "Admin can manage damage evidence"
  ON p2p_damage_evidence FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for p2p_insurance_claims (Admin only)
CREATE POLICY "Admin only insurance claims"
  ON p2p_insurance_claims FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for p2p_dispute_resolutions (Admin only)
CREATE POLICY "Admin only dispute resolutions"
  ON p2p_dispute_resolutions FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_damage_reports_updated_at
  BEFORE UPDATE ON p2p_damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();